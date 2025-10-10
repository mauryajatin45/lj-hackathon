from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional, Union
import logging
from docs.document_verifier import DocumentVerifier  # Assuming this is your document verification class

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI instance
app = FastAPI()

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins; change as per security needs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for incoming request and response

class PageData(BaseModel):
    pdf_bytes: Optional[str] = None  # Base64 encoded PDF content as a string
    image_bytes: Optional[str] = None  # Base64 encoded image content as a string

class DocMeta(BaseModel):
    title: str  # Title of the document
    issuer: Optional[str] = None  # Issuer of the document (optional)

class ExternalReferences(BaseModel):
    domainReputation: str = "unknown"  # Reputation of the domain (default to unknown)

class ParsingHints(BaseModel):
    expected_fields: Dict[str, str] = {}  # Fields expected to be extracted from the document

class VerifyRequest(BaseModel):
    INPUT_TYPE: str = "pdf"  # Type of the input (PDF is default)
    PAGES: List[PageData]  # List of pages, each containing base64 PDF data
    DOC_META: DocMeta  # Metadata about the document
    EXTERNAL_REFERENCES: ExternalReferences = ExternalReferences()  # External reference data
    PARSING_HINTS: ParsingHints = ParsingHints()  # Parsing hints for field extraction

class VerifyResponse(BaseModel):
    confidence_score: float  # Overall confidence score for the verification
    legitimate: bool  # Whether the document is deemed legitimate
    summary: Optional[Union[str, Dict[str, Any]]] = None  # Summary of the verification process (optional)
    extracted_metadata: Optional[Dict[str, Any]] = None  # Extracted metadata from the document
    structured_layout: Optional[Dict[str, Any]] = None  # Structured data (e.g., fields, tables)
    authenticity_issues: Optional[List[str]] = None  # List of authenticity issues found
    content_issues: Optional[List[Dict[str, Any]]] = None  # Content validation issues found
    suspicious_snippets: Optional[List[str]] = None  # Suspicious snippets found in the document
    meta: Dict[str, Any]  # Meta information about the verification process

# Global verifier instance - initialize immediately
try:
    verifier = DocumentVerifier()  # Assuming you have a DocumentVerifier class
    logger.info("Document verifier loaded successfully")
except Exception as e:
    logger.error(f"Failed to load verifier: {e}")
    verifier = None

# Health check endpoint
@app.get("/health")
async def health():
    return {"status": "healthy"}

# Function to handle document verification
async def process_document_verification(
    request: VerifyRequest,
    compact: bool = Query(True, description="Return compact summary instead of full details")
):
    if verifier is None:
        raise HTTPException(status_code=503, detail="Service not ready")

    try:
        # Convert the request to a dictionary for the verifier to process
        input_data = request.model_dump()

        # If pages are empty or document_text is empty, try fallback extraction
        if not input_data.get("PAGES") or all(not page.get("pdf_bytes") and not page.get("image_bytes") for page in input_data.get("PAGES", [])):
            logger.warning("No page content found, attempting fallback extraction from DOC_META")
            # Attempt to extract text from DOC_META or other fields if possible
            # For example, if DOC_META has 'title', use it as a minimal text
            fallback_text = input_data.get("DOC_META", {}).get("title", "")
            if fallback_text:
                input_data["document_text"] = fallback_text
                input_data["PAGES"] = [{"pdf_bytes": ""}]  # Dummy page to avoid empty pages
            else:
                logger.error("Fallback extraction failed: no text available in DOC_META")
                raise HTTPException(status_code=503, detail="Service not ready")

        # Call the verify_document method on the verifier
        result = await verifier.verify_document(input_data, compact=compact)

        # Return only confidence_score and legitimate in the response
        return {
            "confidence_score": result.get("confidence_score", 0.0),
            "legitimate": result.get("legitimate", False)
        }

    except Exception as e:
        logger.error(f"Verification error: {e}")
        raise HTTPException(status_code=500, detail="Verification failed")

# Document verification endpoint
@app.post("/verify/document")
async def verify_document(
    request: VerifyRequest,
    compact: bool = Query(False, description="Return compact summary instead of full details")
):
    """
    POST body:
    {
      "INPUT_TYPE": "pdf",  # Default to pdf; can be 'images' if processing image files
      "PAGES": [{"pdf_bytes": "<base64_pdf_content>"}],  # List of base64 encoded PDFs
      "DOC_META": {"title": "Document Title", "issuer": "Issuer Name"},
      "EXTERNAL_REFERENCES": {"domainReputation": "good"},
      "PARSING_HINTS": {
        "expected_fields": {
          "agreement_no": "AGR-\\d{5}",
          "effective_date": "\\d{2}-\\d{2}-\\d{4}"
        }
      }
    }
    Returns the result of document verification (legitimate, confidence score, issues).
    """
    # Call the function to process document verification
    return await process_document_verification(request, compact=compact)
