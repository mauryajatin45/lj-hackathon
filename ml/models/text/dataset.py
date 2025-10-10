"""
Dataset and tokenization utilities for text scam detection.

Supports both scikit-learn (TF-IDF) and HuggingFace tokenizers.
Handles dataset loading, preprocessing, and splits.
"""

import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from transformers import AutoTokenizer
import torch
from torch.utils.data import Dataset as TorchDataset
import logging

logger = logging.getLogger(__name__)

class TextDataset:
    """Handles text data loading and preprocessing."""

    def __init__(self, manifest_path: str):
        self.manifest_path = manifest_path
        self.df = None
        self.load_data()

    def load_data(self):
        """Load data from manifest CSV."""
        self.df = pd.read_csv(self.manifest_path)
        logger.info(f"Loaded {len(self.df)} samples from {self.manifest_path}")

    def get_split(self, split: str):
        """Get dataframe for specific split (train/val/test)."""
        return self.df[self.df['split'] == split]

    def get_texts_labels(self, split: str):
        """Get texts and labels for a split."""
        split_df = self.get_split(split)
        return split_df['text'].tolist(), split_df['label'].tolist()

class SklearnTokenizer:
    """TF-IDF tokenizer for baseline models."""

    def __init__(self, max_features: int = 5000, ngram_range: tuple = (1, 2)):
        self.vectorizer = TfidfVectorizer(max_features=max_features, ngram_range=ngram_range)

    def fit(self, texts: list[str]):
        """Fit the vectorizer on training texts."""
        self.vectorizer.fit(texts)

    def transform(self, texts: list[str]):
        """Transform texts to TF-IDF vectors."""
        return self.vectorizer.transform(texts)

    def fit_transform(self, texts: list[str]):
        """Fit and transform."""
        return self.vectorizer.fit_transform(texts)

class HFTokenizer:
    """HuggingFace tokenizer wrapper."""

    def __init__(self, model_name: str = "distilroberta-base", max_length: int = 512):
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.max_length = max_length

    def tokenize(self, texts: list[str]):
        """Tokenize texts for model input."""
        return self.tokenizer(
            texts,
            truncation=True,
            padding=True,
            max_length=self.max_length,
            return_tensors="pt"
        )

class ScamDataset(TorchDataset):
    """PyTorch Dataset for HuggingFace models."""

    def __init__(self, texts: list[str], labels: list[int], tokenizer: HFTokenizer):
        self.texts = texts
        self.labels = labels
        self.tokenizer = tokenizer

    def __len__(self):
        return len(self.texts)

    def __getitem__(self, idx):
        text = self.texts[idx]
        label = self.labels[idx]
        encoding = self.tokenizer.tokenize([text])
        return {
            'input_ids': encoding['input_ids'].squeeze(),
            'attention_mask': encoding['attention_mask'].squeeze(),
            'labels': torch.tensor(label, dtype=torch.long)
        }
