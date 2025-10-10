import os
import torch
import torchaudio
import torchvision.transforms as transforms
from torch.utils.data import Dataset, DataLoader
import librosa
import numpy as np
from PIL import Image
import cv2
import random
from sklearn.model_selection import train_test_split
import kagglehub
import zipfile
from pathlib import Path

class AudioDataset(Dataset):
    def __init__(self, audio_paths, labels, transform=None):
        self.audio_paths = audio_paths
        self.labels = labels
        self.transform = transform

    def __len__(self):
        return len(self.audio_paths)

    def __getitem__(self, idx):
        audio_path = self.audio_paths[idx]
        label = self.labels[idx]

        # Load audio
        waveform, sample_rate = torchaudio.load(audio_path)

        # Convert to mel-spectrogram
        mel_spec = torchaudio.transforms.MelSpectrogram(
            sample_rate=sample_rate,
            n_fft=1024,
            hop_length=512,
            n_mels=128
        )(waveform)

        # Convert to log scale
        mel_spec = torchaudio.transforms.AmplitudeToDB()(mel_spec)

        # Normalize
        mel_spec = (mel_spec - mel_spec.mean()) / (mel_spec.std() + 1e-9)

        if self.transform:
            mel_spec = self.transform(mel_spec)

        return {
            'input_values': mel_spec.squeeze(0),
            'labels': torch.tensor(label, dtype=torch.float)
        }

class VideoDataset(Dataset):
    def __init__(self, video_paths, labels, transform=None, num_frames=16):
        self.video_paths = video_paths
        self.labels = labels
        self.transform = transform
        self.num_frames = num_frames

    def __len__(self):
        return len(self.video_paths)

    def __getitem__(self, idx):
        video_path = self.video_paths[idx]
        label = self.labels[idx]

        # Load video
        cap = cv2.VideoCapture(video_path)
        frames = []
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        # Sample frames evenly
        frame_indices = np.linspace(0, total_frames-1, self.num_frames, dtype=int)

        for i in frame_indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, i)
            ret, frame = cap.read()
            if ret:
                frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                frame = Image.fromarray(frame)
                frames.append(frame)

        cap.release()

        # If not enough frames, duplicate last frame
        while len(frames) < self.num_frames:
            frames.append(frames[-1] if frames else Image.new('RGB', (224, 224)))

        # Apply transforms
        if self.transform:
            frames = [self.transform(frame) for frame in frames]

        # Stack frames
        video_tensor = torch.stack(frames, dim=1)  # [C, T, H, W]

        return {
            'pixel_values': video_tensor,
            'labels': torch.tensor(label, dtype=torch.float)
        }

def load_asvspoof2019(data_dir):
    """Load ASVspoof 2019 dataset"""
    # This is a placeholder - actual implementation would depend on dataset structure
    # Assume data_dir contains train/, dev/, eval/ subdirs with audio files and labels
    audio_paths = []
    labels = []

    for split in ['train', 'dev']:
        split_dir = os.path.join(data_dir, split)
        if os.path.exists(split_dir):
            for root, _, files in os.walk(split_dir):
                for file in files:
                    if file.endswith('.wav'):
                        audio_paths.append(os.path.join(root, file))
                        # Label: 0 for bona fide, 1 for spoof
                        labels.append(0 if 'bonafide' in root else 1)

    return audio_paths, labels

def load_dfdc(data_dir):
    """Load DFDC dataset"""
    # Placeholder for DFDC loading
    video_paths = []
    labels = []

    # Assume similar structure
    for root, _, files in os.walk(data_dir):
        for file in files:
            if file.endswith('.mp4'):
                video_paths.append(os.path.join(root, file))
                labels.append(0 if 'REAL' in root else 1)

    return video_paths, labels

def download_datasets(data_dir):
    """Download datasets using kagglehub or other methods"""
    os.makedirs(data_dir, exist_ok=True)

    # ASVspoof 2019
    try:
        asv_path = kagglehub.dataset_download("asvspoof/asv-spoof-2019-dataset")
        print(f"ASVspoof downloaded to: {asv_path}")
    except:
        print("ASVspoof download failed - please download manually")

    # DFDC - this might require manual download due to size
    print("DFDC dataset is large - please download manually from https://www.kaggle.com/c/deepfake-detection-challenge")

def get_data_loaders(data_dir, batch_size=16):
    """Create data loaders for training"""
    # Download datasets if needed
    download_datasets(data_dir)

    # Load audio data
    audio_paths, audio_labels = load_asvspoof2019(os.path.join(data_dir, 'asv-spoof-2019'))
    if audio_paths:
        audio_train_paths, audio_val_paths, audio_train_labels, audio_val_labels = train_test_split(
            audio_paths, audio_labels, test_size=0.2, random_state=42
        )

        audio_transform = transforms.Compose([
            transforms.Normalize(mean=[0.0], std=[1.0])
        ])

        audio_train_dataset = AudioDataset(audio_train_paths, audio_train_labels, audio_transform)
        audio_val_dataset = AudioDataset(audio_val_paths, audio_val_labels, audio_transform)

        audio_train_loader = DataLoader(audio_train_dataset, batch_size=batch_size, shuffle=True)
        audio_val_loader = DataLoader(audio_val_dataset, batch_size=batch_size, shuffle=False)
    else:
        audio_train_loader = audio_val_loader = None

    # Load video data
    video_paths, video_labels = load_dfdc(os.path.join(data_dir, 'dfdc'))
    if video_paths:
        video_train_paths, video_val_paths, video_train_labels, video_val_labels = train_test_split(
            video_paths, video_labels, test_size=0.2, random_state=42
        )

        video_transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

        video_train_dataset = VideoDataset(video_train_paths, video_train_labels, video_transform)
        video_val_dataset = VideoDataset(video_val_paths, video_val_labels, video_transform)

        video_train_loader = DataLoader(video_train_dataset, batch_size=batch_size, shuffle=True)
        video_val_loader = DataLoader(video_val_dataset, batch_size=batch_size, shuffle=False)
    else:
        video_train_loader = video_val_loader = None

    return {
        'audio_train': audio_train_loader,
        'audio_val': audio_val_loader,
        'video_train': video_train_loader,
        'video_val': video_val_loader
    }

# Augmentation functions
def add_noise(waveform, noise_factor=0.005):
    noise = torch.randn_like(waveform) * noise_factor
    return waveform + noise

def time_stretch(waveform, rate=1.1):
    return torchaudio.transforms.TimeStretch()(waveform.unsqueeze(0)).squeeze(0)

def codec_compression_audio(waveform, sample_rate):
    # Simulate codec compression by low-pass filtering
    from torchaudio.transforms import LowPassFilter
    lpf = LowPassFilter(sample_rate, cutoff_freq=8000)
    return lpf(waveform)

def augment_audio(mel_spec):
    """Apply random augmentations to mel-spectrogram"""
    if random.random() < 0.5:
        # Add noise in frequency domain
        noise = torch.randn_like(mel_spec) * 0.1
        mel_spec = mel_spec + noise

    if random.random() < 0.5:
        # Time masking
        mask = torch.ones_like(mel_spec)
        start = random.randint(0, mel_spec.shape[-1] - 10)
        mask[:, start:start+10] = 0
        mel_spec = mel_spec * mask

    return mel_spec

def augment_video(frames):
    """Apply random augmentations to video frames"""
    if random.random() < 0.5:
        # Random brightness
        frames = transforms.functional.adjust_brightness(frames, random.uniform(0.8, 1.2))

    if random.random() < 0.5:
        # Random contrast
        frames = transforms.functional.adjust_contrast(frames, random.uniform(0.8, 1.2))

    if random.random() < 0.5:
        # Frame skip simulation - remove some frames
        keep_indices = sorted(random.sample(range(frames.shape[1]), k=int(frames.shape[1] * 0.8)))
        frames = frames[:, keep_indices]

    return frames
