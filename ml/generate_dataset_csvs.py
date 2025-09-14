import os
import csv
import random

def generate_la_csv(dataset_dir: str, output_train_csv: str, output_val_csv: str, val_ratio: float = 0.2):
    """
    Generate train and validation CSV files from the LA dataset directory.
    Assumes LA dataset structure with 'ASVspoof2019_LA_train' and 'ASVspoof2019_LA_dev' folders.
    """
    audio_files = []

    # Process training data
    train_dir = os.path.join(dataset_dir, "LA", "ASVspoof2019_LA_train", "flac")
    if os.path.exists(train_dir):
        for root, _, files in os.walk(train_dir):
            for file in files:
                if file.endswith('.flac'):
                    path = os.path.join(root, file)
                    # Label from filename: bonafide = 0, spoof = 1
                    label = 0 if 'bonafide' in file.lower() else 1
                    audio_files.append((path, label))

    # Process dev data
    dev_dir = os.path.join(dataset_dir, "LA", "ASVspoof2019_LA_dev", "flac")
    if os.path.exists(dev_dir):
        for root, _, files in os.walk(dev_dir):
            for file in files:
                if file.endswith('.flac'):
                    path = os.path.join(root, file)
                    label = 0 if 'bonafide' in file.lower() else 1
                    audio_files.append((path, label))

    if not audio_files:
        print(f"No audio files found in {dataset_dir}")
        return

    # Shuffle and split
    random.shuffle(audio_files)
    split_idx = int(len(audio_files) * (1 - val_ratio))
    train_files = audio_files[:split_idx]
    val_files = audio_files[split_idx:]

    # Write CSVs
    with open(output_train_csv, 'w', newline='') as f:
        writer = csv.writer(f)
        for path, label in train_files:
            writer.writerow([path, label])

    with open(output_val_csv, 'w', newline='') as f:
        writer = csv.writer(f)
        for path, label in val_files:
            writer.writerow([path, label])

    print(f"Generated {output_train_csv} with {len(train_files)} entries")
    print(f"Generated {output_val_csv} with {len(val_files)} entries")

def generate_ffpp_csv(dataset_dir: str, output_train_csv: str, output_val_csv: str, val_ratio: float = 0.2):
    """
    Generate train and validation CSV files from FF++ dataset.
    """
    video_files = []

    # Assuming FF++ structure
    ffpp_dir = os.path.join(dataset_dir, "faceforensics_data")
    if os.path.exists(ffpp_dir):
        for root, dirs, files in os.walk(ffpp_dir):
            for file in files:
                if file.endswith(('.mp4', '.avi')):
                    path = os.path.join(root, file)
                    # Label based on folder: original = 0, manipulated = 1
                    folder_name = os.path.basename(root)
                    label = 0 if 'original' in folder_name.lower() else 1
                    video_files.append((path, label))

    if not video_files:
        print(f"No video files found in {dataset_dir}")
        return

    # Shuffle and split
    random.shuffle(video_files)
    split_idx = int(len(video_files) * (1 - val_ratio))
    train_files = video_files[:split_idx]
    val_files = video_files[split_idx:]

    # Write CSVs
    with open(output_train_csv, 'w', newline='') as f:
        writer = csv.writer(f)
        for path, label in train_files:
            writer.writerow([path, label])

    with open(output_val_csv, 'w', newline='') as f:
        writer = csv.writer(f)
        for path, label in val_files:
            writer.writerow([path, label])

    print(f"Generated {output_train_csv} with {len(train_files)} entries")
    print(f"Generated {output_val_csv} with {len(val_files)} entries")

if __name__ == "__main__":
    data_dir = "data"

    # Generate audio CSVs
    generate_la_csv(data_dir, "audio_train.csv", "audio_val.csv")

    # Generate video CSVs
    generate_ffpp_csv(data_dir, "video_train.csv", "video_val.csv")

    print("Dataset CSV generation complete!")
