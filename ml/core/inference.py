import torch
import torch.nn as nn
import torchvision.models as models
from torchvision import transforms
import logging

logger = logging.getLogger(__name__)

# Global model instance
_model = None

def load_model():
    """
    Load a pre-trained ResNet50 model for image classification.
    This replaces the dummy model with a more robust pre-trained model.
    """
    global _model
    if _model is None:
        try:
            # Load pre-trained ResNet50 model
            _model = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V1)

            # Modify the final layer for our use case (document classification)
            # Original: 1000 classes (ImageNet)
            # New: 5 classes (document types: contract, invoice, receipt, id_card, other)
            num_features = _model.fc.in_features
            _model.fc = nn.Linear(num_features, 5)

            # Set to evaluation mode
            _model.eval()

            logger.info("Pre-trained ResNet50 model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load ResNet50 model: {e}")
            # Fallback to a simple model if ResNet fails to load
            _model = nn.Sequential(
                nn.AdaptiveAvgPool2d((1, 1)),
                nn.Flatten(),
                nn.Linear(2048, 5)  # ResNet50 feature size is 2048
            )
            _model.eval()
            logger.info("Fallback model loaded due to ResNet loading failure")

    return _model

def run_inference(preprocessed_image):
    """
    Runs inference on the preprocessed image tensor.
    Returns raw predictions for document classification.

    Args:
        preprocessed_image: Preprocessed image tensor of shape (batch_size, 3, 224, 224)

    Returns:
        Raw model predictions
    """
    model = load_model()
    with torch.no_grad():
        output = model(preprocessed_image)
    return output

def get_image_transforms():
    """
    Get the standard image transforms for ResNet50 preprocessing.
    This should be used before passing images to run_inference.
    """
    return transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

def predict_document_type(image_tensor):
    """
    Predict document type from image tensor.

    Args:
        image_tensor: Preprocessed image tensor

    Returns:
        Dict with predictions and confidence scores
    """
    model = load_model()
    with torch.no_grad():
        outputs = model(image_tensor)
        probabilities = torch.nn.functional.softmax(outputs, dim=1)

        # Document type classes
        classes = ['contract', 'invoice', 'receipt', 'id_card', 'other']

        # Get top prediction
        confidence, predicted_idx = torch.max(probabilities, 1)

        return {
            'predicted_class': classes[predicted_idx.item()],
            'confidence': confidence.item(),
            'all_probabilities': {
                classes[i]: prob.item()
                for i, prob in enumerate(probabilities[0])
            }
        }
