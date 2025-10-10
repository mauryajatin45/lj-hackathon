"""
Training script for text-based scam detection.

Includes:
- TF-IDF + Logistic Regression baseline
- Fine-tuning distilroberta-base transformer
- Evaluation with AUC and F1 score
- Model checkpoint saving
"""

import os
import argparse
import logging
import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score, f1_score
from sklearn.feature_extraction.text import TfidfVectorizer
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    Trainer,
    TrainingArguments,
)
import torch
from datasets import Dataset as HFDataset
from models.text.dataset import TextDataset

# -----------------------------------------------------------
# Logging setup
# -----------------------------------------------------------
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("train_text")

# -----------------------------------------------------------
# Baseline: TF-IDF + Logistic Regression
# -----------------------------------------------------------
def train_baseline(train_texts, train_labels, val_texts, val_labels, model_dir: str):
    logger.info("Training TF-IDF + Logistic Regression baseline model...")

    vectorizer = TfidfVectorizer(max_features=5000, ngram_range=(1, 2))
    X_train = vectorizer.fit_transform(train_texts)
    X_val = vectorizer.transform(val_texts)

    clf = LogisticRegression(max_iter=1000, class_weight="balanced", n_jobs=-1)
    clf.fit(X_train, train_labels)

    val_probs = clf.predict_proba(X_val)[:, 1]
    auc = roc_auc_score(val_labels, val_probs)
    val_preds = (val_probs > 0.5).astype(int)
    f1 = f1_score(val_labels, val_preds)

    logger.info(f"Baseline Validation AUC: {auc:.4f}, F1: {f1:.4f}")

    os.makedirs(model_dir, exist_ok=True)
    joblib.dump(clf, os.path.join(model_dir, "baseline_lr.joblib"))
    joblib.dump(vectorizer, os.path.join(model_dir, "tfidf_vectorizer.joblib"))
    logger.info(f"Baseline model and vectorizer saved to {model_dir}")

# -----------------------------------------------------------
# Hugging Face metric computation
# -----------------------------------------------------------
def compute_metrics(eval_pred):
    logits, labels = eval_pred
    # Convert logits → probabilities
    probs = torch.softmax(torch.tensor(logits), dim=1)[:, 1].numpy()

    # Hugging Face already passes numpy arrays for labels
    labels = np.array(labels)

    auc = roc_auc_score(labels, probs)
    preds = (probs > 0.5).astype(int)
    f1 = f1_score(labels, preds)

    return {"auc": auc, "f1": f1}

# -----------------------------------------------------------
# Transformer fine-tuning
# -----------------------------------------------------------
def train_transformer(train_texts, train_labels, val_texts, val_labels, model_dir: str):
    logger.info("Fine-tuning distilroberta-base transformer model...")

    tokenizer = AutoTokenizer.from_pretrained("distilroberta-base")

    def tokenize_fn(texts, labels):
        encodings = tokenizer(texts, truncation=True, padding=True, max_length=256)
        encodings["labels"] = labels
        return encodings

    train_dataset = HFDataset.from_dict(tokenize_fn(train_texts, train_labels))
    val_dataset = HFDataset.from_dict(tokenize_fn(val_texts, val_labels))

    model = AutoModelForSequenceClassification.from_pretrained(
        "distilroberta-base",
        num_labels=2,
    )

    training_args = TrainingArguments(
        output_dir=model_dir,
        num_train_epochs=3,
        per_device_train_batch_size=16,
        per_device_eval_batch_size=32,
        evaluation_strategy="epoch",
        save_strategy="epoch",
        logging_dir=os.path.join(model_dir, "logs"),
        logging_steps=50,
        load_best_model_at_end=True,
        metric_for_best_model="auc",
        greater_is_better=True,
        save_total_limit=2,
        seed=42,
        report_to="none",  # disable wandb/hf logging unless explicitly enabled
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        compute_metrics=compute_metrics,
    )

    trainer.train()
    trainer.save_model(model_dir)
    logger.info(f"Transformer model fine-tuned and saved to {model_dir}")

# -----------------------------------------------------------
# Entry point
# -----------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="Train text scam detection models")
    parser.add_argument("--manifest", type=str, default="data/text_manifest.csv", help="Path to text manifest CSV")
    parser.add_argument("--model_dir", type=str, default="models/text/model", help="Directory to save models")
    args = parser.parse_args()

    dataset = TextDataset(args.manifest)
    train_texts, train_labels = dataset.get_texts_labels("train")
    val_texts, val_labels = dataset.get_texts_labels("val")

    train_baseline(train_texts, train_labels, val_texts, val_labels, args.model_dir)
    train_transformer(train_texts, train_labels, val_texts, val_labels, args.model_dir)

if __name__ == "__main__":
    main()
