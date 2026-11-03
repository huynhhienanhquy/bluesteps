"""Bounded Valhalla adapter. No guessed distance, duration, geometry or fallback profile."""

import json
import math
import threading
import time
from datetime import UTC, datetime
from typing import Any
from urllib.parse import urlsplit
from uuid import UUID

import httpx

from .config import Settings
from .errors import APIError
from .schemas import Coordinate, RouteLeg, RouteManeuver, RouteMode, RoutePlan

COSTING = {"walking": "pedestrian", "cycling": "bicycle", "motorcycling": "motor_scooter", "driving": "auto"}
PHRASES = {
    1: "Bắt đầu đi",
    2: "Bắt đầu đi về bên phải",
    3: "Bắt đầu đi về bên trái",
    4: "Đến điểm thu gom",
    5: "Điểm thu gom ở bên phải",
    6: "Điểm thu gom ở bên trái",
    7: "Tiếp tục",
    8: "Đi thẳng",
    9: "Chếch phải",
    10: "Rẽ phải",
    11: "Rẽ ngoặt phải",
    12: "Quay đầu bên phải",
    13: "Quay đầu bên trái",
    14: "Rẽ ngoặt trái",
    15: "Rẽ trái",
    16: "Chếch trái",
    17: "Đi thẳng lên đường nối",
    18: "Rẽ phải lên đường nối",
    19: "Rẽ trái lên đường nối",
    20: "Ra lối bên phải",
    21: "Ra lối bên trái",
    22: "Giữ hướng thẳng",
    23: "Giữ bên phải",
    24: "Giữ bên trái",
    25: "Nhập làn",
    26: "Vào vòng xuyến",
    27: "Ra khỏi vòng xuyến",
    28: "Lên phà",
    29: "Rời phà",
}


def decode_shape(shape: str) -> list[Coordinate]:
    if not shape or len(shape) > 1000000:
        raise ValueError("Invalid shape size")
    index = 0
    lat = lng = 0
    output = []
    while index < len(shape):
        values = []
        for _ in range(2):
            result = shift = 0
            while True:
                if index >= len(shape) or shift > 30:
                    raise ValueError("Invalid shape")
                value = ord(shape[index]) - 63
                index += 1
                if not 0 <= value <= 63:
                    raise ValueError("Invalid shape byte")
                result |= (value & 31) << shift
                shift += 5
                if value < 32:
                    break
            values.append(~(result >> 1) if result & 1 else result >> 1)
        lat += values[0]
        lng += values[1]
        output.append(Coordinate(latitude=lat / 1e6, longitude=lng / 1e6))
        if len(output) > 50000:
            raise ValueError("Too many shape points")
    if len(output) < 2:
        raise ValueError("Missing shape points")
    return output


def amount(value: Any, factor: float = 1) -> int:
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0:
        raise ValueError("Invalid metric")
    result = round(float(value) * factor)
    if result > 20000000:
        raise ValueError("Metric too large")
    return result


class Valhalla:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._last_started = 0.0

    def plan(
        self,
        settings: Settings,
        origin: Coordinate,
        stops: list[dict[str, Any]],
        mode: RouteMode,
        prefer_no_tolls: bool,
    ) -> RoutePlan:
        url = settings.resolved_routing_url().rstrip("/")
        parsed = urlsplit(url)
        if not url:
            raise APIError(503, "PROVIDER_UNAVAILABLE", "Chưa cấu hình dịch vụ tính tuyến Valhalla.")
        if parsed.username or parsed.password or parsed.query or parsed.fragment or parsed.scheme != "https":
            # Loopback HTTP is only for an explicitly configured local test/self-hosted instance.
            if not (
                settings.environment != "production"
                and parsed.scheme == "http"
                and parsed.hostname in ("127.0.0.1", "localhost")
                and not parsed.username
                and not parsed.password
                and not parsed.query
                and not parsed.fragment
            ):
                raise APIError(503, "PROVIDER_CONFIGURATION", "Địa chỉ dịch vụ tính tuyến không hợp lệ.")
        if not self._lock.acquire(blocking=False):
            raise APIError(429, "ROUTING_BUSY", "Dịch vụ đang tính tuyến. Hãy thử lại sau ít giây.")
        try:
            now = time.monotonic()
            if now - self._last_started < 1:
                raise APIError(429, "ROUTING_BUSY", "Hãy đợi ít nhất một giây trước khi tính tuyến tiếp.")
            self._last_started = now
            costing = COSTING[mode]
            payload = {
                "locations": [{"lat": origin.latitude, "lon": origin.longitude, "type": "break"}]
                + [{"lat": p["latitude"], "lon": p["longitude"], "type": "break"} for p in stops],
                "costing": costing,
                "units": "kilometers",
                "language": "en-US",
                "costing_options": {costing: {"use_tolls": 0 if prefer_no_tolls else 0.5}},
            }
            with httpx.Client(
                timeout=settings.routing_timeout_s,
                follow_redirects=False,
                headers={"User-Agent": "BlueSteps/0.1", "X-Client-Id": settings.routing_client_id},
            ) as client:
                with client.stream("POST", url + "/route", json=payload) as response:
                    if response.status_code == 429 or response.status_code >= 500:
                        raise APIError(503, "PROVIDER_UNAVAILABLE", "Dịch vụ tính tuyến đang bận hoặc không sẵn sàng.")
                    if response.status_code in (400, 404):
                        raise APIError(
                            422, "NO_ROUTE", "Không tìm được tuyến phù hợp với phương tiện và các điểm đã chọn."
                        )
                    if response.status_code != 200:
                        raise APIError(503, "PROVIDER_UNAVAILABLE", "Dịch vụ tính tuyến chưa trả được kết quả hợp lệ.")
                    data = bytearray()
                    for chunk in response.iter_bytes():
                        data.extend(chunk)
                        if len(data) > 2000000:
                            raise ValueError("Response too large")
            return parse_plan(json.loads(data), origin, stops, mode, prefer_no_tolls)
        except (httpx.HTTPError, ValueError, TypeError, KeyError, IndexError, OverflowError, AttributeError) as exc:
            raise APIError(
                503, "PROVIDER_UNAVAILABLE", "Không lấy được tuyến hợp lệ. Hãy thử lại hoặc đổi phương tiện."
            ) from exc
        finally:
            self._lock.release()


def parse_plan(
    data: Any, origin: Coordinate, stops: list[dict[str, Any]], mode: RouteMode, prefer_no_tolls: bool
) -> RoutePlan:
    trip = data["trip"]
    if trip.get("status") != 0 or trip.get("units") != "kilometers" or len(trip["legs"]) != len(stops):
        raise ValueError("Unexpected trip")
    legs = []
    for leg, stop in zip(trip["legs"], stops, strict=True):
        geometry = decode_shape(leg["shape"])
        maneuvers = []
        if not 1 <= len(leg["maneuvers"]) <= 10000:
            raise ValueError("Invalid maneuver count")
        for m in leg["maneuvers"]:
            begin, end = m["begin_shape_index"], m["end_shape_index"]
            if not isinstance(begin, int) or not isinstance(end, int) or not 0 <= begin <= end < len(geometry):
                raise ValueError("Invalid maneuver shape indices")
            original = str(m["instruction"])[:2000]
            kind = int(m["type"])
            instruction = PHRASES.get(kind, original)
            street = m.get("street_names", [])
            if street and kind not in (4, 5, 6) and kind in PHRASES:
                instruction += " · " + str(street[0])[:300]
            if m.get("roundabout_exit_count") and kind == 27:
                instruction += " · Lối ra " + str(m["roundabout_exit_count"])
            maneuvers.append(
                RouteManeuver(
                    instruction=instruction,
                    original_instruction=original,
                    type=kind,
                    begin_index=begin,
                    end_index=end,
                    distance_m=amount(m["length"], 1000),
                    duration_s=amount(m["time"]),
                )
            )
        legs.append(
            RouteLeg(
                stop_id=stop.get("id"),
                point_id=stop["point_id"],
                geometry=geometry,
                maneuvers=maneuvers,
                distance_m=amount(leg["summary"]["length"], 1000),
                duration_s=amount(leg["summary"]["time"]),
            )
        )
    return RoutePlan(
        computed_at=datetime.now(UTC),
        origin=origin,
        mode=mode,
        prefer_no_tolls=prefer_no_tolls,
        stop_ids=[UUID(str(p["point_id"])) for p in stops],
        total_distance_m=sum(leg.distance_m for leg in legs),
        total_duration_s=sum(leg.duration_s for leg in legs),
        legs=legs,
    )
