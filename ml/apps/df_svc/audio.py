# audio_detect.py
from __future__ import annotations
import os
import math
import logging
import threading
from typing import Tuple, Optional, Dict, Any
from dataclasses import dataclass
from enum import Enum
from contextlib import contextmanager

import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DetectionMethod(Enum):
    AASIST_MODEL = "aasist_model"
    SPECTRAL_ANALYSIS = "spectral_analysis"
    PROSODY_ANALYSIS = "prosody_analysis"

@dataclass
class AudioDetectionResult:
    is_deepfake: bool
    confidence: float
    method_scores: Dict[DetectionMethod, float]
    details: Dict[str, Any]
    audio_metadata: Dict[str, Any]

class AudioDeepfakeDetector:
    """
    Enhanced audio deepfake detector with multiple analysis methods.
    
    Features:
    - AASIST model inference (if available)
    - Spectral artifact analysis
    - Prosody and temporal analysis
    - Adaptive confidence scoring
    - Comprehensive error handling
    """
    
    def __init__(self, model_path: str = "", confidence_threshold: float = 0.5):
        """
        Initialize audio detector.
        
        Args:
            model_path: Path to AASIST TorchScript model
            confidence_threshold: Classification threshold
        """
        self.model_path = model_path or os.getenv("AASIST_CKPT", "")
        self.confidence_threshold = confidence_threshold
        self.device = self._pick_device()
        self.model = None
        self.model_lock = threading.Lock()
        self._initialize_model()
        
    def _pick_device(self) -> str:
        """Select best available device for inference."""
        try:
            import torch
            if torch.cuda.is_available():
                return "cuda"
            if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
                return "mps"
            return "cpu"
        except ImportError:
            return "cpu"
    
    def _initialize_model(self):
        """Initialize AASIST model with thread safety."""
        if not self.model_path or not os.path.exists(self.model_path):
            logger.info("No AASIST model provided, using heuristic methods only")
            return
            
        try:
            import torch
            with self.model_lock:
                if self.model is not None:
                    return
                    
                logger.info(f"Loading AASIST model from {self.model_path} on {self.device}")
                self.model = torch.jit.load(self.model_path, map_location=self.device)
                self.model.eval()
                
                # Compile for performance if available
                if hasattr(torch, "compile"):
                    try:
                        self.model = torch.compile(self.model, mode="reduce-overhead")
                        logger.info("Model compiled for optimized performance")
                    except Exception as e:
                        logger.warning(f"Model compilation failed: {e}")
                        
                logger.info("AASIST model loaded successfully")
                
        except Exception as e:
            logger.error(f"Failed to load AASIST model: {e}")
            self.model = None

    def load_audio(self, audio_path: str, target_sr: int = 16000, 
                  max_duration: int = 60) -> Tuple[np.ndarray, int]:
        """
        Robust audio loading with multiple fallback strategies.
        
        Args:
            audio_path: Path to audio file
            target_sr: Target sample rate
            max_duration: Maximum duration in seconds
            
        Returns:
            Tuple of (audio_data, sample_rate)
        """
        audio_data = None
        sample_rate = None
        
        # Try torchaudio first (most reliable)
        audio_data, sample_rate = self._load_with_torchaudio(audio_path, target_sr)
        
        # Fallback to librosa
        if audio_data is None:
            audio_data, sample_rate = self._load_with_librosa(audio_path, target_sr)
            
        if audio_data is None or len(audio_data) == 0:
            raise RuntimeError(f"Could not load audio from {audio_path}")
            
        # Sanitize and normalize audio
        audio_data = self._sanitize_audio(audio_data)
        
        # Trim to maximum duration
        max_samples = target_sr * max_duration
        if len(audio_data) > max_samples:
            audio_data = self._extract_center_segment(audio_data, max_samples)
            
        return audio_data.astype(np.float32), sample_rate

    def _load_with_torchaudio(self, audio_path: str, target_sr: int) -> Tuple[Optional[np.ndarray], Optional[int]]:
        """Load audio using torchaudio with enhanced error handling."""
        try:
            import torch
            import torchaudio
            
            waveform, original_sr = torchaudio.load(audio_path)
            
            # Convert to mono if multi-channel
            if waveform.dim() > 1 and waveform.size(0) > 1:
                waveform = torch.mean(waveform, dim=0, keepdim=True)
            waveform = waveform.reshape(1, -1)
            
            # Resample if necessary
            if original_sr != target_sr:
                waveform = torchaudio.functional.resample(
                    waveform, 
                    original_sr, 
                    target_sr,
                    lowpass_filter_width=64,
                    rolloff=0.9475937167399596,
                    resampling_method="sinc_interp_kaiser"
                )
                
            # Convert to numpy
            audio_np = waveform.squeeze().detach().cpu().numpy()
            return audio_np, target_sr
            
        except Exception as e:
            logger.debug(f"TorchAudio loading failed: {e}")
            return None, None

    def _load_with_librosa(self, audio_path: str, target_sr: int) -> Tuple[Optional[np.ndarray], Optional[int]]:
        """Load audio using librosa fallback."""
        try:
            import librosa
            audio_data, sr = librosa.load(
                audio_path, 
                sr=target_sr, 
                mono=True, 
                res_type="kaiser_fast"
            )
            return audio_data, sr
        except Exception as e:
            logger.error(f"Librosa loading failed: {e}")
            return None, None

    def _sanitize_audio(self, audio_data: np.ndarray) -> np.ndarray:
        """Clean and normalize audio data."""
        # Remove NaN and infinite values
        audio_data = np.nan_to_num(audio_data, nan=0.0, posinf=0.0, neginf=0.0)
        
        # Clip to prevent extreme values
        audio_data = np.clip(audio_data, -1.0, 1.0)
        
        # Normalize volume if too quiet
        max_val = np.max(np.abs(audio_data))
        if max_val < 0.1:  # Too quiet
            audio_data = audio_data / (max_val + 1e-8)
            audio_data = np.clip(audio_data, -1.0, 1.0)
            
        return audio_data

    def _extract_center_segment(self, audio_data: np.ndarray, max_samples: int) -> np.ndarray:
        """Extract center segment of audio for consistent analysis."""
        if len(audio_data) <= max_samples:
            return audio_data
            
        start_idx = (len(audio_data) - max_samples) // 2
        return audio_data[start_idx:start_idx + max_samples]

    def analyze_with_model(self, audio_path: str) -> Optional[float]:
        """
        Run AASIST model inference with enhanced preprocessing.
        
        Returns:
            Probability score (0=real, 1=fake) or None if model unavailable
        """
        if self.model is None:
            return None
            
        try:
            import torch
            
            # Load and preprocess audio
            audio_data, sr = self.load_audio(audio_path)
            
            # Convert to tensor
            audio_tensor = torch.from_numpy(audio_data).unsqueeze(0)  # [1, T]
            audio_tensor = audio_tensor.to(self.device)
            
            # Run inference with optimization
            with torch.inference_mode():
                # Use mixed precision if available
                if self.device in ["cuda", "mps"]:
                    with torch.amp.autocast(self.device):  # type: ignore
                        logit = self.model(audio_tensor)
                else:
                    logit = self.model(audio_tensor)
                
                # Handle different output formats
                if isinstance(logit, (tuple, list)):
                    logit = logit[0]
                    
                # Convert to probability
                probability = torch.sigmoid(logit.flatten()[0]).item()
                
            logger.debug(f"Model inference result: {probability:.4f}")
            return float(np.clip(probability, 0.0, 1.0))
            
        except Exception as e:
            logger.error(f"Model inference failed: {e}")
            return None

    def analyze_spectral_features(self, audio_path: str) -> float:
        """
        Enhanced spectral analysis for artifact detection.
        
        Returns:
            Artifact score (0=clean, 1=likely synthetic)
        """
        try:
            import librosa
            
            audio_data, sr = self.load_audio(audio_path, max_duration=30)
            
            if len(audio_data) < sr:  # Very short audio
                return 0.35
                
            # Extract multiple spectral features
            features = self._extract_spectral_features(audio_data, sr)
            score = self._compute_spectral_score(features)
            
            return float(np.clip(score, 0.0, 1.0))
            
        except Exception as e:
            logger.error(f"Spectral analysis failed: {e}")
            return 0.5  # Neutral on error

    def _extract_spectral_features(self, audio_data: np.ndarray, sr: int) -> Dict[str, float]:
        """Extract comprehensive spectral features."""
        import librosa
        
        frame_length = 1024
        hop_length = 256
        
        features = {}
        
        # Time-domain features
        features['rms'] = float(np.median(librosa.feature.rms(
            y=audio_data, frame_length=frame_length, hop_length=hop_length
        )))
        features['zcr'] = float(np.median(librosa.feature.zero_crossing_rate(
            y=audio_data, frame_length=frame_length, hop_length=hop_length
        )))
        
        # Spectral features
        spectral_centroid = librosa.feature.spectral_centroid(
            y=audio_data, sr=sr, n_fft=frame_length, hop_length=hop_length
        )
        features['spectral_centroid'] = float(np.median(spectral_centroid))
        
        spectral_bandwidth = librosa.feature.spectral_bandwidth(
            y=audio_data, sr=sr, n_fft=frame_length, hop_length=hop_length
        )
        features['spectral_bandwidth'] = float(np.median(spectral_bandwidth))
        
        spectral_rolloff = librosa.feature.spectral_rolloff(
            y=audio_data, sr=sr, n_fft=frame_length, hop_length=hop_length
        )
        features['spectral_rolloff'] = float(np.median(spectral_rolloff))
        
        # Spectral contrast
        spectral_contrast = librosa.feature.spectral_contrast(
            y=audio_data, sr=sr, n_fft=frame_length, hop_length=hop_length
        )
        features['spectral_contrast'] = float(np.median(spectral_contrast))
        
        # MFCCs (first 5 coefficients)
        mfccs = librosa.feature.mfcc(
            y=audio_data, sr=sr, n_mfcc=13, n_fft=frame_length, hop_length=hop_length
        )
        for i in range(5):
            features[f'mfcc_{i+1}'] = float(np.median(mfccs[i]))
            
        return features

    def _compute_spectral_score(self, features: Dict[str, float]) -> float:
        """Compute artifact score from spectral features."""
        score = 0.0
        
        # High zero-crossing rate can indicate synthetic artifacts
        zcr_score = min(1.0, features['zcr'] * 8.0)
        score += 0.25 * zcr_score
        
        # Low RMS (quiet audio) can be suspicious
        rms_score = max(0.0, 0.5 - features['rms']) * 2.0
        score += 0.20 * rms_score
        
        # Spectral centroid far from speech range (100-4000 Hz)
        centroid_score = 0.0
        if features['spectral_centroid'] < 100 or features['spectral_centroid'] > 4000:
            centroid_score = min(1.0, abs(features['spectral_centroid'] - 2000) / 2000)
        score += 0.15 * centroid_score
        
        # Unusual spectral bandwidth
        bandwidth_score = 0.0
        if features['spectral_bandwidth'] > 4000:  # Very wide bandwidth
            bandwidth_score = min(1.0, (features['spectral_bandwidth'] - 2000) / 3000)
        score += 0.15 * bandwidth_score
        
        # MFCC abnormalities (first coefficient variance)
        mfcc1_var = abs(features['mfcc_1'])
        mfcc_score = min(1.0, mfcc1_var / 500.0) if mfcc1_var > 100 else 0.0
        score += 0.15 * mfcc_score
        
        # Spectral contrast (low contrast can indicate synthetic sounds)
        contrast_score = max(0.0, 5.0 - features['spectral_contrast']) / 5.0
        score += 0.10 * contrast_score
        
        return score

    def analyze_prosody(self, audio_path: str) -> float:
        """
        Analyze speech prosody and temporal patterns.
        
        Returns:
            Prosody abnormality score (0=normal, 1=abnormal)
        """
        try:
            import librosa
            
            audio_data, sr = self.load_audio(audio_path, max_duration=30)
            
            # Extract prosodic features
            tempo, _ = librosa.beat.beat_track(y=audio_data, sr=sr)
            onset_env = librosa.onset.onset_strength(y=audio_data, sr=sr)
            onset_std = float(np.std(onset_env))
            
            # Pitch analysis
            f0 = self._extract_pitch(audio_data, sr)
            f0_std = float(np.std(f0)) if len(f0) > 0 else 0.0
            
            # Compute prosody score
            score = 0.0
            
            # Unnaturally consistent tempo
            if tempo > 0:
                tempo_score = min(1.0, abs(tempo - 120) / 120)  # Deviation from typical speech tempo
                score += 0.3 * tempo_score
                
            # Flat onset patterns
            if onset_std < 0.1:
                score += 0.3
                
            # Monotonic pitch (common in synthetic speech)
            if f0_std < 20.0 and len(f0) > 10:
                score += 0.4
                
            return float(np.clip(score, 0.0, 1.0))
            
        except Exception as e:
            logger.warning(f"Prosody analysis failed: {e}")
            return 0.3  # Conservative default

    def _extract_pitch(self, audio_data: np.ndarray, sr: int) -> np.ndarray:
        """Extract fundamental frequency (pitch) using PyWorld or librosa."""
        try:
            import librosa
            
            # Use PyWorld for more accurate pitch extraction if available
            try:
                import pyworld as pw
                f0, _ = pw.dio(audio_data.astype(np.float64), sr, frame_period=10)
                return f0[f0 > 0]  # Remove unvoiced segments
            except ImportError:
                # Fallback to librosa
                f0, _, _ = librosa.pyin(
                    audio_data, 
                    fmin=50, 
                    fmax=400, 
                    sr=sr,
                    frame_length=1024,
                    hop_length=256
                )
                return f0[~np.isnan(f0)]  # Remove NaN values
                
        except Exception:
            return np.array([])

    def get_audio_metadata(self, audio_path: str) -> Dict[str, Any]:
        """Extract audio file metadata."""
        try:
            import librosa
            
            audio_data, sr = self.load_audio(audio_path)
            duration = len(audio_data) / sr
            
            return {
                "duration_seconds": float(duration),
                "sample_rate": sr,
                "samples": len(audio_data),
                "max_amplitude": float(np.max(np.abs(audio_data))),
                "mean_amplitude": float(np.mean(np.abs(audio_data))),
                "is_too_short": duration < 1.0,
                "is_too_long": duration > 300.0
            }
        except Exception as e:
            logger.warning(f"Could not extract audio metadata: {e}")
            return {}

    def detect(self, audio_path: str) -> AudioDetectionResult:
        """
        Comprehensive audio deepfake detection.
        
        Args:
            audio_path: Path to audio file
            
        Returns:
            AudioDetectionResult with classification and detailed scores
        """
        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Audio file not found: {audio_path}")
            
        logger.info(f"Starting audio deepfake analysis: {audio_path}")
        
        try:
            # Extract metadata first
            audio_metadata = self.get_audio_metadata(audio_path)
            
            # Run all available detection methods
            method_scores = {}
            
            # 1. AASIST model (if available)
            model_score = self.analyze_with_model(audio_path)
            if model_score is not None:
                method_scores[DetectionMethod.AASIST_MODEL] = model_score
                model_weight = 0.6
            else:
                model_weight = 0.0
                
            # 2. Spectral analysis (always available)
            spectral_score = self.analyze_spectral_features(audio_path)
            method_scores[DetectionMethod.SPECTRAL_ANALYSIS] = spectral_score
            spectral_weight = 0.25 if model_weight > 0 else 0.6
            
            # 3. Prosody analysis
            prosody_score = self.analyze_prosody(audio_path)
            method_scores[DetectionMethod.PROSODY_ANALYSIS] = prosody_score
            prosody_weight = 0.15 if model_weight > 0 else 0.4
            
            # Adjust weights based on audio quality
            weights = self._compute_adaptive_weights(
                model_weight, spectral_weight, prosody_weight, audio_metadata
            )
            
            # Compute weighted confidence score
            total_weight = sum(weights.values())
            if total_weight > 0:
                confidence = (
                    weights["model"] * method_scores.get(DetectionMethod.AASIST_MODEL, 0.5) +
                    weights["spectral"] * method_scores[DetectionMethod.SPECTRAL_ANALYSIS] +
                    weights["prosody"] * method_scores[DetectionMethod.PROSODY_ANALYSIS]
                ) / total_weight
            else:
                confidence = 0.5  # Fallback
                
            confidence = float(np.clip(confidence, 0.0, 1.0))
            is_deepfake = confidence >= self.confidence_threshold
            
            # Prepare details
            details = {
                "audio_duration": audio_metadata.get("duration_seconds", 0),
                "model_used": model_score is not None,
                "audio_quality": "good" if audio_metadata.get("duration_seconds", 0) > 2.0 else "poor"
            }
            
            logger.info(f"Audio analysis complete: deepfake={is_deepfake}, confidence={confidence:.3f}")
            
            return AudioDetectionResult(
                is_deepfake=is_deepfake,
                confidence=confidence,
                method_scores=method_scores,
                details=details,
                audio_metadata=audio_metadata
            )
            
        except Exception as e:
            logger.error(f"Audio deepfake detection failed: {e}")
            return AudioDetectionResult(
                is_deepfake=False,
                confidence=0.1,
                method_scores={},
                details={"error": str(e)},
                audio_metadata={}
            )

    def _compute_adaptive_weights(self, model_w: float, spectral_w: float, 
                                prosody_w: float, metadata: Dict[str, Any]) -> Dict[str, float]:
        """Compute adaptive weights based on audio quality and available methods."""
        weights = {
            "model": model_w,
            "spectral": spectral_w,
            "prosody": prosody_w
        }
        
        # Reduce weights for poor quality audio
        if metadata.get("is_too_short", False):
            for key in weights:
                weights[key] *= 0.7
                
        if metadata.get("mean_amplitude", 1.0) < 0.05:  # Very quiet
            for key in weights:
                weights[key] *= 0.8
                
        return weights

    def __del__(self):
        """Cleanup resources."""
        if hasattr(self, 'model') and self.model is not None:
            try:
                del self.model
            except:
                pass

# Backward compatibility function
def deepfake_audio_detector(audio_path: str) -> Tuple[bool, float]:
    """
    Legacy function for backward compatibility.
    
    Returns:
        Tuple of (is_deepfake: bool, confidence: float)
    """
    detector = AudioDeepfakeDetector()
    result = detector.detect(audio_path)
    return result.is_deepfake, result.confidence

# Context manager for mixed precision
@contextmanager
def _nullcontext():
    yield

# Example usage
if __name__ == "__main__":
    detector = AudioDeepfakeDetector()
    result = detector.detect("test_audio.wav")
    
    print(f"Deepfake: {result.is_deepfake}")
    print(f"Confidence: {result.confidence:.3f}")
    print(f"Method Scores: {result.method_scores}")
    print(f"Details: {result.details}")
    print(f"Audio Metadata: {result.audio_metadata}")