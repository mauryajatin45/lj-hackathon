"""
FastAPI microservice for text scam detection.

Endpoint: POST /predict/text
Input: {"text": "string"}
Output: {"risk": float, "highlights": [...], "top_tokens": [...]}
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import logging
from text_svc.infer import TextScamDetector

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Text Scam Detection API", description="API for detecting scam in text", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PredictRequest(BaseModel):
    text: str

class PredictResponse(BaseModel):
    risk: float
    highlights: list[dict]
    top_tokens: list[str]

# Global detector instance
detector = None

@app.on_event("startup")
async def startup_event():
    global detector
    try:
        detector = TextScamDetector("models/text/model", "rules/text_keywords.yaml")
        logger.info("Text scam detector loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load detector: {e}")
        raise

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.post("/predict/text", response_model=PredictResponse)
async def predict_text(request: PredictRequest):
    if detector is None:
        raise HTTPException(status_code=503, detail="Service not ready")

    try:
        result = detector.predict(request.text)
        return PredictResponse(**result)
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail="Prediction failed")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
