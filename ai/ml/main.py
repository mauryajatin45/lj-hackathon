from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import asyncio
from utils.downloader import download_image
from utils.preprocess import preprocess_image
from core.inference import run_inference
from utils.postprocess import postprocess_predictions

app = FastAPI(title="ML Inference API", description="API for ML model inference on images", version="1.0.0")

class ProcessRequest(BaseModel):
    image_url: str

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.post("/process")
async def process_image(request: ProcessRequest):
    try:
        # Download image
        image_bytes = await download_image(request.image_url)

        # Preprocess image
        preprocessed_image = preprocess_image(image_bytes)

        # Run inference
        raw_predictions = run_inference(preprocessed_image)

        # Postprocess predictions
        response = postprocess_predictions(raw_predictions)

        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
