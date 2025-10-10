# === main.py (drop-in) ========================================================
# Fast, non-blocking, thread-managed, and upload-friendly version

# ---- Set numeric threading BEFORE importing numpy/torch/librosa --------------
import os as _os
_os.environ.setdefault("OMP_NUM_THREADS", "1")
_os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
_os.environ.setdefault("MKL_NUM_THREADS", "1")
_os.environ.setdefault("NUMEXPR_NUM_THREADS", "1")

# -----------------------------------------------------------------------------
import os
import io
import time
import base64
import logging
import tempfile
import mimetypes
import asyncio
from typing import Optional, List, Dict

import joblib
import aiohttp
from fastapi import FastAPI, HTTPException, Request, Form, UploadFile, File
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from pydantic import BaseModel

# -------- Optional deps (torch/transformers/PIL) ----------
try:
    import torch
    TORCH_AVAILABLE = True
except Exception:
    torch = None  # type: ignore
    TORCH_AVAILABLE = False

try:
    from transformers import AutoModelForSequenceClassification, AutoTokenizer
    TRANSFORMERS_AVAILABLE = True
except Exception:
    TRANSFORMERS_AVAILABLE = False

try:
    from PIL import Image  # noqa
    PIL = True
except Exception:
    PIL = False
    Image = None

# -------- Local imports ----------
from utils.preprocess import preprocess_document, preprocess_image
from utils.image_preprocess import preprocess_image_for_model
from utils.postprocess import postprocess_verification_result
from utils.aws_utils import download_file as s3_download_file
from apps.docs_svc.document import (
    process_document_verification, VerifyRequest, PageData, DocMeta,
    ExternalReferences, ParsingHints
)
from core.inference import load_model
from docs.document_verifier import DocumentVerifier

# =====================================================
# Config & Logging
# =====================================================
BASE_DIR = os.path.dirname(__file__)

# Text models
TEXT_MODEL_DIR = os.path.join(BASE_DIR, "models", "text", "model")
CHECKPOINT_780 = os.path.join(TEXT_MODEL_DIR, "checkpoint-780")
TRANSFORMER_MODEL_DIR = CHECKPOINT_780
BASELINE_LR_PATH = os.path.join(TEXT_MODEL_DIR, "baseline_lr.joblib")
TFIDF_VECTORIZER_PATH = os.path.join(TEXT_MODEL_DIR, "tfidf_vectorizer.joblib")

# Image model (optional)
IMAGE_MODEL_DIR = os.path.join(BASE_DIR, "models", "image")
IMAGE_MODEL_PATH = os.path.join(IMAGE_MODEL_DIR, os.getenv("IMAGE_MODEL_FILE", "resnet50_custom.pth"))

# Logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(level=getattr(logging, LOG_LEVEL, logging.INFO))
logger = logging.getLogger(__name__)

# Limits
UPLOAD_MAX_MB = int(os.getenv("UPLOAD_MAX_MB", "200"))
MAX_BYTES = UPLOAD_MAX_MB * 1024 * 1024
UPLOAD_CHUNK = 1024 * 1024  # 1MB

# HTTP download client settings
HTTP_TIMEOUT = aiohttp.ClientTimeout(total=60, connect=10, sock_read=50)
HTTP_CONN_LIMIT = int(os.getenv("HTTP_CONN_LIMIT", "20"))

# Deepfake concurrency (limit heavy jobs)
DF_MAX_CONCURRENCY = int(os.getenv("DF_MAX_CONCURRENCY", "2"))
DF_SEM = asyncio.Semaphore(DF_MAX_CONCURRENCY)

# =====================================================
# FastAPI app
# =====================================================
app = FastAPI(
    title="ML Inference API",
    description="API for ML model inference on images, spam detection, document verification, and deepfake detection",
    version="1.2.0",
    default_response_class=JSONResponse,
)

# Middlewares
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1024)  # compress payloads

# =====================================================
# Utils
# =====================================================
def _to_b64(b: bytes) -> str:
    return base64.b64encode(b).decode("utf-8")

def _is_pdf(file_bytes: bytes, content_type: Optional[str] = None, filename: Optional[str] = None) -> bool:
    if content_type and "pdf" in content_type.lower():
        return True
    if filename and filename.lower().endswith(".pdf"):
        return True
    return file_bytes.startswith(b"%PDF-") if len(file_bytes) >= 4 else False

def _is_image(file_bytes: bytes, content_type: Optional[str] = None, filename: Optional[str] = None) -> bool:
    if content_type and content_type.lower().startswith("image/"):
        return True
    magic_numbers = {
        b"\xFF\xD8\xFF": "jpg",
        b"\x89PNG\r\n\x1a\n": "png",
        b"GIF87a": "gif",
        b"GIF89a": "gif",
        b"RIFF": "webp",
        b"BM": "bmp",
    }
    for magic in magic_numbers:
        if file_bytes.startswith(magic):
            return True
    if filename and any(filename.lower().endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff", ".bmp", ".gif"]):
        return True
    return False

# ---- Single aiohttp session (reused) -----------------------------------------
SESSION: Optional[aiohttp.ClientSession] = None

@app.on_event("startup")
async def _http_start():
    global SESSION
    conn = aiohttp.TCPConnector(limit=HTTP_CONN_LIMIT, ssl=False)
    SESSION = aiohttp.ClientSession(timeout=HTTP_TIMEOUT, connector=conn)

@app.on_event("shutdown")
async def _http_stop():
    global SESSION
    if SESSION:
        await SESSION.close()
        SESSION = None

async def http_download_file(url: str) -> bytes:
    if not (url.startswith("http://") or url.startswith("https://")):
        raise HTTPException(status_code=400, detail="file_url must be http(s)")
    if not SESSION:
        raise HTTPException(status_code=503, detail="HTTP client not ready")
    try:
        async with SESSION.get(url) as resp:
            if resp.status != 200:
                raise HTTPException(status_code=400, detail=f"Failed to download file: HTTP {resp.status}")
            data = await resp.read()
            if len(data) > MAX_BYTES:
                raise HTTPException(status_code=400, detail=f"File too large (>{UPLOAD_MAX_MB} MB limit)")
            return data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"http_download_file error: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to download file: {str(e)}")

def _build_verify_request_from_upload(file_bytes: bytes, filename: Optional[str], content_type: Optional[str], doc_meta: dict, parsing_hints: dict):
    input_type = "pdf" if _is_pdf(file_bytes, content_type, filename) else "images"
    pages = [PageData(pdf_bytes=_to_b64(file_bytes))] if input_type == "pdf" else [PageData(image_bytes=_to_b64(file_bytes))]
    return VerifyRequest(
        INPUT_TYPE=input_type,
        PAGES=pages,
        DOC_META=DocMeta(**doc_meta),
        EXTERNAL_REFERENCES=ExternalReferences(),
        PARSING_HINTS=ParsingHints(**parsing_hints)
    )

# =====================================================
# Models & startup warmup
# =====================================================
class ProcessRequest(BaseModel):
    image_url: str

class SpamRequest(BaseModel):
    text: str
    reference_id: Optional[str] = None

class SpamResponse(BaseModel):
    reference_id: Optional[str] = None
    is_spam: bool
    probability: Optional[float] = None
    latency_ms: Optional[float] = None
    model: Optional[str] = None

spam_model = None
tokenizer = None
_device = "cpu"

# Document verifier
try:
    verifier = DocumentVerifier()
    logger.info("Document verifier loaded successfully.")
except Exception as e:
    logger.error(f"Failed to load document verifier: {e}")
    verifier = None

@app.on_event("startup")
async def startup_warmup_models():
    global spam_model, tokenizer, _device
    _device = "cuda" if TORCH_AVAILABLE and torch.cuda.is_available() else "cpu"
    if TORCH_AVAILABLE:
        try:
            torch.set_num_threads(max(1, os.cpu_count() // 2))
            torch.set_num_interop_threads(1)
        except Exception:
            pass

    if TRANSFORMERS_AVAILABLE:
        try:
            spam_model = AutoModelForSequenceClassification.from_pretrained(TRANSFORMER_MODEL_DIR)
            try:
                tokenizer = AutoTokenizer.from_pretrained(TRANSFORMER_MODEL_DIR)
            except Exception as e:
                logger.warning(f"Tokenizer missing in checkpoint, falling back: {e}")
                tokenizer = AutoTokenizer.from_pretrained("distilroberta-base")
            spam_model.to(_device).eval()
            # NOTE: omit torch.compile() for faster warmup on CPU/Windows
            # Warmup forward
            if TORCH_AVAILABLE:
                with torch.inference_mode():
                    dummy = tokenizer("warmup", return_tensors="pt", truncation=True, padding=True, max_length=256)
                    for k in dummy:
                        dummy[k] = dummy[k].to(_device)
                    _ = spam_model(**dummy)
            logger.info(f"Spam model ready on {_device}")
        except Exception as e:
            logger.error(f"Failed to init spam model: {e}")
            spam_model, tokenizer = None, None
    else:
        logger.error("Transformers not available")


# =====================================================
# Health & readiness
# =====================================================
@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.get("/ready")
async def readiness():
    try:
        load_model()  # image model warm-check
        status = {
            "image_model": "loaded",
            "spam_model": "loaded" if (spam_model and tokenizer) else "not_loaded",
            "document_verifier": "loaded" if verifier is not None else "not_loaded",
            "deepfake_detection": "loaded" if deepfake_available else "not_loaded"
        }
        all_loaded = all(v == "loaded" for v in status.values())
        return {"status": "ready" if all_loaded else "partial", "models": status}
    except Exception as e:
        return {"status": "partial", "error": str(e)}

# =====================================================
# Document processing
# =====================================================
@app.post("/process_document")
async def process_document_endpoint(
    file_url: Optional[str] = Form(None),
    doc_title: Optional[str] = Form("Untitled Document"),
    doc_issuer: Optional[str] = Form(None),
    compact: bool = Form(True),
):
    if not file_url:
        raise HTTPException(status_code=400, detail="file_url must be provided")
    t0 = time.time()
    file_bytes = await http_download_file(file_url)
    filename = os.path.basename(file_url)

    is_pdf = _is_pdf(file_bytes, filename=filename)
    is_image = _is_image(file_bytes, filename=filename)
    if not is_pdf and not is_image:
        raise HTTPException(status_code=400, detail="Unsupported file type. Only PDF and image files are supported.")

    if is_pdf:
        preprocessed_data = preprocess_document(
            file_bytes=file_bytes, filename=filename, doc_title=doc_title or "Untitled Document", doc_issuer=doc_issuer
        )
    else:
        preprocessed_data = preprocess_image(
            image_bytes=file_bytes, filename=filename, doc_title=doc_title or "Untitled Document", doc_issuer=doc_issuer
        )

    verify_request = VerifyRequest(
        INPUT_TYPE=preprocessed_data.get("INPUT_TYPE", "pdf"),
        PAGES=preprocessed_data.get("PAGES", []),
        DOC_META=preprocessed_data.get("DOC_META", {}),
        EXTERNAL_REFERENCES=preprocessed_data.get("EXTERNAL_REFERENCES", {}),
        PARSING_HINTS=preprocessed_data.get("PARSING_HINTS", {})
    )

    try:
        verification_result = await process_document_verification(verify_request, compact=compact)
    except Exception as e:
        logger.error(f"Document verification failed: {e}", exc_info=True)
        raise HTTPException(status_code=503, detail=f"Document verification service unavailable: {str(e)}")

    final_result = postprocess_verification_result(
        verification_result=verification_result,
        original_filename=filename,
        file_type="pdf" if is_pdf else "image",
        preprocessing_metadata=preprocessed_data.get("meta", {})
    )
    final_result["latency_ms"] = round((time.time() - t0) * 1000, 1)
    return final_result

@app.post("/process_batch")
async def process_batch_endpoint(
    files: List[UploadFile] = File(...),
    compact: bool = Form(True),
):
    results = []
    for file in files:
        try:
            file_bytes = await file.read()
            if len(file_bytes) > MAX_BYTES:
                raise HTTPException(status_code=400, detail=f"{file.filename} too large (>{UPLOAD_MAX_MB} MB limit)")
            verify_request = _build_verify_request_from_upload(
                file_bytes=file_bytes,
                filename=file.filename,
                content_type=file.content_type,
                doc_meta={"title": file.filename},
                parsing_hints={}
            )
            resp = await process_document_verification(verify_request, compact=compact)
            payload = resp.model_dump() if hasattr(resp, "model_dump") else resp.dict() if hasattr(resp, "dict") else resp
            results.append({"filename": file.filename, "success": True, "result": payload})
        except Exception as e:
            results.append({"filename": file.filename, "success": False, "error": str(e)})
    return {
        "processed_count": len(files),
        "successful_count": sum(1 for r in results if r["success"]),
        "results": results
    }

# =====================================================
# Spam Detection (speed-optimized)
# =====================================================
class _NullCtx:
    def __enter__(self): return None
    def __exit__(self, *args): return False

@app.post("/detect_spam", response_model=SpamResponse)
async def detect_spam(request: SpamRequest):
    global spam_model, tokenizer
    if not (spam_model and tokenizer):
        raise HTTPException(status_code=503, detail="Spam model not loaded")

    t0 = time.time()
    try:
        # Explicitly annotate the tokenizer output so static checkers know the shape/type of `enc`.
        # We use a string annotation for torch.Tensor to avoid runtime import issues if torch is not available.
        enc: Dict[str, "torch.Tensor"] = tokenizer(
            request.text,
            return_tensors="pt",
            truncation=True,
            padding=True,
            max_length=256
        )
        if TORCH_AVAILABLE:
            # Iterate over a concrete list of keys to avoid runtime mutation surprises
            for k in list(enc.keys()):
                enc[k] = enc[k].to(_device)

        with (torch.inference_mode() if TORCH_AVAILABLE else _NullCtx()):
            amp_ctx = torch.cuda.amp.autocast() if (TORCH_AVAILABLE and _device == "cuda") else _NullCtx()
            with amp_ctx:
                out = spam_model(**enc)
                probs = out.logits.softmax(dim=-1) if TORCH_AVAILABLE else out.logits.softmax(-1)
                pred = int(probs.argmax(dim=-1).item())
                probability = float(probs[0][1].item())

        latency_ms = (time.time() - t0) * 1000
        return {
            "reference_id": request.reference_id,
            "is_spam": bool(pred),
            "probability": probability,
            "latency_ms": round(latency_ms, 1),
            "model": os.path.basename(TRANSFORMER_MODEL_DIR)
        }
    except Exception as e:
        logger.error(f"Spam detection error | ref={request.reference_id} | {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Spam detection failed")

# =====================================================
# S3 passthrough download
# =====================================================
class DownloadS3Request(BaseModel):
    key_or_url: str

@app.post("/download_s3")
async def download_s3(request: DownloadS3Request):
    file_bytes = s3_download_file(request.key_or_url)
    if not file_bytes:
        raise HTTPException(status_code=404, detail="File not found or could not be downloaded")

    filename = os.path.basename(request.key_or_url)
    ext = filename.lower()
    if ext.endswith(".pdf"):
        media_type = "application/pdf"
    elif ext.endswith((".jpg", ".jpeg")):
        media_type = "image/jpeg"
    elif ext.endswith(".png"):
        media_type = "image/png"
    elif ext.endswith((".mp3", ".wav")):
        media_type = "audio/mpeg"
    elif ext.endswith((".mp4", ".mov", ".avi")):
        media_type = "video/mp4"
    else:
        media_type = "application/octet-stream"

    return StreamingResponse(io.BytesIO(file_bytes), media_type=media_type, headers={"Content-Disposition": f'attachment; filename="{filename}"'})

# =====================================================
# Deepfake Detection  (offloaded to threadpool)
# =====================================================
try:
    from apps.df_svc.audio import deepfake_audio_detector
    from apps.df_svc.video import deepfake_video_detector
    deepfake_available = True
    logger.info("Deepfake detection modules loaded successfully.")
except Exception as e:
    logger.warning(f"Failed to import deepfake detection modules: {e}")
    deepfake_available = False

class DeepfakeResponse(BaseModel):
    fake_score: float
    is_fake: bool
    model: str

from fastapi import APIRouter, UploadFile, File
router = APIRouter()

ALLOWED_AUDIO_EXTS = {".wav", ".mp3", ".flac", ".aac", ".ogg", ".m4a"}
ALLOWED_VIDEO_EXTS = {".mp4", ".avi", ".mov", ".mkv", ".webm", ".flv"}

def _safe_ext_from_name(name: str, allowed: set[str], default_ext: str) -> str:
    _, ext = os.path.splitext(name or "")
    ext = ext.lower()
    return ext if ext in allowed else default_ext

import anyio

@router.post("/detect_deepfake_audio", response_model=DeepfakeResponse)
async def detect_deepfake_audio(
    file: UploadFile = File(...)
) -> DeepfakeResponse:
    if not deepfake_available:
        raise HTTPException(status_code=503, detail="Deepfake detection not available")

    if not file.filename:
        raise HTTPException(status_code=400, detail="File must have a filename")

    file_bytes = await file.read()
    if len(file_bytes) > MAX_BYTES:
        raise HTTPException(status_code=400, detail=f"File too large (>{UPLOAD_MAX_MB} MB limit)")

    tmp_path = None
    t0 = time.time()
    try:
        ext = _safe_ext_from_name(file.filename, ALLOWED_AUDIO_EXTS, ".wav")
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name

        # Offload heavy detector to a worker thread and gate with semaphore
        async with DF_SEM:
            start = time.time()
            is_fake, fake_score = await anyio.to_thread.run_sync(
                deepfake_audio_detector, tmp_path
            )
            elapsed = time.time() - start

        # Note: deepfake_audio_detector returns (is_fake, confidence), but confidence might be inverted
        # Assuming fake_score is the probability of fake
        return DeepfakeResponse(
            fake_score=float(fake_score),
            is_fake=bool(is_fake),
            model="pyannote/fake_speech_detection"
        )
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try: os.unlink(tmp_path)
            except Exception: logger.warning("Failed to delete temp file: %s", tmp_path)

@router.post("/detect_deepfake_video", response_model=DeepfakeResponse)
async def detect_deepfake_video(
    file: UploadFile = File(...)
) -> DeepfakeResponse:
    if not deepfake_available:
        raise HTTPException(status_code=503, detail="Deepfake detection not available")

    if not file.filename:
        raise HTTPException(status_code=400, detail="File must have a filename")

    file_bytes = await file.read()
    if len(file_bytes) > MAX_BYTES:
        raise HTTPException(status_code=400, detail=f"File too large (>{UPLOAD_MAX_MB} MB limit)")

    tmp_path = None
    t0 = time.time()
    try:
        _, ext = os.path.splitext(file.filename)
        ext = ext.lower() if ext.lower() in ALLOWED_VIDEO_EXTS else ".mp4"
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name

        async with DF_SEM:
            start = time.time()
            is_fake, fake_score = await anyio.to_thread.run_sync(
                deepfake_video_detector, tmp_path
            )
            processing_time = time.time() - start

        return DeepfakeResponse(
            fake_score=float(fake_score),
            is_fake=bool(is_fake),
            model="mediapipe/face_detection"
        )
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try: os.unlink(tmp_path)
            except Exception: logger.warning("Failed to delete temp file: %s", tmp_path)

# Mount the router with a prefix to avoid path collisions
app.include_router(router, prefix="/df", tags=["deepfake"])

# =====================================================
# Entrypoint
# =====================================================
if __name__ == "__main__":
    import uvicorn
    # Recommended for dev throughput: >=2 workers
    uvicorn.run(app, host="0.0.0.0", port=8000, workers=max(2, os.cpu_count() // 2))
