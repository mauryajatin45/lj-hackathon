# audio_detect.py
from __future__ import annotations
import os
import math
import logging
import threading
from typing import Tuple, Optional

import numpy as np

# Lazily import heavy libs inside functions to keep startup fast
try:
    import torch
    TORCH_OK = True
except Exception:
    torch = None  # type: ignore
    TORCH_OK = False

import os

_AASIST_CKPT = os.getenv("AASIST_CKPT", "")  # optional TorchScript path
_AASIST_MODEL = None
_AASIST_LOCK = threading.Lock()

def _pick_device() -> str:
    if TORCH_OK and torch.cuda.is_available():
        return "cuda"
    if TORCH_OK and hasattr(torch.backends, "mps") and torch.backends.mps.is_available():  # Apple
        return "mps"
    return "cpu"

_DEVICE = _pick_device()

def _load_aasist():
    """Load TorchScript AASIST once, thread-safe. Expects 16k mono (1, T) -> logit."""
    global _AASIST_MODEL
    if not TORCH_OK or not _AASIST_CKPT:
        return None
    if _AASIST_MODEL is not None:
        return _AASIST_MODEL
    with _AASIST_LOCK:
        if _AASIST_MODEL is not None:
            return _AASIST_MODEL
        try:
            _AASIST_MODEL = torch.jit.load(_AASIST_CKPT, map_location=_DEVICE).eval()
            # Optional: compile for PyTorch 2.x
            if hasattr(torch, "compile"):
                try:
                    _AASIST_MODEL = torch.compile(_AASIST_MODEL)  # type: ignore
                except Exception:
                    pass
        except Exception as e:
            logging.getLogger(__name__).warning(f"Failed to load AASIST TorchScript: {e}")
            _AASIST_MODEL = None
    return _AASIST_MODEL

def _read_audio_16k(path: str, target_sr: int = 16000, max_seconds: int = 60) -> Tuple[np.ndarray, int]:
    """
    Robust loader: tries torchaudio, falls back to librosa; converts to mono 16k;
    returns at most `max_seconds` seconds (center chunk if long).
    """
    logger = logging.getLogger(__name__)
    y: Optional[np.ndarray] = None
    sr: Optional[int] = None

    # Try torchaudio first
    if TORCH_OK:
        try:
            import torchaudio  # heavy, import lazily
            wav, sr_t = torchaudio.load(path)  # shape [C, T]
            if wav.ndim == 2 and wav.shape[0] > 1:
                wav = torch.mean(wav, dim=0, keepdim=True)
            else:
                wav = wav.reshape(1, -1)
            if sr_t != target_sr:
                wav = torchaudio.functional.resample(wav, sr_t, target_sr, rolloff=0.99, lowpass_filter_width=32)
            wav = wav.squeeze(0).detach().cpu().float()
            y = wav.numpy()
            sr = target_sr
        except Exception as e:
            logger.info(f"torchaudio load failed ({e}); falling back to librosa")

    # Fallback librosa
    if y is None:
        try:
            import librosa  # heavy, import lazily
            y, sr = librosa.load(path, sr=target_sr, mono=True, res_type="kaiser_fast")
        except Exception as e:
            raise RuntimeError(f"Could not decode audio: {e}")

    if not isinstance(y, np.ndarray) or y.size == 0:
        raise RuntimeError("Empty audio after load")

    # Sanitize
    y = np.nan_to_num(y, nan=0.0, posinf=0.0, neginf=0.0)
    y = np.clip(y, -1.0, 1.0)

    # Trim/pad and cap duration for speed
    max_len = target_sr * max_seconds
    if y.shape[0] > max_len:
        # Take center chunk (often speech is central)
        start = (y.shape[0] - max_len) // 2
        y = y[start:start + max_len]
    return y.astype(np.float32), target_sr

def _infer_aasist(path: str) -> Optional[float]:
    """
    Returns prob in [0,1] (higher = more likely fake), or None if model unavailable.
    """
    if not TORCH_OK:
        return None
    model = _load_aasist()
    if model is None:
        return None

    x_np, _ = _read_audio_16k(path)
    x = torch.from_numpy(x_np).unsqueeze(0)  # [1, T]
    x = x.to(_DEVICE)

    # AMP on CUDA/MPS can boost speed
    amp_ctx = torch.cuda.amp.autocast() if (_DEVICE == "cuda" and hasattr(torch.cuda, "amp")) else _nullcontext()
    with torch.inference_mode(), amp_ctx:
        logit = model(x)  # -> [1] or [1,1]
        if isinstance(logit, (tuple, list)):
            logit = logit[0]
        prob = torch.sigmoid(logit).flatten()[0].item()
    return float(max(0.0, min(1.0, prob)))

def _spectral_artifact_score(path: str) -> float:
    """
    Fast 0..1 score: higher means 'more likely fake'.
    Uses simple robust features; runs even without torch/torchaudio.
    """
    import librosa
    logger = logging.getLogger(__name__)
    try:
        y, sr = _read_audio_16k(path, target_sr=16000, max_seconds=30)  # keep it short for API latency
        if y.shape[0] < sr:  # very short
            return 0.35

        # Basic features
        rms = librosa.feature.rms(y=y, frame_length=1024, hop_length=256, center=True)[0]
        zcr = librosa.feature.zero_crossing_rate(y=y, frame_length=1024, hop_length=256, center=True)[0]
        centroid = librosa.feature.spectral_centroid(y=y, sr=sr, n_fft=1024, hop_length=256, center=True)[0]

        # Robust stats
        rms_m = float(np.median(rms))
        zcr_m = float(np.median(zcr))
        cent_m = float(np.median(centroid))

        # Heuristic mix: high zcr + low rms + centroid far from speech band (~3k) → more synthetic
        score = (
            0.45 * np.clip(zcr_m * 10.0, 0, 1) +
            0.25 * np.clip((0.5 - rms_m) * 2.0, 0, 1) +
            0.30 * np.clip(abs(cent_m - 3000) / 3000, 0, 1)
        )
        return float(np.clip(score, 0, 1))
    except Exception as e:
        logger.error(f"Spectral analysis failed: {e}")
        return 0.5  # neutral when unsure

def deepfake_audio_detector(audio_path: str) -> Tuple[bool, float]:
    """
    Returns (is_deepfake: bool, confidence: float 0..1).
    Tries AASIST TorchScript -> heuristic fallback.
    """
    logger = logging.getLogger(__name__)
    try:
        logger.info(f"DF-Audio: start: {audio_path}")
        prob = _infer_aasist(audio_path)
        if prob is None:
            logger.info("DF-Audio: AASIST unavailable, using heuristic")
            prob = _spectral_artifact_score(audio_path)

        is_fake = bool(prob < 0.5)
        logger.info(f"DF-Audio: done is_fake={is_fake} conf={prob:.3f}")
        return is_fake, float(prob)

    except Exception as e:
        logger.error(f"Deepfake detection failed: {e}")
        return False, 0.1

# tiny context manager when AMP isn’t used
from contextlib import contextmanager
@contextmanager
def _nullcontext():
    yield
