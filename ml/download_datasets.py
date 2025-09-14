import os
import subprocess
import zipfile
import tarfile
import requests
from tqdm import tqdm

def download_file(url, dest_path):
    """Download file with progress bar."""
    response = requests.get(url, stream=True)
    total_size = int(response.headers.get('content-length', 0))

    with open(dest_path, 'wb') as file, tqdm(
        desc=os.path.basename(dest_path),
        total=total_size,
        unit='iB',
        unit_scale=True,
        unit_divisor=1024,
    ) as bar:
        for data in response.iter_content(chunk_size=1024):
            size = file.write(data)
            bar.update(size)

def extract_archive(archive_path, extract_to):
    """Extract zip or tar.gz archives."""
    if archive_path.endswith('.zip'):
        with zipfile.ZipFile(archive_path, 'r') as zip_ref:
            zip_ref.extractall(extract_to)
    elif archive_path.endswith('.tar.gz') or archive_path.endswith('.tgz'):
        with tarfile.open(archive_path, 'r:gz') as tar_ref:
            tar_ref.extractall(extract_to)

def download_audio_dataset():
    """Download LA dataset for audio deepfake detection."""
    print("Downloading LA audio dataset...")
    url = "https://datashare.ed.ac.uk/bitstream/handle/10283/3336/LA.zip?sequence=3&isAllowed=y"
    zip_path = "LA.zip"
    extract_to = "data/audio"

    if not os.path.exists(extract_to):
        os.makedirs(extract_to, exist_ok=True)

    if not os.path.exists(zip_path):
        download_file(url, zip_path)

    if not os.path.exists(os.path.join(extract_to, "LA")):
        print("Extracting LA dataset...")
        extract_archive(zip_path, extract_to)

    print("LA audio dataset ready.")

def download_video_dataset():
    """Download FF++ dataset for video deepfake detection (subset for faster training)."""
    print("Downloading FF++ video dataset subset...")
    # Using a smaller subset for faster training
    url = "https://github.com/ondyari/FaceForensics/releases/download/v1.0/faceforensics_data.zip"
    zip_path = "faceforensics_data.zip"
    extract_to = "data/video"

    if not os.path.exists(extract_to):
        os.makedirs(extract_to, exist_ok=True)

    if not os.path.exists(zip_path):
        download_file(url, zip_path)

    if not os.path.exists(os.path.join(extract_to, "faceforensics_data")):
        print("Extracting FF++ dataset...")
        extract_archive(zip_path, extract_to)

    print("FF++ video dataset ready.")

def main():
    print("Starting dataset downloads...")

    # Create data directory
    os.makedirs("data", exist_ok=True)

    try:
        download_audio_dataset()
        download_video_dataset()
        print("All datasets downloaded and extracted successfully!")
    except Exception as e:
        print(f"Error during download: {e}")
        print("You may need to download datasets manually or check your internet connection.")

if __name__ == "__main__":
    main()
