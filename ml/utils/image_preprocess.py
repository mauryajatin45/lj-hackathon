"""
Image preprocessing utilities for ResNet50 model inference.
"""

import logging
from typing import Optional

# Safe imports for image processing
try:
    import torch
    from torchvision import transforms
    from PIL import Image
    import io
    IMAGE_PROCESSING_AVAILABLE = True
except ImportError:
    torch = None
    transforms = None
    Image = None
    io = None
    IMAGE_PROCESSING_AVAILABLE = False

logger = logging.getLogger(__name__)

def get_image_transforms():
    """
    Get standard image transforms for ResNet50 preprocessing.
    """
    if not IMAGE_PROCESSING_AVAILABLE:
        logger.warning("Image processing libraries not available")
        return None

    return transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

def preprocess_image_for_model(image_bytes: bytes) -> Optional[torch.Tensor]:
    """
    Preprocess image bytes for ResNet50 model inference.

    Args:
        image_bytes: Raw image bytes

    Returns:
        Preprocessed tensor ready for model inference, or None if processing fails
    """
    if not IMAGE_PROCESSING_AVAILABLE:
        logger.error("Image processing libraries not available for model preprocessing")
        return None

    try:
        # Convert bytes to PIL Image
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')

        # Get transforms
        transform = get_image_transforms()
        if transform is None:
            return None

        # Apply transforms
        tensor = transform(image)

        # Add batch dimension
        tensor = tensor.unsqueeze(0)

        logger.info(f"Image preprocessed for model: shape {tensor.shape}")
        return tensor

    except Exception as e:
        logger.error(f"Failed to preprocess image for model: {e}")
        return None
