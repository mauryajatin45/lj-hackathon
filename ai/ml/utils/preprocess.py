from io import BytesIO
from PIL import Image
import numpy as np
import torch
import torchvision.transforms as transforms

def preprocess_image(image_bytes: bytes, target_size=(224, 224), grayscale=False, normalize=True):
    """
    Converts raw image bytes to a Torch tensor.
    Handles resizing, normalization, grayscale conversion.
    Generic for classification, detection, OCR, etc.
    """
    image = Image.open(BytesIO(image_bytes)).convert('RGB')
    if grayscale:
        image = image.convert('L')

    transform_list = []
    transform_list.append(transforms.Resize(target_size))
    transform_list.append(transforms.ToTensor())

    if normalize:
        # Normalization values for ImageNet
        transform_list.append(transforms.Normalize(mean=[0.485, 0.456, 0.406],
                                                   std=[0.229, 0.224, 0.225]))

    transform = transforms.Compose(transform_list)
    tensor = transform(image)

    return tensor.unsqueeze(0)  # Add batch dimension
