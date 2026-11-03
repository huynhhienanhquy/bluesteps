import base64
import io

import pytest
from PIL import Image

from bluesteps_api.errors import APIError
from bluesteps_api.waste_inference import decode_image, predict


def test_actual_checkpoint_matches_notebook_reference() -> None:
    # Reference: Kaggle uiux1 v3, cell 9 with the supplied state_dict, white RGB.
    label, confidence = predict(Image.new("RGB", (32, 64), "white"))
    assert label == "cardboard"
    assert confidence == pytest.approx(0.9725499749, abs=1e-4)


@pytest.mark.parametrize("mode", ["RGB", "RGBA", "L"])
def test_decode_normalizes_supported_image_modes(mode: str) -> None:
    stream = io.BytesIO()
    Image.new(mode, (17, 23)).save(stream, format="PNG")
    image = decode_image(base64.b64encode(stream.getvalue()).decode())
    assert image.mode == "RGB" and image.size == (17, 23)
    image.close()


def test_decode_applies_camera_exif_orientation() -> None:
    stream = io.BytesIO()
    image = Image.new("RGB", (17, 23))
    exif = image.getexif()
    exif[274] = 6
    image.save(stream, format="JPEG", exif=exif)
    decoded = decode_image(base64.b64encode(stream.getvalue()).decode())
    assert decoded.size == (23, 17)


@pytest.mark.parametrize("data", ["%%%%", "bm90IGFuIGltYWdl"])
def test_decode_rejects_invalid_images(data: str) -> None:
    with pytest.raises(APIError) as error:
        decode_image(data)
    assert error.value.code == "SCAN_INVALID_IMAGE"


def test_missing_checkpoint_returns_service_error_without_fake_prediction(tmp_path: object) -> None:
    with pytest.raises(APIError) as error:
        predict(Image.new("RGB", (32, 32)), str(tmp_path))
    assert error.value.code == "SCAN_MODEL_UNAVAILABLE"
