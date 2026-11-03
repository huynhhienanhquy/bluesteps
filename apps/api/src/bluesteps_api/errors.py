from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError, OperationalError
from starlette.exceptions import HTTPException


class APIError(Exception):
    def __init__(self, status: int, code: str, message: str, *, commit: bool = False):
        self.status, self.code, self.message, self.commit = status, code, message, commit


def install_errors(app: FastAPI) -> None:
    def response(
        request: Request,
        status: int,
        code: str,
        message: str,
        fields: list[dict[str, str]] | None = None,
    ) -> JSONResponse:
        error: dict[str, Any] = {
            "code": code,
            "message": message,
            "retryable": status in (429, 503),
            "requestId": request.state.request_id,
        }
        if fields:
            error["fieldErrors"] = fields
        return JSONResponse({"error": error}, status_code=status)

    @app.exception_handler(APIError)
    async def api_error(request: Request, exc: APIError) -> JSONResponse:
        return response(request, exc.status, exc.code, exc.message)

    @app.exception_handler(RequestValidationError)
    async def validation(request: Request, exc: RequestValidationError) -> JSONResponse:
        # Never echo submitted values (passwords, tokens or contact data).
        fields = [{"field": ".".join(map(str, e["loc"])), "message": e["msg"]} for e in exc.errors()]
        return response(request, 422, "VALIDATION_ERROR", "Dữ liệu không hợp lệ.", fields)

    @app.exception_handler(HTTPException)
    async def http_error(request: Request, exc: HTTPException) -> JSONResponse:
        return response(
            request,
            exc.status_code,
            "NOT_FOUND" if exc.status_code == 404 else "HTTP_ERROR",
            "Không tìm thấy tài nguyên." if exc.status_code == 404 else "Yêu cầu không hợp lệ.",
        )

    @app.exception_handler(IntegrityError)
    async def conflict(request: Request, exc: IntegrityError) -> JSONResponse:
        return response(request, 409, "CONFLICT", "Dữ liệu đã thay đổi hoặc bị trùng.")

    @app.exception_handler(OperationalError)
    async def unavailable(request: Request, exc: OperationalError) -> JSONResponse:
        return response(request, 503, "DATABASE_UNAVAILABLE", "Dịch vụ tạm thời không sẵn sàng.")

    @app.exception_handler(Exception)
    async def unexpected(request: Request, exc: Exception) -> JSONResponse:
        return response(request, 500, "INTERNAL_ERROR", "Không thể xử lý yêu cầu.")
