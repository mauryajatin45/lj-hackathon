import logging
import os
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
from utils.downloader import download_image
from utils.preprocess import preprocess_image
from core.inference import run_inference, load_model
from utils.postprocess import postprocess_predictions
from utils.exceptions import MLInferenceError, ImageDownloadError, PreprocessingError, InferenceError, PostprocessingError

# Configuration via environment variables
MODEL_PATH = os.getenv("MODEL_PATH", "dummy_model.pth")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

# Set up logging
logging.basicConfig(level=getattr(logging, LOG_LEVEL.upper(), logging.INFO))
logger = logging.getLogger(__name__)

app = FastAPI(title="ML Inference API", description="API for ML model inference on images", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ProcessRequest(BaseModel):
    image_url: str

@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Request: {request.method} {request.url}")
    response = await call_next(request)
    logger.info(f"Response: {response.status_code}")
    return response

@app.get("/health")
async def health():
    # Basic health check
    return {"status": "healthy"}

@app.get("/ready")
async def readiness():
    # Readiness check: verify model is loaded
    try:
        load_model()
        return {"status": "ready"}
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        raise HTTPException(status_code=503, detail="Service not ready")

@app.post("/process")
async def process_image(request: ProcessRequest):
    try:
        logger.info(f"Processing image from URL: {request.image_url}")

        # Download image
        image_bytes = await download_image(request.image_url)

        # Preprocess image
        preprocessed_image = preprocess_image(image_bytes)

        # Run inference
        raw_predictions = run_inference(preprocessed_image)

        # Postprocess predictions
        response = postprocess_predictions(raw_predictions)

        logger.info("Image processing completed successfully")
        return response
    except ImageDownloadError as e:
        logger.error(f"Image download error: {e}")
        raise HTTPException(status_code=400, detail="Failed to download image")
    except PreprocessingError as e:
        logger.error(f"Preprocessing error: {e}")
        raise HTTPException(status_code=400, detail="Failed to preprocess image")
    except InferenceError as e:
        logger.error(f"Inference error: {e}")
        raise HTTPException(status_code=500, detail="Inference failed")
    except PostprocessingError as e:
        logger.error(f"Postprocessing error: {e}")
        raise HTTPException(status_code=500, detail="Postprocessing failed")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
