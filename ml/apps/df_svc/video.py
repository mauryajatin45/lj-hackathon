# video_detect.py
import os
import tempfile
import logging
from typing import Tuple, List, Dict, Optional, Any
import numpy as np
import cv2
import mediapipe as mp
from moviepy.editor import VideoFileClip
import librosa
import onnxruntime as ort
from dataclasses import dataclass
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DetectionMethod(Enum):
    FACIAL_ANALYSIS = "facial_analysis"
    LIP_SYNC = "lip_sync"
    BLINK_ANALYSIS = "blink_analysis"
    AUDIO_ANALYSIS = "audio_analysis"

@dataclass
class DetectionResult:
    is_deepfake: bool
    confidence: float
    method_scores: Dict[DetectionMethod, float]
    details: Dict[str, Any]

class DeepfakeDetector:
    def __init__(self, model_path: str = "", confidence_threshold: float = 0.5):
        """
        Initialize deepfake detector with optional ONNX model.
        
        Args:
            model_path: Path to ONNX model for frame classification
            confidence_threshold: Threshold for final classification
        """
        self.model_path = model_path or os.getenv("DEEPFAKE_ONNX", "")
        self.confidence_threshold = confidence_threshold
        self.ort_session = None
        self.face_mesh = None
        self._initialize_components()
        
    def _initialize_components(self):
        """Initialize MediaPipe and ONNX runtime sessions."""
        try:
            # Initialize MediaPipe FaceMesh with configuration
            self.face_mesh = mp.solutions.face_mesh.FaceMesh(
                static_image_mode=False,
                max_num_faces=1,
                refine_landmarks=True,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5
            )
            logger.info("MediaPipe FaceMesh initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize MediaPipe: {e}")
            raise

        # Load ONNX model if available
        if self.model_path and os.path.exists(self.model_path):
            try:
                providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
                self.ort_session = ort.InferenceSession(
                    self.model_path, 
                    providers=providers
                )
                logger.info(f"ONNX model loaded successfully from {self.model_path}")
            except Exception as e:
                logger.warning(f"Failed to load ONNX model: {e}")
                self.ort_session = None
        else:
            logger.info("No ONNX model provided, using heuristic methods only")

    def _extract_faces(self, video_path: str, target_fps: int = 1, 
                      face_size: int = 224) -> List[np.ndarray]:
        """
        Extract face regions from video with improved face detection.
        
        Args:
            video_path: Path to video file
            target_fps: Target frames per second for sampling
            face_size: Size to resize faces to
            
        Returns:
            List of face images
        """
        faces = []
        try:
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                raise ValueError(f"Could not open video: {video_path}")
                
            fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            stride = max(1, int(round(fps / target_fps)))
            
            logger.info(f"Processing video: {total_frames} frames at {fps:.1f} FPS")
            
            for frame_idx in range(0, total_frames, stride):
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
                ret, frame = cap.read()
                
                if not ret or frame is None:
                    continue
                    
                # Convert and process frame
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = self.face_mesh.process(rgb_frame)
                
                if results.multi_face_landmarks:
                    face_roi = self._extract_face_region(frame, results.multi_face_landmarks[0])
                    if face_roi is not None:
                        face_resized = cv2.resize(face_roi, (face_size, face_size))
                        faces.append(face_resized)
            
            cap.release()
            logger.info(f"Extracted {len(faces)} faces from video")
            
        except Exception as e:
            logger.error(f"Error extracting faces: {e}")
            if 'cap' in locals():
                cap.release()
                
        return faces

    def _extract_face_region(self, frame: np.ndarray, landmarks) -> Optional[np.ndarray]:
        """
        Extract face region from frame using landmarks with improved bounding box.
        """
        try:
            h, w = frame.shape[:2]
            xs, ys = [], []
            
            # Use key facial landmarks for more stable bounding box
            key_indices = list(range(468))  # All face mesh points
            
            for idx in key_indices:
                if idx < len(landmarks.landmark):
                    lm = landmarks.landmark[idx]
                    xs.append(int(lm.x * w))
                    ys.append(int(lm.y * h))
            
            if not xs or not ys:
                return None
                
            # Calculate bounding box with padding
            x1, y1 = max(0, min(xs)), max(0, min(ys))
            x2, y2 = min(w, max(xs)), min(h, max(ys))
            
            # Adaptive padding based on face size
            bbox_width = x2 - x1
            bbox_height = y2 - y1
            pad_x = int(bbox_width * 0.1)  # 10% padding
            pad_y = int(bbox_height * 0.1)
            
            x1 = max(0, x1 - pad_x)
            y1 = max(0, y1 - pad_y)
            x2 = min(w, x2 + pad_x)
            y2 = min(h, y2 + pad_y)
            
            # Ensure valid region
            if x2 <= x1 or y2 <= y1:
                return None
                
            face_region = frame[y1:y2, x1:x2]
            return face_region
            
        except Exception as e:
            logger.warning(f"Error extracting face region: {e}")
            return None

    def _analyze_frames_with_model(self, faces: List[np.ndarray]) -> List[float]:
        """
        Analyze faces using ONNX model with improved preprocessing.
        """
        if self.ort_session is None or not faces:
            return []
            
        try:
            # Preprocess faces
            processed_faces = []
            for face in faces:
                # Convert to RGB and normalize
                rgb_face = cv2.cvtColor(face, cv2.COLOR_BGR2RGB)
                normalized_face = rgb_face.astype(np.float32) / 255.0
                
                # Standardize image (optional: add more preprocessing)
                processed_faces.append(normalized_face)
            
            # Stack and transpose for model input
            X = np.stack(processed_faces)  # N,H,W,3
            X = np.transpose(X, (0, 3, 1, 2))  # N,3,H,W
            
            # Run inference
            input_name = self.ort_session.get_inputs()[0].name
            outputs = self.ort_session.run(None, {input_name: X})
            
            # Process outputs
            raw_scores = outputs[0].squeeze()
            scores = self._process_model_outputs(raw_scores)
            
            return scores
            
        except Exception as e:
            logger.error(f"Error in model inference: {e}")
            return []

    def _process_model_outputs(self, raw_outputs: np.ndarray) -> List[float]:
        """Process model outputs to probabilities."""
        scores = []
        
        for score in np.atleast_1d(raw_outputs):
            # Handle different output types (logits, probabilities)
            if score < 0 or score > 1:  # Likely logits
                prob = 1.0 / (1.0 + np.exp(-score))
            else:  # Already probability
                prob = score
                
            scores.append(float(np.clip(prob, 0.0, 1.0)))
            
        return scores

    def _analyze_blink_patterns(self, video_path: str, target_fps: int = 10) -> Dict[str, float]:
        """
        Analyze blink patterns with improved EAR calculation and statistics.
        """
        try:
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                return {"blink_rate": 0.0, "abnormality": 0.8}
                
            fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
            stride = max(1, int(round(fps / target_fps)))
            ear_values = []
            
            frame_idx = 0
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                    
                if frame_idx % stride == 0:
                    ear = self._calculate_ear(frame)
                    if ear is not None:
                        ear_values.append(ear)
                        
                frame_idx += 1
                
            cap.release()
            return self._compute_blink_statistics(ear_values, target_fps)
            
        except Exception as e:
            logger.error(f"Error in blink analysis: {e}")
            return {"blink_rate": 0.0, "abnormality": 0.7}

    def _calculate_ear(self, frame: np.ndarray) -> Optional[float]:
        """Calculate Eye Aspect Ratio with improved landmark selection."""
        try:
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = self.face_mesh.process(rgb_frame)
            
            if not results.multi_face_landmarks:
                return None
                
            landmarks = results.multi_face_landmarks[0].landmark
            h, w = frame.shape[:2]
            
            def get_coord(index):
                lm = landmarks[index]
                return np.array([lm.x * w, lm.y * h])
            
            # Improved EAR calculation using more stable landmarks
            # Left eye landmarks
            left_eye_indices = [33, 160, 158, 133, 153, 144]
            # Right eye landmarks  
            right_eye_indices = [362, 385, 387, 263, 373, 380]
            
            left_ear = self._compute_ear_for_eye(left_eye_indices, get_coord)
            right_ear = self._compute_ear_for_eye(right_eye_indices, get_coord)
            
            # Use average of both eyes
            return (left_ear + right_ear) / 2.0
            
        except Exception as e:
            logger.warning(f"Error calculating EAR: {e}")
            return None

    def _compute_ear_for_eye(self, indices: List[int], get_coord) -> float:
        """Compute EAR for a single eye."""
        try:
            points = [get_coord(i) for i in indices]
            
            # EAR formula: (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)
            vertical1 = np.linalg.norm(points[1] - points[5])
            vertical2 = np.linalg.norm(points[2] - points[4])
            horizontal = np.linalg.norm(points[0] - points[3])
            
            return (vertical1 + vertical2) / (2.0 * horizontal + 1e-6)
        except:
            return 0.0

    def _compute_blink_statistics(self, ear_values: List[float], target_fps: int) -> Dict[str, float]:
        """Compute blink statistics from EAR values."""
        if len(ear_values) < 10:
            return {"blink_rate": 0.0, "abnormality": 0.6}
            
        ear_array = np.array(ear_values)
        
        # Adaptive threshold based on data
        threshold = np.percentile(ear_array, 20) * 0.85
        threshold = max(0.15, threshold)
        
        # Detect blinks
        closed_frames = ear_array < threshold
        blink_transitions = np.sum((~closed_frames[:-1]) & closed_frames[1:])
        
        # Calculate blink rate
        duration_seconds = len(ear_array) / target_fps
        blink_rate = (60.0 * blink_transitions) / max(1.0, duration_seconds)
        
        # Compute abnormality score
        abnormality = 0.0
        if blink_rate < 4.0:  # Low blink rate
            abnormality += 0.4
        if blink_rate > 30.0:  # Unnaturally high blink rate
            abnormality += 0.3
        if np.std(ear_array) < 0.01:  # Too consistent
            abnormality += 0.3
            
        return {
            "blink_rate": float(blink_rate),
            "abnormality": float(np.clip(abnormality, 0.0, 1.0))
        }

    def _analyze_lip_sync(self, video_path: str) -> float:
        """
        Analyze lip-sync correlation with improved audio processing.
        """
        try:
            clip = VideoFileClip(video_path)
            
            if clip.audio is None:
                return 0.6  # Suspicious if no audio with video
                
            # Extract audio features
            audio_features = self._extract_audio_features(clip)
            mouth_features = self._extract_mouth_movement(clip)
            
            if len(audio_features) < 5 or len(mouth_features) < 5:
                return 0.5
                
            sync_score = self._compute_sync_correlation(audio_features, mouth_features)
            return sync_score
            
        except Exception as e:
            logger.error(f"Error in lip-sync analysis: {e}")
            return 0.5
        finally:
            if 'clip' in locals():
                clip.close()

    def _extract_audio_features(self, clip: VideoFileClip) -> np.ndarray:
        """Extract audio envelope features."""
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_audio:
            try:
                clip.audio.write_audiofile(
                    tmp_audio.name, 
                    fps=16000, 
                    verbose=False, 
                    logger=None
                )
                y, sr = librosa.load(tmp_audio.name, sr=16000, mono=True)
                
                # Extract RMS energy with better smoothing
                hop_length = 512
                rms = librosa.feature.rms(y=y, hop_length=hop_length)[0]
                rms_normalized = (rms - rms.min()) / (rms.max() - rms.min() + 1e-9)
                
                return rms_normalized
            finally:
                try:
                    os.unlink(tmp_audio.name)
                except:
                    pass

    def _extract_mouth_movement(self, clip: VideoFileClip) -> List[float]:
        """Extract mouth movement time series."""
        mouth_openings = []
        step = max(1, int(round(clip.fps / 10)))  # ~10 Hz sampling
        
        for frame_idx, frame in enumerate(clip.iter_frames(fps=clip.fps)):
            if frame_idx % step != 0:
                continue
                
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
            results = self.face_mesh.process(cv2.cvtColor(rgb_frame, cv2.COLOR_BGR2RGB))
            
            if results.multi_face_landmarks:
                opening = self._calculate_mouth_opening(frame, results.multi_face_landmarks[0])
                if opening is not None:
                    mouth_openings.append(opening)
                    
        return mouth_openings

    def _calculate_mouth_opening(self, frame: np.ndarray, landmarks) -> Optional[float]:
        """Calculate mouth opening metric."""
        try:
            h, w = frame.shape[:2]
            
            def get_coord(index):
                lm = landmarks.landmark[index]
                return np.array([lm.x * w, lm.y * h])
            
            # Mouth corner and center landmarks
            upper_lip = get_coord(13)
            lower_lip = get_coord(14)
            
            mouth_open = np.linalg.norm(upper_lip - lower_lip) / max(h, 1)
            return float(mouth_open)
            
        except Exception as e:
            logger.warning(f"Error calculating mouth opening: {e}")
            return None

    def _compute_sync_correlation(self, audio: np.ndarray, mouth: List[float]) -> float:
        """Compute lip-sync correlation score."""
        try:
            # Resample audio to match mouth series length
            mouth_array = np.array(mouth)
            audio_resampled = np.interp(
                np.linspace(0, 1, len(mouth_array)),
                np.linspace(0, 1, len(audio)),
                audio
            )
            
            # Compute cross-correlation for small lags
            max_corr = -1
            for lag in range(-3, 4):  # ±300ms at 10Hz
                if lag < 0:
                    corr = np.corrcoef(audio_resampled[:lag], mouth_array[-lag:])[0,1]
                elif lag > 0:
                    corr = np.corrcoef(audio_resampled[lag:], mouth_array[:-lag])[0,1]
                else:
                    corr = np.corrcoef(audio_resampled, mouth_array)[0,1]
                    
                if not np.isnan(corr):
                    max_corr = max(max_corr, corr)
                    
            # Convert correlation to mismatch score
            mismatch = max(0.0, 1.0 - (max_corr + 1) / 2.0)
            return float(mismatch)
            
        except Exception as e:
            logger.error(f"Error computing sync correlation: {e}")
            return 0.5

    def detect(self, video_path: str) -> DetectionResult:
        """
        Main detection method with comprehensive analysis.
        
        Args:
            video_path: Path to video file to analyze
            
        Returns:
            DetectionResult with classification and confidence
        """
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found: {video_path}")
            
        try:
            logger.info(f"Starting deepfake analysis for: {video_path}")
            
            # Extract and analyze faces
            faces = self._extract_faces(video_path, target_fps=1)
            frame_scores = self._analyze_frames_with_model(faces)
            
            # Compute model confidence
            if frame_scores:
                model_confidence = float(np.median(frame_scores))
                model_reliability = min(1.0, len(frame_scores) / 10.0)  # Scale by sample size
                model_score = model_confidence * model_reliability
            else:
                model_score = 0.35  # Conservative default
            
            # Analyze other features
            lip_sync_mismatch = self._analyze_lip_sync(video_path)
            blink_analysis = self._analyze_blink_patterns(video_path)
            blink_abnormality = blink_analysis["abnormality"]
            
            # Weighted fusion with adaptive weights
            weights = self._compute_adaptive_weights(
                has_model=len(frame_scores) > 0,
                face_count=len(faces),
                video_duration=self._get_video_duration(video_path)
            )
            
            # Compute final score
            final_score = (
                weights["model"] * model_score +
                weights["lip_sync"] * lip_sync_mismatch +
                weights["blink"] * blink_abnormality
            )
            
            # Prepare results
            method_scores = {
                DetectionMethod.FACIAL_ANALYSIS: model_score,
                DetectionMethod.LIP_SYNC: lip_sync_mismatch,
                DetectionMethod.BLINK_ANALYSIS: blink_abnormality
            }
            
            details = {
                "faces_analyzed": len(faces),
                "frames_scored": len(frame_scores),
                "blink_rate": blink_analysis["blink_rate"],
                "model_used": self.ort_session is not None
            }
            
            is_deepfake = final_score >= self.confidence_threshold
            
            logger.info(f"Analysis complete: deepfake={is_deepfake}, confidence={final_score:.3f}")
            
            return DetectionResult(
                is_deepfake=is_deepfake,
                confidence=float(np.clip(final_score, 0.0, 1.0)),
                method_scores=method_scores,
                details=details
            )
            
        except Exception as e:
            logger.error(f"Error during deepfake detection: {e}")
            # Return low-confidence real result on error
            return DetectionResult(
                is_deepfake=False,
                confidence=0.1,
                method_scores={},
                details={"error": str(e)}
            )

    def _compute_adaptive_weights(self, has_model: bool, face_count: int, 
                                video_duration: float) -> Dict[str, float]:
        """Compute adaptive weights based on available data quality."""
        base_weights = {
            "model": 0.5 if has_model else 0.0,
            "lip_sync": 0.3,
            "blink": 0.2
        }
        
        # Adjust weights based on data quality
        if face_count < 5:
            base_weights["lip_sync"] *= 0.7
            base_weights["blink"] *= 0.8
            
        if video_duration < 3.0:  # Short videos less reliable
            for key in base_weights:
                base_weights[key] *= 0.8
                
        # Normalize weights
        total = sum(base_weights.values())
        if total > 0:
            return {k: v/total for k, v in base_weights.items()}
        else:
            return {"model": 0.0, "lip_sync": 0.5, "blink": 0.5}

    def _get_video_duration(self, video_path: str) -> float:
        """Get video duration in seconds."""
        try:
            cap = cv2.VideoCapture(video_path)
            fps = cap.get(cv2.CAP_PROP_FPS)
            frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT)
            cap.release()
            
            if fps > 0 and frame_count > 0:
                return frame_count / fps
            return 0.0
        except:
            return 0.0

    def __del__(self):
        """Cleanup resources."""
        if self.face_mesh:
            self.face_mesh.close()

# Backward compatibility function
def deepfake_video_detector(video_path: str) -> Tuple[bool, float]:
    """
    Legacy function for backward compatibility.
    
    Returns:
        Tuple of (is_deepfake: bool, confidence: float)
    """
    detector = DeepfakeDetector()
    result = detector.detect(video_path)
    return result.is_deepfake, result.confidence

# Example usage
if __name__ == "__main__":
    detector = DeepfakeDetector()
    result = detector.detect("test_video.mp4")
    
    print(f"Deepfake: {result.is_deepfake}")
    print(f"Confidence: {result.confidence:.3f}")
    print(f"Details: {result.details}")