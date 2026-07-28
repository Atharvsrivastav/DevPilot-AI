"""FastAPI controller route for Repository RAG Chat Q&A."""

from fastapi import APIRouter, Depends, status

from app.api.deps import get_current_user_id
from app.domain.models.repo_chat import ChatMessageRequest, ChatMessageResponse
from app.infrastructure.chat.service import RepositoryChatService

router = APIRouter(prefix="/chat", tags=["Repository Chat (RAG)"])


@router.post("/query", response_model=ChatMessageResponse, status_code=status.HTTP_200_OK)
async def chat_with_repository(
    payload: ChatMessageRequest,
    current_user_id: str = Depends(get_current_user_id)
):
    """Ask questions about a repository and receive accurate RAG-backed answers with retrieved code sources."""
    return await RepositoryChatService.answer_question(
        repository_id=payload.repository_id,
        question=payload.question,
    )
