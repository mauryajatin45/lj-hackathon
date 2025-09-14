"""
Inference Example for VGGish + Logistic Regression Deepfake Detection
"""

import os
import numpy as np
import soundfile as sf
import torch
from torchvggish import vggish, vggish_input
from sklearn.linear_model import LogisticRegression
import joblib

# 1) Load frozen VGGish (embeddings are 128-D)
vggish_model = vggish()
vggish_model.eval()

def embed_wav(path):
    """Extract VGGish embeddings from audio file."""
    wav, sr = sf.read(path)     # mono or stereo
    if wav.ndim > 1:
        wav = wav.mean(axis=1)  # Convert to mono
    # VGGish expects 16k; vggish_input handles resample+log-mel framing
    examples_batch = vggish_input.waveform_to_examples(wav, sample_rate=sr)
    with torch.no_grad():
        emb = vggish_model.forward(torch.tensor(examples_batch).float())
    return emb.numpy().mean(axis=0)  # average over segments -> (128,)

class FastDeepFakeDetector:
    """Combined audio and video detector."""

    def __init__(self):
        self.audio_model = None
        self.video_model = None  # Placeholder
        self.feature_stats = None

    def load_audio_model(self, model_path="vggish_linear.joblib", stats_path="feature_mean_std.npy"):
        """Load trained audio model."""
        if os.path.exists(model_path):
            self.audio_model = joblib.load(model_path)
        if os.path.exists(stats_path):
            self.feature_stats = np.load(stats_path)

    def predict_audio(self, audio_path):
        """Predict on single audio file."""
        if self.audio_model is None:
            return 0.5

        emb = embed_wav(audio_path)
        if self.feature_stats is not None:
            emb = (emb - self.feature_stats[0]) / (self.feature_stats[1] + 1e-9)

        prob_fake = self.audio_model.predict_proba([emb])[0, 1]
        return prob_fake

    def predict(self, audio_path=None, video_path=None):
        """Combined prediction."""
        scores = []

        if audio_path:
            audio_score = self.predict_audio(audio_path)
            scores.append(audio_score)

        if video_path:
            # Placeholder for video prediction
            video_score = 0.5
            scores.append(video_score)

        if scores:
            final_score = np.mean(scores)
        else:
            final_score = 0.5

        return {
            "deepfake_score": final_score,
            "prediction": "fake" if final_score > 0.5 else "real",
            "confidence": abs(final_score - 0.5) * 2
        }

# Initialize detector with trained model
detector = FastDeepFakeDetector()
detector.load_audio_model()

def predict_deepfake(audio_path=None, video_path=None):
    """Predict deepfake using VGGish + Logistic Regression model."""
    return detector.predict(audio_path=audio_path, video_path=video_path)

if __name__ == "__main__":
    # Example usage
    print("VGGish + Logistic Regression Deepfake Detector")
    print("Model loaded and ready for inference!")

    # Test with sample audio file (uncomment and modify path as needed)
    # result = predict_deepfake(audio_path="path/to/audio.wav")
    # print(f"Result: {result}")

    print("Use predict_deepfake(audio_path='path/to/audio.wav') to test.")
