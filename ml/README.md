# ML Inference API

This is a FastAPI-based ML inference service providing endpoints for spam detection, deepfake detection (audio and video), and document verification.

## Features

- **Spam Detection**: Classify text as spam or not using a transformer model.
- **Deepfake Detection**: Detect fake audio and video using specialized models.
- **Document Verification**: Process and verify documents (PDFs and images) for authenticity.

## Setup

1. Clone the repository.
2. Install dependencies: `pip install -r requirements.txt`
3. Run the server: `uvicorn main:app --reload`

## Usage

- Health check: GET /health
- Spam detection: POST /detect_spam with JSON {"text": "your text"}
- Deepfake audio: POST /df/detect_deepfake_audio with file upload
- Deepfake video: POST /df/detect_deepfake_video with file upload
- Document processing: POST /process_document with file_url

## License

See LICENSE file.
