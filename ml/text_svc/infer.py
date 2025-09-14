"""
Inference wrapper for text scam detection.

Includes:
- Loading trained models (baseline and transformer)
- Rule-based keyword detection
- Explainability (SHAP for top tokens)
- Export to TorchScript/ONNX
"""

import os
import joblib
import yaml
import torch
import torch.onnx
from transformers import AutoModelForSequenceClassification, AutoTokenizer
import shap
import numpy as np
from typing import List, Dict, Any

class RuleBasedDetector:
    """Rule-based detector using keyword matching."""

    def __init__(self, rules_path: str):
        with open(rules_path, 'r') as f:
            self.rules = yaml.safe_load(f)

    def detect(self, text: str) -> Dict[str, List[str]]:
        """Detect matching keywords in text."""
        text_lower = text.lower()
        matches = {}
        for category, keywords in self.rules.items():
            matches[category] = [kw for kw in keywords if kw in text_lower]
        return matches

    def score(self, text: str) -> float:
        """Simple score based on number of matches."""
        matches = self.detect(text)
        total_matches = sum(len(v) for v in matches.values())
        return min(total_matches / 10.0, 1.0)  # Normalize to [0,1]

class BaselineModel:
    """TF-IDF + Logistic Regression model."""

    def __init__(self, model_path: str, vectorizer_path: str):
        self.clf = joblib.load(model_path)
        self.vectorizer = joblib.load(vectorizer_path)

    def predict_proba(self, texts: List[str]) -> np.ndarray:
        X = self.vectorizer.transform(texts)
        return self.clf.predict_proba(X)

    def predict(self, texts: List[str]) -> np.ndarray:
        X = self.vectorizer.transform(texts)
        return self.clf.predict(X)

class TransformerModel:
    """Fine-tuned transformer model."""

    def __init__(self, model_path: str):
        self.tokenizer = AutoTokenizer.from_pretrained(model_path)
        self.model = AutoModelForSequenceClassification.from_pretrained(model_path)
        self.model.eval()

    def predict_proba(self, texts: List[str]) -> np.ndarray:
        encodings = self.tokenizer(texts, truncation=True, padding=True, max_length=512, return_tensors="pt")
        with torch.no_grad():
            outputs = self.model(**encodings)
            probs = torch.softmax(outputs.logits, dim=1).numpy()
        return probs

    def predict(self, texts: List[str]) -> np.ndarray:
        probs = self.predict_proba(texts)
        return np.argmax(probs, axis=1)

    def export_to_onnx(self, output_path: str):
        """Export model to ONNX."""
        dummy_input = self.tokenizer("dummy text", return_tensors="pt")
        torch.onnx.export(
            self.model,
            (dummy_input['input_ids'], dummy_input['attention_mask']),
            output_path,
            input_names=['input_ids', 'attention_mask'],
            output_names=['logits'],
            dynamic_axes={'input_ids': {0: 'batch_size'}, 'attention_mask': {0: 'batch_size'}, 'logits': {0: 'batch_size'}}
        )

class TextScamDetector:
    """Combined detector with baseline, transformer, and rules."""

    def __init__(self, model_dir: str, rules_path: str):
        self.baseline = BaselineModel(
            os.path.join(model_dir, "baseline_lr.joblib"),
            os.path.join(model_dir, "tfidf_vectorizer.joblib")
        )
        self.transformer = TransformerModel(model_dir)
        self.rule_detector = RuleBasedDetector(rules_path)

        # SHAP explainer for transformer
        self.explainer = shap.Explainer(self.transformer.model, self.transformer.tokenizer)

    def predict(self, text: str) -> Dict[str, Any]:
        """Predict scam risk with explanations."""
        # Model predictions
        baseline_prob = self.baseline.predict_proba([text])[0][1]
        transformer_prob = self.transformer.predict_proba([text])[0][1]
        rule_score = self.rule_detector.score(text)

        # Ensemble risk score (simple average)
        risk = (baseline_prob + transformer_prob + rule_score) / 3.0

        # Rule matches
        rule_matches = self.rule_detector.detect(text)

        # Top tokens using SHAP
        shap_values = self.explainer([text])
        top_tokens = self._get_top_tokens(shap_values, text)

        # Highlights (simple keyword matches)
        highlights = []
        for category, matches in rule_matches.items():
            for match in matches:
                highlights.append({"word": match, "category": category})

        return {
            "risk": float(risk),
            "highlights": highlights,
            "top_tokens": top_tokens,
            "details": {
                "baseline_prob": float(baseline_prob),
                "transformer_prob": float(transformer_prob),
                "rule_score": float(rule_score)
            }
        }

    def _get_top_tokens(self, shap_values, text: str) -> List[str]:
        """Extract top contributing tokens using SHAP."""
        # Simplified: get tokens with highest absolute SHAP values
        values = shap_values.values[0]
        tokens = shap_values.data[0]
        abs_values = np.abs(values)
        top_indices = np.argsort(abs_values)[-5:][::-1]  # Top 5
        return [tokens[i] for i in top_indices if tokens[i] != '[UNK]']

if __name__ == "__main__":
    # Example usage
    detector = TextScamDetector("models/text/model", "rules/text_keywords.yaml")
    result = detector.predict("Urgent: Your account will be suspended. Click here to verify.")
    print(result)
