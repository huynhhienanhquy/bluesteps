import importlib
import json
import socket
from typing import Any

import pytest
from jsonschema import Draft202012Validator

from bluesteps_api.cli import ROOT
from bluesteps_api.config import Settings
from bluesteps_api.main import create_app
from bluesteps_api.schemas import ManualSortingRequest, ScanSortingRequest


def test_import_and_openapi_do_not_connect(monkeypatch: pytest.MonkeyPatch) -> None:
    def forbidden(*args: Any, **kwargs: Any) -> None:
        raise AssertionError("Import/schema export must not use the network")

    monkeypatch.setattr(socket.socket, "connect", forbidden)
    import bluesteps_api.main

    importlib.reload(bluesteps_api.main)
    schema = create_app().openapi()
    pinned = json.loads((ROOT / "docs/figma-analysis/contracts/core.openapi.json").read_text(encoding="utf-8"))
    for path, methods in pinned["paths"].items():
        for method, operation in methods.items():
            assert schema["paths"][path][method]["operationId"] == operation["operationId"]
    operations = [op["operationId"] for methods in schema["paths"].values() for op in methods.values()]
    assert len(operations) == len(set(operations))


def test_no_fallback_signing_keys(settings: Settings) -> None:
    with pytest.raises(ValueError, match="DATABASE_URL"):
        settings.validate_runtime()


def test_sorting_models_reject_client_points_and_invalid_sources() -> None:
    examples = json.loads((ROOT / "docs/figma-analysis/contracts/examples.json").read_text(encoding="utf-8"))
    for fixture in examples["valid"]:
        if fixture["schema"] == "SortingRequest":
            cls = ScanSortingRequest if fixture["value"]["source"] == "scan" else ManualSortingRequest
            cls.model_validate(fixture["value"])
    for fixture in examples["invalid"]:
        if fixture["schema"] == "SortingRequest":
            cls = ScanSortingRequest if fixture["value"].get("source") == "scan" else ManualSortingRequest
            with pytest.raises(ValueError):
                cls.model_validate(fixture["value"])


def assert_pinned(name: str, value: Any) -> None:
    schema = json.loads((ROOT / "docs/figma-analysis/contracts/core.openapi.json").read_text(encoding="utf-8"))
    target = {"$ref": f"#/components/schemas/{name}", "components": schema["components"]}
    Draft202012Validator(target, format_checker=Draft202012Validator.FORMAT_CHECKER).validate(value)
