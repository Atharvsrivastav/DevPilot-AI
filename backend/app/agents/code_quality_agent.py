"""PydanticAI agent orchestrator setup for multi-agent repository evaluation."""

from pydantic import BaseModel, Field
from pydantic_ai import Agent


class CodeQualityResult(BaseModel):
    score: float = Field(description="Quality score from 0 to 100")
    code_smells_count: int
    duplication_percentage: float
    summary: str


# PydanticAI Agent initialization skeleton
code_quality_agent = Agent(
    model="openai:gpt-4o",
    result_type=CodeQualityResult,
    system_prompt=(
        "You are DevPilot AI's Code Quality Expert Agent. Analyze the given code snippet or "
        "repository structure for cyclomatic complexity, maintainability, and clean architecture."
    ),
)
