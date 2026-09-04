"""Pydantic model schemas for Repository Chat Q&A grounded in stored analyses."""

from datetime import UTC, datetime

from pydantic import BaseModel, Field


class ChatMessageRequest(BaseModel):
    repository_id: str = Field(
        ..., description="owner/repo, e.g. 'facebook/react'"
    )
    question: str = Field(..., min_length=1, description="User question about the codebase")
    analysis_id: str | None = Field(
        default=None, description="Pin chat to a specific analysis run"
    )


class ContextSourceSnippet(BaseModel):
    file_path: str
    content: str
    relevance_score: float


class ChatMessageResponse(BaseModel):
    question: str
    answer: str
    ai_generated: bool = Field(
        default=False,
        description="True when an LLM produced the answer; False for deterministic summaries",
    )
    sources: list[ContextSourceSnippet] = Field(default_factory=list, description="Real findings/snippets grounding the answer")
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
