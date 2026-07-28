"""Pydantic model schemas for Repository Chat Q&A using RAG."""

from datetime import datetime, timezone
from pydantic import BaseModel, Field


class ChatMessageRequest(BaseModel):
    repository_id: str
    question: str = Field(..., min_length=1, description="User question about the codebase")


class ContextSourceSnippet(BaseModel):
    file_path: str
    content: str
    relevance_score: float


class ChatMessageResponse(BaseModel):
    question: str
    answer: str
    sources: list[ContextSourceSnippet] = Field(default_factory=list, description="Retrieved RAG code snippets used for answer generation")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
