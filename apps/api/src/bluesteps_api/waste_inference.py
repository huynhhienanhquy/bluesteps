"""Bounded image decoding and cached CPU inference; images are never persisted."""

import base64
import binascii
import io
import json
import logging
import warnings
from functools import lru_cache
from pathlib import Path
from threading import Lock
from typing import Any

from PIL import Image, ImageOps, UnidentifiedImageError

from .errors import APIError

MODEL_NAME = "EfficientNetB0_FastKAN"
CLASS_LABELS = {
    "battery": "Pin đã qua sử dụng",
    "biological": "Rác hữu cơ",
    "cardboard": "Bìa carton",
    "clothes": "Quần áo",
    "glass": "Thủy tinh",
    "metal": "Kim loại",
    "paper": "Giấy",
    "plastic": "Nhựa",
    "shoes": "Giày dép",
    "trash": "Rác còn lại",
}
MAX_IMAGE_BYTES = 8 * 1024 * 1024
MAX_IMAGE_BASE64 = 4 * ((MAX_IMAGE_BYTES + 2) // 3)
MAX_IMAGE_PIXELS = 16_000_000
_load_lock = Lock()
_inference_lock = Lock()
logger = logging.getLogger(__name__)


def decode_image(value: str) -> Image.Image:
    try:
        data = base64.b64decode(value, validate=True)
    except (ValueError, binascii.Error) as exc:
        raise APIError(422, "SCAN_INVALID_IMAGE", "Ảnh tải lên không hợp lệ.") from exc
    if not data or len(data) > MAX_IMAGE_BYTES:
        raise APIError(413, "SCAN_IMAGE_TOO_LARGE", "Vui lòng chọn ảnh có dung lượng tối đa 8 MB.")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(data)) as source:
                if source.format not in ("JPEG", "PNG", "WEBP") or source.width * source.height > MAX_IMAGE_PIXELS:
                    raise ValueError("Unsupported image")
                source.load()
                return ImageOps.exif_transpose(source).convert("RGB")
    except (
        UnidentifiedImageError,
        OSError,
        ValueError,
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
    ) as exc:
        raise APIError(
            422, "SCAN_INVALID_IMAGE", "Chọn ảnh JPEG, PNG hoặc WebP rõ nét, tối đa 16 triệu điểm ảnh."
        ) from exc


def model_directory(configured: str) -> Path:
    return Path(configured) if configured else Path(__file__).resolve().parents[4] / "EfficientNetB0_FastKAN_Export"


@lru_cache(maxsize=1)
def load_model(directory: str) -> tuple[Any, Any, list[str]]:
    # Lazy imports keep OpenAPI export and non-scan commands independent of model startup.
    import torch
    from torchvision import transforms  # type: ignore[import-untyped]

    from .waste_model import EfficientNetB0FastKAN

    root = model_directory(directory)
    config = json.loads((root / "model_config.json").read_text(encoding="utf-8"))
    names = config["class_names"]
    if (
        config["model_name"] != MODEL_NAME
        or config["num_classes"] != 10
        or names != list(CLASS_LABELS)
        or config["input_size"] != [224, 224]
        or config["checkpoint_format"] != "PyTorch state_dict"
    ):
        raise ValueError("Unsupported model metadata")
    # Avoid CPU oversubscription in the shared API process.
    torch.set_num_threads(min(4, torch.get_num_threads()))
    model = EfficientNetB0FastKAN(num_classes=len(names))
    state = torch.load(root / "best_EfficientNetB0_FastKAN.pth", map_location="cpu", weights_only=True)
    model.load_state_dict(state, strict=True)
    model.eval()
    transform = transforms.Compose(
        [
            transforms.Resize((224, 224), interpolation=transforms.InterpolationMode.BILINEAR, antialias=True),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ]
    )
    return model, transform, names


def predict(image: Image.Image, directory: str = "") -> tuple[str, float]:
    if not _inference_lock.acquire(blocking=False):
        raise APIError(503, "SCAN_BUSY", "Mô hình đang xử lý ảnh khác. Vui lòng thử lại.")
    try:
        import torch

        with _load_lock:
            model, transform, names = load_model(directory)
        with torch.inference_mode():
            probabilities = torch.softmax(model(transform(image).unsqueeze(0)), dim=1)[0]
            if not torch.isfinite(probabilities).all():
                raise ValueError("Non-finite model output")
            confidence, index = probabilities.max(dim=0)
        return names[int(index.item())], float(confidence.item())
    except Exception as exc:
        logger.exception("Waste model inference failed")
        raise APIError(503, "SCAN_MODEL_UNAVAILABLE", "Mô hình nhận diện chưa sẵn sàng. Vui lòng thử lại.") from exc
    finally:
        _inference_lock.release()
