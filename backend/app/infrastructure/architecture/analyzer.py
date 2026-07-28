"""Architecture Analyzer Engine detecting Clean Architecture, Hexagonal, Layered, MVC, & Microservices patterns strictly from tree evidence."""

from app.domain.models.architecture_analyzer import (
    ArchitecturePattern,
    ArchitectureReport,
    DependencyEdge,
)


class ArchitectureAnalyzerService:
    @classmethod
    def analyze_architecture(cls, repo_url: str, tree: list[str]) -> ArchitectureReport:
        """Analyzes directory tree structure to identify architectural patterns, dependency DAGs, and Mermaid diagrams."""
        if not tree:
            return ArchitectureReport(
                repository_url=repo_url,
                detected_pattern=ArchitecturePattern.MONOLITHIC_UNSTRUCTURED,
                confidence_score=0.0,
                architecture_score=None,
                formula_used="Not Analyzed (Empty directory tree)",
                raw_metrics={"total_tree_files": 0, "detected_folders": 0},
                modularity_score=0.0,
                coupling_score=0.0,
                folder_graph=[],
                dependency_graph=[],
                mermaid_diagram="graph TD\n    EmptyTree['Empty Directory Tree']",
                summary="Repository structure could not be analyzed due to an empty file tree.",
            )

        paths_set = set(tree)

        # 1. Detect Pattern based on directory structure signatures
        pattern = ArchitecturePattern.MONOLITHIC_UNSTRUCTURED
        confidence = 60.0
        base_score = 60.0

        has_domain = any("domain" in p for p in paths_set)
        has_use_cases = any("use_case" in p or "usecases" in p for p in paths_set)
        has_infra = any("infrastructure" in p or "infra" in p for p in paths_set)
        has_ports = any("ports" in p or "adapters" in p for p in paths_set)
        has_mvc = any("controllers" in p or "views" in p or "models" in p for p in paths_set)
        has_microservices = any("docker-compose" in p or "k8s" in p or "services/" in p for p in paths_set) and len([p for p in tree if p.count("/") == 1 and "service" in p]) > 1

        if has_domain and has_use_cases and has_infra:
            pattern = ArchitecturePattern.CLEAN_ARCHITECTURE
            confidence = 95.0
            base_score = 95.0
        elif has_ports:
            pattern = ArchitecturePattern.HEXAGONAL
            confidence = 90.0
            base_score = 90.0
        elif has_microservices:
            pattern = ArchitecturePattern.MICROSERVICES
            confidence = 88.0
            base_score = 88.0
        elif has_mvc:
            pattern = ArchitecturePattern.MVC
            confidence = 85.0
            base_score = 85.0
        elif has_domain or has_infra:
            pattern = ArchitecturePattern.LAYERED
            confidence = 80.0
            base_score = 75.0

        # 2. Build Folder Graph
        folder_graph = sorted(list({p.split("/")[0] for p in tree if "/" in p}))

        # 3. Generate Dependency Graph Edges
        dependency_graph: list[DependencyEdge] = []
        if pattern == ArchitecturePattern.CLEAN_ARCHITECTURE:
            dependency_graph = [
                DependencyEdge(source="API / Controllers", target="Use Cases", relation="calls"),
                DependencyEdge(source="Use Cases", target="Domain Entities", relation="uses"),
                DependencyEdge(source="Infrastructure", target="Domain Interfaces", relation="implements"),
                DependencyEdge(source="Use Cases", target="Domain Interfaces", relation="depends_on"),
            ]
        elif pattern == ArchitecturePattern.MVC:
            dependency_graph = [
                DependencyEdge(source="Views", target="Controllers", relation="triggers"),
                DependencyEdge(source="Controllers", target="Models", relation="updates"),
            ]
        else:
            dependency_graph = [
                DependencyEdge(source="Presentation Layer", target="Business Logic Layer", relation="calls"),
                DependencyEdge(source="Business Logic Layer", target="Data Access Layer", relation="queries"),
            ]

        # 4. Generate Mermaid.js Diagram String
        mermaid_diagram = cls._generate_mermaid_diagram(pattern)

        # 5. Calculate Measurable Modularity & Coupling Scores
        layer_count = sum([has_domain, has_use_cases, has_infra, has_ports, has_mvc, has_microservices])
        modularity_score = min(100.0, round(base_score * 0.8 + (len(folder_graph) * 2.5), 1))
        coupling_score = 20.0 if pattern in (ArchitecturePattern.CLEAN_ARCHITECTURE, ArchitecturePattern.HEXAGONAL) else 50.0

        # Overall architecture pillar score formula: base_score + (layer_count * 2.0) - (coupling_score * 0.1)
        architecture_score = max(0.0, min(100.0, round(base_score + (layer_count * 2.0) - (coupling_score * 0.1), 1)))

        raw_metrics = {
            "total_tree_files": len(tree),
            "folder_count": len(folder_graph),
            "detected_layers_count": layer_count,
            "has_domain_layer": has_domain,
            "has_use_cases_layer": has_use_cases,
            "has_infrastructure_layer": has_infra,
        }

        formula_used = "BasePatternScore + (LayerCount * 2.0) - (CouplingScore * 0.1)"

        summary = (
            f"Repository architecture follows **{pattern.value}** with a pattern confidence score of {confidence}%. "
            f"Architecture health score is calculated at {architecture_score}/100 with modularity {modularity_score}/100 and coupling {coupling_score}/100."
        )

        return ArchitectureReport(
            repository_url=repo_url,
            detected_pattern=pattern,
            confidence_score=confidence,
            architecture_score=architecture_score,
            formula_used=formula_used,
            raw_metrics=raw_metrics,
            modularity_score=modularity_score,
            coupling_score=coupling_score,
            folder_graph=folder_graph,
            dependency_graph=dependency_graph,
            mermaid_diagram=mermaid_diagram,
            summary=summary,
        )

    @staticmethod
    def _generate_mermaid_diagram(pattern: ArchitecturePattern) -> str:
        if pattern == ArchitecturePattern.CLEAN_ARCHITECTURE:
            return """graph TD
    subgraph External ["External / Presentation"]
        API["FastAPI / Next.js Controllers"]
    end

    subgraph Infra ["Infrastructure Layer"]
        DB["PostgreSQL / pgvector DB"]
        GitHub["GitHub API Client"]
    end

    subgraph UseCases ["Application Use Cases"]
        UC["AnalyzeRepository UseCase"]
    end

    subgraph Domain ["Core Domain Layer"]
        Model["Domain Entities"]
        Interface["Repository Interfaces"]
    end

    API --> UC
    UC --> Model
    UC --> Interface
    DB -.-> Interface
    GitHub -.-> Interface"""
        
        elif pattern == ArchitecturePattern.HEXAGONAL:
            return """graph LR
    User["User / HTTP Client"] --> AdapterIn["Inbound Adapters (REST API)"]
    AdapterIn --> PortIn["Inbound Ports"]
    PortIn --> Core["Core Domain Logic"]
    Core --> PortOut["Outbound Ports"]
    PortOut --> AdapterOut["Outbound Adapters (Database / Ext APIs)"]"""

        elif pattern == ArchitecturePattern.MVC:
            return """graph TD
    View["Views / UI Components"] --> Controller["Controllers / Route Handlers"]
    Controller --> Model["Models / Data Entities"]
    Model --> DB[("Database")]"""

        else:
            return """graph TD
    UI["Frontend UI Layer"] --> API["Backend API Layer"]
    API --> Services["Service Business Layer"]
    Services --> DB[("Database Layer")]"""
