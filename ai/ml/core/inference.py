import torch
import torch.nn as nn

class DummyModel(nn.Module):
    def __init__(self) -> None:
        super(DummyModel, self).__init__()
        # Simple placeholder model: single linear layer
        self.fc = nn.Linear(224*224*3, 10)  # Example output size 10 classes

    def forward(self, x):
        # Flatten input
        x = x.view(x.size(0), -1)
        return self.fc(x)

# Load model placeholder
_model = None

def load_model():
    global _model
    if _model is None:
        _model = DummyModel()
        _model.eval()
    return _model

def run_inference(preprocessed_image):
    """
    Runs inference on the preprocessed image tensor.
    Returns raw predictions.
    """
    model = load_model()
    with torch.no_grad():
        output = model(preprocessed_image)
    return output
