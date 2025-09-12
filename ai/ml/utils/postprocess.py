import torch
import json

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
