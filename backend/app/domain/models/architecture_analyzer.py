"""Pydantic model schema for Architecture Analyzer output."""

from enum import Enum
from pydantic import BaseModel, Field


class ArchitecturePattern(str, Enum):
    CLEAN_ARCHITECTURE = "Clean Architecture"
    HEXAGONAL = "Hexagonal Architecture (Ports & Adapters)"
    LAYERED = "Layered Architecture"
    MVC = "Model-View-Controller (MVC)"
    MICROSERVICES = "Microservices"
    MONOLITHIC_UNSTRUCTURED = "Monolithic / Unstructured"


class DependencyEdge(BaseModel):
    source: str
    target: str
    relation: str = "depends_on"


class ArchitectureReport(BaseModel):
    repository_url: str
    detected_pattern: ArchitecturePattern
    confidence_score: float = Field(..., description="Pattern detection confidence from 0.0 to 100.0")
    modularity_score: float = Field(..., description="Modularity rating from 0.0 to 100.0")
    coupling_score: float = Field(..., description="Coupling rating from 0.0 to 100.0")
    folder_graph: list[str] = Field(default_factory=list, description="Structured folder hierarchy list")
    dependency_graph: list[DependencyEdge] = Field(default_factory=list, description="Inter-module dependency edges")
    mermaid_diagram: str = Field(..., description="Generated Mermaid.js flowchart string")
    summary: str = Field(..., description="Comprehensive architectural evaluation report")
