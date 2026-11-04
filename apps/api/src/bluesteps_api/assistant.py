import logging
from typing import Annotated, Literal

import httpx
from fastapi import APIRouter, Depends, Request
from pydantic import Field, StringConstraints, model_validator
from sqlalchemy.orm import Session

from .config import Settings
from .db import db_session
from .errors import APIError
from .schemas import Model
from .security import Actor, current_actor, limit

router = APIRouter(prefix="/v1", tags=["assistant"])
logger = logging.getLogger(__name__)
INSTRUCTIONS = (
    "Bạn là Trợ lý BlueSteps. Hỗ trợ người dùng phân loại rác, tái chế và thực hành lối sống xanh. "
    "Trả lời ngắn gọn bằng tiếng Việt, dùng văn bản thuần và đưa ra các bước thực tế. "
    "Nêu rõ khi cách xử lý tùy thuộc địa phương. Không bịa thông tin về điểm thu gom, giờ mở cửa "
    "hoặc dữ liệu trong ứng dụng. Hướng người dùng đến Sổ tay hoặc bản đồ BlueSteps để tra cứu."
)


class AssistantMessage(Model):
    role: Literal["user", "assistant"]
    content: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)]


class AssistantRequest(Model):
    messages: list[AssistantMessage] = Field(min_length=1, max_length=11)

    @model_validator(mode="after")
    def validate_turns(self) -> "AssistantRequest":
        if len(self.messages) % 2 == 0 or any(
            message.role != ("user" if index % 2 == 0 else "assistant") for index, message in enumerate(self.messages)
        ):
            raise ValueError("Cuộc trò chuyện phải xen kẽ và kết thúc bằng câu hỏi của người dùng.")
        return self


class AssistantResponse(Model):
    answer: str


def provider_unavailable() -> APIError:
    return APIError(503, "PROVIDER_UNAVAILABLE", "Trợ lý AI tạm thời không sẵn sàng.")


@router.post("/assistant/conversations", response_model=AssistantResponse, operation_id="assistant_conversation_create")
def assistant_create(
    body: AssistantRequest,
    request: Request,
    actor: Annotated[Actor, Depends(current_actor)],
    db: Annotated[Session, Depends(db_session, scope="function")],
) -> AssistantResponse:
    settings: Settings = request.app.state.settings
    api_key = settings.openai_api_key.get_secret_value()
    if not api_key:
        raise provider_unavailable()
    limit(db, settings, "assistant.user", str(actor.user_id), maximum=20, seconds=60)
    # Persist the limit and release the connection before waiting on the provider.
    db.commit()

    try:
        with httpx.Client(timeout=20, trust_env=False) as client:
            response = client.post(
                "https://api.openai.com/v1/responses",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": settings.openai_model,
                    "instructions": INSTRUCTIONS,
                    "input": [message.model_dump() for message in body.messages],
                    "store": False,
                    "max_output_tokens": 600,
                },
            )
            response.raise_for_status()
            result = response.json()
    except httpx.HTTPStatusError as exc:
        logger.warning("OpenAI assistant request failed with HTTP %s", exc.response.status_code)
        raise provider_unavailable() from None
    except (httpx.RequestError, ValueError):
        logger.warning("OpenAI assistant request failed or returned invalid JSON")
        raise provider_unavailable() from None

    parts = []
    if isinstance(result, dict) and isinstance(result.get("output"), list):
        for item in result["output"]:
            match item:
                case {"type": "message", "content": list(content)}:
                    for part in content:
                        match part:
                            case {"type": "output_text", "text": str(value)}:
                                parts.append(value)
    answer = "\n".join(parts).strip()
    if not answer:
        raise provider_unavailable()
    return AssistantResponse(answer=answer)
