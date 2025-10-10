import torch
import json
from typing import Dict, Any, Optional

def postprocess_predictions(raw_predictions: torch.Tensor):
    """
    Converts raw predictions tensor to clean JSON response.
    Adds confidence, labels, metadata.
    """
    # For placeholder, assume raw_predictions is a tensor of shape (batch_size, num_classes)
    # We take softmax to get confidence scores
    probabilities = torch.nn.functional.softmax(raw_predictions, dim=1)
    confidences, predicted_indices = torch.max(probabilities, dim=1)

    # Dummy labels for example
    labels = [f"class_{i}" for i in range(raw_predictions.size(1))]

    results = []
    for i in range(raw_predictions.size(0)):
        result = {
            "label": labels[predicted_indices[i].item()],
            "confidence": confidences[i].item(),
            "metadata": {
                "raw_scores": raw_predictions[i].tolist()
            }
        }
        results.append(result)

    return {"predictions": results}

def postprocess_verification_result(
    verification_result: Dict[str, Any],
    original_filename: Optional[str] = None,
    file_type: Optional[str] = None,
    preprocessing_metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Postprocess document verification results for final API response.

    Args:
        verification_result: Raw verification result from document verifier
        original_filename: Original filename of the processed document
        file_type: Type of file processed (pdf/image)
        preprocessing_metadata: Metadata from preprocessing step

    Returns:
        Final processed result ready for API response
    """
    # Start with the verification result
    final_result = verification_result.copy()

    # Add file information
    if original_filename:
        final_result["filename"] = original_filename

    if file_type:
        final_result["file_type"] = file_type

    # Add preprocessing metadata if available
    if preprocessing_metadata:
        if "meta" not in final_result:
            final_result["meta"] = {}
        final_result["meta"]["preprocessing"] = preprocessing_metadata

    # Add processing summary
    if "confidence_score" in final_result:
        confidence = final_result["confidence_score"]
        if confidence >= 0.8:
            final_result["risk_level"] = "low"
            final_result["recommendation"] = "Document appears authentic"
        elif confidence >= 0.6:
            final_result["risk_level"] = "medium"
            final_result["recommendation"] = "Document requires additional verification"
        else:
            final_result["risk_level"] = "high"
            final_result["recommendation"] = "Document flagged for rejection"

    # Ensure meta field exists
    if "meta" not in final_result:
        final_result["meta"] = {}

    # Add processing timestamp if not present
    if "processing_timestamp" not in final_result.get("meta", {}):
        from datetime import datetime
        final_result["meta"]["processing_timestamp"] = datetime.now().isoformat()

    return final_result
