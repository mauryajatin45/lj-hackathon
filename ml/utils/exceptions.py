from typing import Any, Optional

class MLInferenceError(Exception):
    """Base exception for ML inference errors."""

    def __init__(self, message: str, details: Optional[dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.details: dict[str, Any] = details or {}

    def __str__(self):
        if self.details:
            return f"{self.__class__.__name__}: {self.message} | Details: {self.details}"
        return f"{self.__class__.__name__}: {self.message}"

    def to_dict(self) -> dict[str, Any]:
        """Convert error to JSON-serializable dict (for API responses)."""
        return {
            "error": self.__class__.__name__,
            "message": self.message,
            "details": self.details,
        }


class ImageDownloadError(MLInferenceError):
    """Raised when image download fails."""


class PreprocessingError(MLInferenceError):
    """Raised when image preprocessing fails."""


class InferenceError(MLInferenceError):
    """Raised when model inference fails."""


class PostprocessingError(MLInferenceError):
    """Raised when postprocessing fails."""
