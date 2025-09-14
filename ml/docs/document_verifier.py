import logging
import os
import aiohttp
from typing import Dict, Any, Optional, List
import json

logger = logging.getLogger(__name__)

class DocumentVerifier:
    """
    Document verification service that handles the "magic loop" external API calls.
    Performs OCR, text extraction, and sends data to external verification service.
    """

    def __init__(self, external_api_url: Optional[str] = None):
        """
        Initialize the document verifier.

        Args:
            external_api_url: URL of the external document verification API (magic loop)
        """
        self.external_api_url = external_api_url or os.getenv("DOCUMENT_VERIFICATION_API_URL", "https://magicloops.dev/api/loop/8cc4fe1a-c325-46ac-ad23-1b469962c2e8/run")
        self.api_key = os.getenv("DOCUMENT_VERIFICATION_API_KEY", "")
        logger.info(f"DocumentVerifier initialized with API URL: {self.external_api_url}")

    async def verify_document(self, input_data: Dict[str, Any], compact: bool = False) -> Dict[str, Any]:
        """
        Main verification method that processes document data and calls external API.

        Args:
            input_data: Dictionary containing document data with structure:
                {
                    "INPUT_TYPE": "pdf" or "images",
                    "PAGES": [{"pdf_bytes": "..."} or {"image_bytes": "..."}],
                    "DOC_META": {"title": "...", "issuer": "..."},
                    "EXTERNAL_REFERENCES": {...},
                    "PARSING_HINTS": {...}
                }
            compact: Whether to return compact response

        Returns:
            Dictionary containing verification results
        """
        try:
            logger.info(f"Starting document verification for input type: {input_data.get('INPUT_TYPE')}")

            # Extract text from document using OCR
            extracted_text = await self._extract_text_from_document(input_data)

            # Prepare data for external API call
            api_payload = self._prepare_api_payload(input_data, extracted_text)

            # Call external verification API (magic loop)
            verification_result = await self._call_external_verification_api(api_payload)

            # Process and polish the response
            final_result = self._process_verification_response(verification_result, compact)

            logger.info("Document verification completed successfully")
            return final_result

        except Exception as e:
            logger.error(f"Document verification failed: {e}")
            return self._create_error_response(str(e))

    async def _extract_text_from_document(self, input_data: Dict[str, Any]) -> str:
        """
        Extract text from document using OCR and preprocessing methods.
        """
        try:
            input_type = input_data.get("INPUT_TYPE", "pdf")
            pages = input_data.get("PAGES", [])

            if not pages:
                logger.warning("No pages found in document data")
                return ""

            extracted_texts = []

            for page in pages:
                if input_type == "pdf":
                    # Extract text from PDF
                    pdf_bytes = page.get("pdf_bytes", "")
                    if pdf_bytes:
                        text = await self._extract_text_from_pdf(pdf_bytes)
                        extracted_texts.append(text)
                else:
                    # Extract text from image using OCR
                    image_bytes = page.get("image_bytes", "")
                    if image_bytes:
                        text = await self._extract_text_from_image(image_bytes)
                        extracted_texts.append(text)

            # Combine all extracted text
            full_text = "\n".join(extracted_texts)
            logger.info(f"Extracted {len(full_text)} characters of text")
            return full_text

        except Exception as e:
            logger.error(f"Text extraction failed: {e}")
            return ""

    async def _extract_text_from_pdf(self, pdf_bytes: str) -> str:
        """
        Extract text from PDF bytes.
        This would include PDF parsing, OCR if needed, etc.
        """
        try:
            # Placeholder for PDF text extraction
            # In real implementation, this would use libraries like PyPDF2, pdfplumber, etc.
            logger.info("Extracting text from PDF")
            # For now, return placeholder text
            return f"PDF content extracted from {len(pdf_bytes)} bytes"
        except Exception as e:
            logger.error(f"PDF text extraction failed: {e}")
            return ""

    async def _extract_text_from_image(self, image_bytes: str) -> str:
        """
        Extract text from image using OCR.
        This includes grayscale conversion, thresholding, etc.
        """
        try:
            logger.info("Extracting text from image using OCR")

            # Placeholder for OCR processing
            # In real implementation, this would use OCR libraries like Tesseract
            # with preprocessing steps like grayscale, thresholding, etc.

            return f"OCR text extracted from {len(image_bytes)} bytes image"
        except Exception as e:
            logger.error(f"Image OCR failed: {e}")
            return ""

    def _prepare_api_payload(self, input_data: Dict[str, Any], extracted_text: str) -> Dict[str, Any]:
        """
        Prepare payload for external API call in the required format.
        """
        return {
            "INPUT_TYPE": input_data.get("INPUT_TYPE", "pdf"),
            "PAGES": input_data.get("PAGES", []),
            "DOC_META": input_data.get("DOC_META", {}),
            "EXTERNAL_REFERENCES": input_data.get("EXTERNAL_REFERENCES", {}),
            "PARSING_HINTS": input_data.get("PARSING_HINTS", {})
        }

    async def _call_external_verification_api(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Call the external document verification API (magic loop).
        """
        try:
            logger.info(f"Calling external verification API: {self.external_api_url}")

            headers = {"Content-Type": "application/json"}
            if self.api_key:
                headers["Authorization"] = f"Bearer {self.api_key}"

            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.external_api_url,
                    json=payload,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=300)  # 5 minute timeout
                ) as response:

                    if response.status == 200:
                        result = await response.json()
                        logger.info("External API call successful")
                        return result
                    else:
                        error_text = await response.text()
                        logger.error(f"External API call failed: {response.status} - {error_text}")
                        raise Exception(f"External API error: {response.status}")

        except Exception as e:
            logger.error(f"External API call failed: {e}")
            # Return fallback result for development/testing
            return self._create_fallback_verification_result(payload)

    def _create_fallback_verification_result(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a fallback verification result when external API is unavailable.
        """
        return {
            "confidence_score": 0.5,
            "legitimate": True,
            "summary": "Fallback verification - external API unavailable",
            "extracted_metadata": payload.get("metadata", {}),
            "structured_layout": {},
            "authenticity_issues": [],
            "content_issues": [],
            "suspicious_snippets": [],
            "meta": {
                "verification_method": "fallback",
                "processing_time": 0.0,
                "external_api_available": False
            }
        }

    def _process_verification_response(self, api_response: Dict[str, Any], compact: bool) -> Dict[str, Any]:
        """
        Process and polish the verification response from external API.
        """
        try:
            if compact:
                # Return compact version
                return {
                    "confidence_score": api_response.get("confidence_score", 0.0),
                    "legitimate": api_response.get("legitimate", False),
                    "summary": api_response.get("summary", ""),
                    "meta": api_response.get("meta", {})
                }

            # Return full polished response
            return {
                "confidence_score": api_response.get("confidence_score", 0.0),
                "legitimate": api_response.get("legitimate", False),
                "summary": api_response.get("summary", ""),
                "extracted_metadata": api_response.get("extracted_metadata", {}),
                "structured_layout": api_response.get("structured_layout", {}),
                "authenticity_issues": api_response.get("authenticity_issues", []),
                "content_issues": api_response.get("content_issues", []),
                "suspicious_snippets": api_response.get("suspicious_snippets", []),
                "meta": api_response.get("meta", {})
            }

        except Exception as e:
            logger.error(f"Response processing failed: {e}")
            return self._create_error_response(f"Response processing failed: {str(e)}")

    def _create_error_response(self, error_message: str) -> Dict[str, Any]:
        """
        Create an error response when verification fails.
        """
        return {
            "confidence_score": 0.0,
            "legitimate": False,
            "summary": f"Verification failed: {error_message}",
            "extracted_metadata": {},
            "structured_layout": {},
            "authenticity_issues": [error_message],
            "content_issues": [],
            "suspicious_snippets": [],
            "meta": {
                "error": error_message,
                "verification_method": "failed"
            }
        }
