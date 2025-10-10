import sys
import pathlib
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
import os
import json
from sklearn.metrics import roc_auc_score, accuracy_score
import numpy as np

from models.text.deepfake import DeepFakeDetector
from data_preprocessing import get_data_loaders, augment_audio, augment_video
from core.adaptation import AdaptationEngine

def train_audio_model(model, train_loader, val_loader, epochs=10, save_path='models/audio_model.pth'):
    """Train audio-only model"""
    criterion = nn.BCEWithLogitsLoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=3e-5)

    best_auc = 0.0

    for epoch in range(epochs):
        model.train()
        train_loss = 0.0

        for batch in train_loader:
            optimizer.zero_grad()

            # Apply augmentations
            augmented_input = augment_audio(batch['input_values'])

            outputs = model.audio_branch(augmented_input)
            loss = criterion(outputs.squeeze(), batch['labels'])
            loss.backward()
            optimizer.step()

            train_loss += loss.item()

        # Validation
        model.eval()
        val_preds = []
        val_labels = []

        with torch.no_grad():
            for batch in val_loader:
                outputs = model.audio_branch(batch['input_values'])
                preds = torch.sigmoid(outputs.squeeze()).cpu().numpy()
                val_preds.extend(preds)
                val_labels.extend(batch['labels'].cpu().numpy())

        val_auc = roc_auc_score(val_labels, val_preds)
        val_acc = accuracy_score(val_labels, np.round(val_preds))

        print(f"Epoch {epoch+1}/{epochs}, Train Loss: {train_loss/len(train_loader):.4f}, Val AUC: {val_auc:.4f}, Val Acc: {val_acc:.4f}")

        if val_auc > best_auc:
            best_auc = val_auc
            torch.save(model.audio_branch.state_dict(), save_path)
            print(f"Saved best audio model with AUC: {best_auc:.4f}")

    return model

def train_video_model(model, train_loader, val_loader, epochs=10, save_path='models/video_model.pth'):
    """Train video-only model"""
    criterion = nn.BCEWithLogitsLoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=3e-5)

    best_auc = 0.0

    for epoch in range(epochs):
        model.train()
        train_loss = 0.0

        for batch in train_loader:
            optimizer.zero_grad()

            # Apply augmentations
            augmented_input = augment_video(batch['pixel_values'])

            outputs = model.video_branch(augmented_input)
            loss = criterion(outputs.squeeze(), batch['labels'])
            loss.backward()
            optimizer.step()

            train_loss += loss.item()

        # Validation
        model.eval()
        val_preds = []
        val_labels = []

        with torch.no_grad():
            for batch in val_loader:
                outputs = model.video_branch(batch['pixel_values'])
                preds = torch.sigmoid(outputs.squeeze()).cpu().numpy()
                val_preds.extend(preds)
                val_labels.extend(batch['labels'].cpu().numpy())

        val_auc = roc_auc_score(val_labels, val_preds)
        val_acc = accuracy_score(val_labels, np.round(val_preds))

        print(f"Epoch {epoch+1}/{epochs}, Train Loss: {train_loss/len(train_loader):.4f}, Val AUC: {val_auc:.4f}, Val Acc: {val_acc:.4f}")

        if val_auc > best_auc:
            best_auc = val_auc
            torch.save(model.video_branch.state_dict(), save_path)
            print(f"Saved best video model with AUC: {best_auc:.4f}")

    return model

def train_fusion_model(model, audio_train_loader, audio_val_loader, video_train_loader, video_val_loader, epochs=10, save_path='models/fusion_model.pth'):
    """Train fusion model"""
    criterion = nn.BCEWithLogitsLoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=3e-5)

    best_auc = 0.0

    for epoch in range(epochs):
        model.train()
        train_loss = 0.0

        # Combine audio and video batches
        audio_iter = iter(audio_train_loader) if audio_train_loader else None
        video_iter = iter(video_train_loader) if video_train_loader else None

        while True:
            audio_batch = next(audio_iter, None) if audio_iter else None
            video_batch = next(video_iter, None) if video_iter else None

            if audio_batch is None and video_batch is None:
                break

            optimizer.zero_grad()

            audio_input = audio_batch['input_values'] if audio_batch else None
            video_input = video_batch['pixel_values'] if video_batch else None
            labels = audio_batch['labels'] if audio_batch else video_batch['labels']

            # Apply augmentations
            if audio_input is not None:
                audio_input = augment_audio(audio_input)
            if video_input is not None:
                video_input = augment_video(video_input)

            outputs = model(audio_input=audio_input, video_input=video_input)
            loss = criterion(outputs.squeeze(), labels)
            loss.backward()
            optimizer.step()

            train_loss += loss.item()

        # Validation
        model.eval()
        val_preds = []
        val_labels = []

        audio_val_iter = iter(audio_val_loader) if audio_val_loader else None
        video_val_iter = iter(video_val_loader) if video_val_loader else None

        while True:
            audio_batch = next(audio_val_iter, None) if audio_val_iter else None
            video_batch = next(video_val_iter, None) if video_val_iter else None

            if audio_batch is None and video_batch is None:
                break

            audio_input = audio_batch['input_values'] if audio_batch else None
            video_input = video_batch['pixel_values'] if video_batch else None
            labels = audio_batch['labels'] if audio_batch else video_batch['labels']

            with torch.no_grad():
                outputs = model(audio_input=audio_input, video_input=video_input)
                preds = torch.sigmoid(outputs.squeeze()).cpu().numpy()
                val_preds.extend(preds)
                val_labels.extend(labels.cpu().numpy())

        val_auc = roc_auc_score(val_labels, val_preds)
        val_acc = accuracy_score(val_labels, np.round(val_preds))

        print(f"Epoch {epoch+1}/{epochs}, Train Loss: {train_loss:.4f}, Val AUC: {val_auc:.4f}, Val Acc: {val_acc:.4f}")

        if val_auc > best_auc:
            best_auc = val_auc
            torch.save(model.state_dict(), save_path)
            print(f"Saved best fusion model with AUC: {best_auc:.4f}")

    return model

def main():
    # Create models directory
    os.makedirs('models', exist_ok=True)

    # Load data
    data_loaders = get_data_loaders('data', batch_size=16)

    # Initialize model
    model = DeepFakeDetector(use_lora=True)

    # Train audio model
    if data_loaders['audio_train'] and data_loaders['audio_val']:
        print("Training audio model...")
        model = train_audio_model(model, data_loaders['audio_train'], data_loaders['audio_val'],
                                epochs=10, save_path='models/audio_model.pth')

    # Train video model
    if data_loaders['video_train'] and data_loaders['video_val']:
        print("Training video model...")
        model = train_video_model(model, data_loaders['video_train'], data_loaders['video_val'],
                                epochs=10, save_path='models/video_model.pth')

    # Train fusion model
    if (data_loaders['audio_train'] and data_loaders['video_train'] and
        data_loaders['audio_val'] and data_loaders['video_val']):
        print("Training fusion model...")
        model = train_fusion_model(model, data_loaders['audio_train'], data_loaders['audio_val'],
                                 data_loaders['video_train'], data_loaders['video_val'],
                                 epochs=10, save_path='models/fusion_model.pth')

    print("Training completed!")

if __name__ == "__main__":
    main()
