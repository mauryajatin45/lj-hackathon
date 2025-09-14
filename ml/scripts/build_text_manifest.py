"""
Script to build text manifest for scam detection training.

Downloads or loads datasets, normalizes labels, deduplicates, and creates train/val/test splits.
Outputs text_manifest.csv with columns: text, label, source, split
"""

import os
import pandas as pd
import requests
import zipfile
import tarfile
from sklearn.model_selection import train_test_split
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DATA_DIR = "data/text"
MANIFEST_PATH = "data/text_manifest.csv"

os.makedirs(DATA_DIR, exist_ok=True)

def download_file(url, dest_path):
    """Download file from URL."""
    logger.info(f"Downloading {url} to {dest_path}")
    response = requests.get(url)
    response.raise_for_status()
    with open(dest_path, 'wb') as f:
        f.write(response.content)

def extract_zip(zip_path, extract_to):
    """Extract ZIP file."""
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(extract_to)

def extract_tar(tar_path, extract_to):
    """Extract TAR file."""
    with tarfile.open(tar_path, 'r:gz') as tar_ref:
        tar_ref.extractall(extract_to)

def load_sms_spam():
    """Load SMS Spam Collection dataset."""
    url = "https://archive.ics.uci.edu/ml/machine-learning-databases/00228/smsspamcollection.zip"
    zip_path = os.path.join(DATA_DIR, "smsspamcollection.zip")
    extract_to = os.path.join(DATA_DIR, "smsspam")

    if not os.path.exists(extract_to):
        download_file(url, zip_path)
        extract_zip(zip_path, extract_to)

    # Load the data
    file_path = os.path.join(extract_to, "SMSSpamCollection")
    df = pd.read_csv(file_path, sep='\t', header=None, names=['label', 'text'])
    df['label'] = df['label'].map({'ham': 0, 'spam': 1})
    df['source'] = 'sms_spam'
    return df

def load_enron_ham():
    """Load Enron ham subset (simplified, using a small sample)."""
    # For demo, create synthetic ham emails
    ham_texts = [
        "Meeting scheduled for tomorrow at 10 AM.",
        "Please find attached the quarterly report.",
        "Thank you for your email. I will review it.",
        "Reminder: Team lunch on Friday.",
        "Invoice attached for your reference."
    ] * 100  # Multiply for more data
    df = pd.DataFrame({'text': ham_texts, 'label': 0, 'source': 'enron_ham'})
    return df

def load_lingspam_ham():
    """Load LingSpam ham (simplified)."""
    ham_texts = [
        "This is a legitimate email about linguistics research.",
        "Conference announcement for NLP symposium.",
        "Paper submission deadline extended.",
        "Call for papers in computational linguistics."
    ] * 50
    df = pd.DataFrame({'text': ham_texts, 'label': 0, 'source': 'lingspam_ham'})
    return df

def load_phishing_emails():
    """Load phishing emails (synthetic for demo)."""
    scam_texts = [
        "Urgent: Your account will be suspended. Click here to verify.",
        "You've won a lottery! Claim your prize now.",
        "Bank alert: Unusual activity detected. Confirm identity.",
        "IRS notice: Tax refund pending. Provide details.",
        "Your package is delayed. Pay fee to expedite."
    ] * 100
    df = pd.DataFrame({'text': scam_texts, 'label': 1, 'source': 'phishing_emails'})
    return df

def load_goemotions():
    """Load GoEmotions for auxiliary features (simplified)."""
    # For demo, skip or add basic urgency detection
    return pd.DataFrame(columns=['text', 'label', 'source'])

def main():
    logger.info("Building text manifest...")

    # Load datasets
    dfs = []
    dfs.append(load_sms_spam())
    dfs.append(load_enron_ham())
    dfs.append(load_lingspam_ham())
    dfs.append(load_phishing_emails())
    # dfs.append(load_goemotions())  # Optional

    # Combine
    df = pd.concat(dfs, ignore_index=True)

    # Deduplicate
    df = df.drop_duplicates(subset=['text'])

    # Normalize text (basic)
    df['text'] = df['text'].str.lower().str.strip()

    # Stratified split
    train_df, temp_df = train_test_split(df, test_size=0.2, stratify=df['label'], random_state=42)
    val_df, test_df = train_test_split(temp_df, test_size=0.5, stratify=temp_df['label'], random_state=42)

    train_df['split'] = 'train'
    val_df['split'] = 'val'
    test_df['split'] = 'test'

    final_df = pd.concat([train_df, val_df, test_df])

    # Save manifest
    final_df.to_csv(MANIFEST_PATH, index=False)
    logger.info(f"Manifest saved to {MANIFEST_PATH} with {len(final_df)} samples")

if __name__ == "__main__":
    main()
