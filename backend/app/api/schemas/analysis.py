"""API schema contracts for repository analysis endpoints."""

from pydantic import BaseModel, HttpUrl


class AnalyzeRequest(BaseModel):
    repo_url: HttpUrl
    branch: str = "main"


class AnalyzeResponse(BaseModel):
    analysis_id: str
    status: str
    message: str
