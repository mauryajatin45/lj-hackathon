"""
Document preprocessing utilities for the verification workflow.
Handles both PDF and image preprocessing with OCR, grayscale conversion, dynamic thresholding.
"""

import logging
import base64
from typing import Dict, Any, Optional
import os
import io
from PIL import Image, ImageFilter, ImageEnhance
import numpy as np
import cv2
import pytesseract
from pdf2image import convert_from_bytes
import requests

# try to load .env if python-dotenv is available
try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

logger = logging.getLogger(__name__)

def preprocess_image_for_ocr(image_bytes: bytes) -> Image.Image:
    """
    Apply preprocessing steps to image for better OCR results:
    1. Convert to grayscale
    2. Apply dynamic thresholding
    3. Enhance contrast
    4. Apply noise reduction
    """
    try:
        # Convert bytes to PIL Image
        image = Image.open(io.BytesIO(image_bytes))

        # Convert to grayscale
        if image.mode != 'L':
            image = image.convert('L')

        # Convert to numpy array for OpenCV processing
        img_array = np.array(image)

        # Apply Gaussian blur to reduce noise
        img_array = cv2.GaussianBlur(img_array, (5, 5), 0)

        # Apply dynamic thresholding using Otsu's method
        _, thresholded = cv2.threshold(img_array, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        # Convert back to PIL Image
        processed_image = Image.fromarray(thresholded)

        # Enhance contrast
        enhancer = ImageEnhance.Contrast(processed_image)
        processed_image = enhancer.enhance(2.0)

        # Apply sharpening filter
        processed_image = processed_image.filter(ImageFilter.UnsharpMask(radius=1, percent=150, threshold=3))

        logger.info("Image preprocessing completed: grayscale, thresholding, contrast enhancement")
        return processed_image

    except Exception as e:
        logger.error(f"Image preprocessing failed: {e}")
        # Return original image if preprocessing fails
        return Image.open(io.BytesIO(image_bytes))

def extract_text_with_tesseract(image: Image.Image) -> str:
    """
    Extract text from preprocessed image using Tesseract OCR.
    """
    try:
        # Configure Tesseract for better accuracy
        custom_config = r'--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz .,-:;()[]{}'

        # Extract text
        text = pytesseract.image_to_string(image, config=custom_config, lang='eng')

        logger.info(f"Tesseract OCR completed: extracted {len(text)} characters")
        return text.strip()

    except Exception as e:
        logger.error(f"Tesseract OCR failed: {e}")
        return ""

def extract_text_from_image_local(image_bytes: bytes) -> Dict[str, Any]:
    """
    Extract text from image using local OCR processing with preprocessing.
    """
    try:
        # Preprocess image for OCR
        processed_image = preprocess_image_for_ocr(image_bytes)

        # Extract text
        extracted_text = extract_text_with_tesseract(processed_image)

        # Calculate confidence (simplified)
        confidence = min(0.95, len(extracted_text) / 1000) if extracted_text else 0.1

        return {
            "pages": [extracted_text],
            "confidence": confidence,
            "document_type": "scanned_document",
            "language": "en",
            "detected_fields": {},
            "text": extracted_text
        }

    except Exception as e:
        logger.error(f"Local image OCR failed: {e}")
        return {
            "pages": [""],
            "confidence": 0.0,
            "document_type": "unknown",
            "language": "en",
            "detected_fields": {},
            "text": ""
        }

def extract_text_from_pdf_local(pdf_bytes: bytes) -> Dict[str, Any]:
    """
    Extract text from PDF using local processing:
    1. Convert PDF pages to images
    2. Apply OCR preprocessing to each page
    3. Extract text from each page
    """
    try:
        # Convert PDF to images
        # Added poppler_path parameter to specify poppler binaries location if needed
        poppler_path = os.getenv("POPPLER_PATH", None)
        if poppler_path:
            images = convert_from_bytes(pdf_bytes, dpi=300, fmt='PIL', poppler_path=poppler_path)
        else:
            images = convert_from_bytes(pdf_bytes, dpi=300, fmt='PIL')

        extracted_pages = []
        total_confidence = 0.0

        for i, image in enumerate(images):
            logger.info(f"Processing PDF page {i+1}/{len(images)}")

            # Preprocess image for OCR
            img_byte_arr = io.BytesIO()
            image.save(img_byte_arr, format='PNG')
            processed_image = preprocess_image_for_ocr(img_byte_arr.getvalue())

            # Extract text
            page_text = extract_text_with_tesseract(processed_image)
            extracted_pages.append(page_text)

            # Calculate page confidence
            page_confidence = min(0.95, len(page_text) / 1000) if page_text else 0.1
            total_confidence += page_confidence

        # Average confidence across all pages
        avg_confidence = total_confidence / len(images) if images else 0.0

        combined_text = "\n\n".join(extracted_pages)

        return {
            "pages": extracted_pages,
            "confidence": avg_confidence,
            "document_type": "pdf_document",
            "language": "en",
            "detected_fields": {},
            "text": combined_text
        }

    except Exception as e:
        logger.error(f"Local PDF OCR failed: {e}")
        # Return fallback result instead of empty result
        return {
            "pages": ["PDF content extraction failed - poppler not available"],
            "confidence": 0.1,
            "document_type": "pdf_document",
            "language": "en",
            "detected_fields": {},
            "text": "PDF content extraction failed - poppler not available. Please install poppler or use OCR.space API."
        }

# OCR.space API fallback functions
OCR_SPACE_API_URL = "https://api.ocr.space/parse/image"
OCR_SPACE_API_KEY = os.getenv("OCR_SPACE_API_KEY") 

def _call_ocr_space(file_bytes: bytes, filename: Optional[str] = None, is_pdf: bool = False) -> Dict[str, Any]:
    """
    Call OCR.space API as fallback when local OCR fails.
    """
    if not OCR_SPACE_API_KEY:
        logger.warning("OCR_SPACE_API_KEY not set, skipping OCR.space API call")
        # Return fallback result instead of raising error
        return {
            "pages": ["OCR.space API not configured - API key missing"],
            "confidence": 0.1,
            "document_type": "pdf_document" if is_pdf else "image_document",
            "language": "en",
            "detected_fields": {},
            "text": "OCR.space API not configured - API key missing. Document will be processed without OCR."
        }

    # prepare multipart upload
    fname = filename or ("document.pdf" if is_pdf else "image.jpg")
    files = {"file": (fname, file_bytes)}

    data = {
        "apikey": OCR_SPACE_API_KEY,
        "language": "eng",
        "isOverlayRequired": False,
    }
    if is_pdf:
        data["filetype"] = "PDF"

    try:
        resp = requests.post(OCR_SPACE_API_URL, files=files, data=data, timeout=120)
        resp.raise_for_status()
        result = resp.json()

        # Check for processing errors
        if result.get("IsErroredOnProcessing"):
            err = result.get("ErrorMessage") or result.get("ErrorDetails") or "Unknown OCR error"
            if isinstance(err, list):
                err = "; ".join(str(e) for e in err)
            raise RuntimeError(f"OCR.space error: {err}")

        parsed_results = result.get("ParsedResults", []) or []

        pages = []
        for pr in parsed_results:
            text = pr.get("ParsedText", "") or ""
            pages.append(text)

        if not pages:
            pages = [""]

        confidence = 0.9

        return {
            "pages": pages,
            "confidence": confidence,
            "document_type": "unknown",
            "language": "en",
            "detected_fields": {},
            "text": "\n\n".join(pages)
        }
    except Exception as e:
        logger.error(f"OCR.space API call failed: {e}")
        # Return fallback result on API failure
        return {
            "pages": ["OCR.space API call failed"],
            "confidence": 0.1,
            "document_type": "pdf_document" if is_pdf else "image_document",
            "language": "en",
            "detected_fields": {},
            "text": "OCR.space API call failed. Document will be processed without OCR."
        }

def extract_text_from_pdf(file_bytes: bytes) -> Dict[str, Any]:
    """
    Extract text from PDF using local OCR with OCR.space fallback.
    """
    try:
        # Try local OCR first
        result = extract_text_from_pdf_local(file_bytes)
        if result.get("text") and result.get("text") != "PDF content extraction failed - poppler not available. Please install poppler or use OCR.space API.":
            logger.info("PDF text extraction successful using local OCR")
            return result
        else:
            logger.warning("Local PDF OCR failed, trying OCR.space fallback")
            return _call_ocr_space(file_bytes, filename="document.pdf", is_pdf=True)
    except Exception as e:
        logger.warning(f"Local PDF OCR failed ({e}), trying OCR.space fallback")
        try:
            return _call_ocr_space(file_bytes, filename="document.pdf", is_pdf=True)
        except Exception as fallback_error:
            logger.error(f"Both local and OCR.space PDF processing failed: {fallback_error}")
            # Return meaningful fallback when both OCR methods fail
            return {
                "pages": ["OCR not available - both local OCR and OCR.space API failed"],
                "confidence": 0.1,
                "document_type": "pdf_document",
                "language": "en",
                "detected_fields": {},
                "text": "OCR not available - both local OCR and OCR.space API failed. Document will be processed without text extraction."
            }

def extract_text_from_image(file_bytes: bytes) -> Dict[str, Any]:
    """
    Extract text from image using local OCR with OCR.space fallback.
    """
    try:
        # Try local OCR first
        result = extract_text_from_image_local(file_bytes)
        if result.get("text"):
            logger.info("Image text extraction successful using local OCR")
            return result
        else:
            logger.warning("Local image OCR failed, trying OCR.space fallback")
            return _call_ocr_space(file_bytes, filename="image.jpg", is_pdf=False)
    except Exception as e:
        logger.warning(f"Local image OCR failed ({e}), trying OCR.space fallback")
        try:
            return _call_ocr_space(file_bytes, filename="image.jpg", is_pdf=False)
        except Exception as fallback_error:
            logger.error(f"Both local and OCR.space image processing failed: {fallback_error}")
            return {
                "pages": [""],
                "confidence": 0.0,
                "document_type": "unknown",
                "language": "en",
                "detected_fields": {},
                "text": ""
            }

def preprocess_document(file_bytes: bytes, filename: str, doc_title: str, doc_issuer: Optional[str] = None) -> Dict[str, Any]:
    """
    Preprocess PDF document: extract text using OCR and prepare data for verification API.
    """
    try:
        # Extract text from PDF
        ocr_result = extract_text_from_pdf(file_bytes)

        # Build page data for verification API - include base64 PDF bytes
        pages = []
        for i, page_text in enumerate(ocr_result.get("pages", [])):
            pages.append({
                "pdf_bytes": base64.b64encode(file_bytes).decode("utf-8"),  # Base64 encoded PDF
                "text": page_text,
                "page_number": i + 1,
                "confidence": ocr_result.get("confidence", 0.0)
            })

        # Build document metadata
        doc_meta = {
            "title": doc_title,
            "filename": filename,
            "document_type": "pdf",
            "issuer": doc_issuer,
            "language": ocr_result.get("language", "en"),
            "total_pages": len(pages)
        }

        return {
            "INPUT_TYPE": "pdf",
            "PAGES": pages,
            "DOC_META": doc_meta,
            "EXTERNAL_REFERENCES": {},
            "PARSING_HINTS": {
                "extract_fields": True,
                "detect_tables": False,
                "language": ocr_result.get("language", "en")
            },
            "meta": {
                "ocr_confidence": ocr_result.get("confidence", 0.0),
                "processing_method": "local_ocr_with_fallback"
            }
        }

    except Exception as e:
        logger.error(f"PDF preprocessing failed: {e}")
        return {
            "INPUT_TYPE": "pdf",
            "PAGES": [{"pdf_bytes": base64.b64encode(file_bytes).decode("utf-8"), "text": "", "page_number": 1, "confidence": 0.0}],
            "DOC_META": {
                "title": doc_title,
                "filename": filename,
                "document_type": "pdf",
                "issuer": doc_issuer,
                "language": "en",
                "total_pages": 1
            },
            "EXTERNAL_REFERENCES": {},
            "PARSING_HINTS": {"extract_fields": True, "detect_tables": False, "language": "en"},
            "meta": {"ocr_confidence": 0.0, "processing_method": "failed"}
        }

def preprocess_image(image_bytes: bytes, filename: str, doc_title: str, doc_issuer: Optional[str] = None) -> Dict[str, Any]:
    """
    Preprocess image document: extract text using OCR and prepare data for verification API.
    """
    try:
        # Extract text from image
        ocr_result = extract_text_from_image(image_bytes)

        # Build page data for verification API - include base64 image bytes
        pages = []
        for i, page_text in enumerate(ocr_result.get("pages", [])):
            pages.append({
                "image_bytes": base64.b64encode(image_bytes).decode("utf-8"),  # Base64 encoded image
                "text": page_text,
                "page_number": i + 1,
                "confidence": ocr_result.get("confidence", 0.0)
            })

        # Build document metadata
        doc_meta = {
            "title": doc_title,
            "filename": filename,
            "document_type": "image",
            "issuer": doc_issuer,
            "language": ocr_result.get("language", "en"),
            "total_pages": len(pages)
        }

        return {
            "INPUT_TYPE": "images",
            "PAGES": pages,
            "DOC_META": doc_meta,
            "EXTERNAL_REFERENCES": {},
            "PARSING_HINTS": {
                "extract_fields": True,
                "detect_tables": False,
                "language": ocr_result.get("language", "en")
            },
            "meta": {
                "ocr_confidence": ocr_result.get("confidence", 0.0),
                "processing_method": "local_ocr_with_fallback"
            }
        }

    except Exception as e:
        logger.error(f"Image preprocessing failed: {e}")
        return {
            "INPUT_TYPE": "images",
            "PAGES": [{"image_bytes": base64.b64encode(image_bytes).decode("utf-8"), "text": "", "page_number": 1, "confidence": 0.0}],
            "DOC_META": {
                "title": doc_title,
                "filename": filename,
                "document_type": "image",
                "issuer": doc_issuer,
                "language": "en",
                "total_pages": 1
            },
            "EXTERNAL_REFERENCES": {},
            "PARSING_HINTS": {"extract_fields": True, "detect_tables": False, "language": "en"},
            "meta": {"ocr_confidence": 0.0, "processing_method": "failed"}
        }
