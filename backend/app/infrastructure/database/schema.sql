-- ==============================================================================
-- DevPilot AI - PostgreSQL Database Schema
-- Architecture: Clean Normalized Schema with pgvector support
-- Core Features: UUID keys, Indexes, Foreign Keys, Timestamp tracking
-- ==============================================================================

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ------------------------------------------------------------------------------
-- 1. USERS TABLE
-- Stores user profiles, authentication data, and GitHub integration metadata.
-- ------------------------------------------------------------------------------
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(100) NOT NULL UNIQUE,
    full_name VARCHAR(255),
    avatar_url TEXT,
    github_user_id VARCHAR(100) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_github_user_id ON users(github_user_id);

-- ------------------------------------------------------------------------------
-- 2. REPOSITORIES TABLE
-- Stores monitored GitHub repositories linked to users.
-- ------------------------------------------------------------------------------
CREATE TABLE repositories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    github_repo_id VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    owner_login VARCHAR(150) NOT NULL,
    html_url TEXT NOT NULL,
    default_branch VARCHAR(100) DEFAULT 'main' NOT NULL,
    is_private BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_repositories_user_id ON repositories(user_id);
CREATE INDEX idx_repositories_full_name ON repositories(full_name);

-- ------------------------------------------------------------------------------
-- 3. ANALYSIS TABLE
-- Tracks overall repository analysis jobs and status executions.
-- ------------------------------------------------------------------------------
CREATE TABLE analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    commit_hash VARCHAR(40) NOT NULL,
    branch VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING' NOT NULL,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_analysis_repository_id ON analysis(repository_id);
CREATE INDEX idx_analysis_status ON analysis(status);
CREATE INDEX idx_analysis_created_at ON analysis(created_at DESC);

-- ------------------------------------------------------------------------------
-- 4. SECURITY_ISSUES TABLE
-- Stores vulnerabilities, hardcoded secrets, and unsafe dependencies.
-- ------------------------------------------------------------------------------
CREATE TABLE security_issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_id UUID NOT NULL REFERENCES analysis(id) ON DELETE CASCADE,
    severity VARCHAR(20) NOT NULL, -- CRITICAL, HIGH, MEDIUM, LOW, INFO
    issue_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    file_path TEXT NOT NULL,
    line_number INT,
    remediation TEXT,
    cve_id VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_security_issues_analysis_id ON security_issues(analysis_id);
CREATE INDEX idx_security_issues_severity ON security_issues(severity);
CREATE INDEX idx_security_issues_file_path ON security_issues(file_path);

-- ------------------------------------------------------------------------------
-- 5. QUALITY_REPORTS TABLE
-- Stores code quality metrics, complexity, duplication, and doc coverage.
-- ------------------------------------------------------------------------------
CREATE TABLE quality_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_id UUID UNIQUE NOT NULL REFERENCES analysis(id) ON DELETE CASCADE,
    cyclomatic_complexity_avg NUMERIC(5, 2) NOT NULL,
    code_duplication_percentage NUMERIC(5, 2) NOT NULL,
    documentation_coverage_percentage NUMERIC(5, 2) NOT NULL,
    code_smells_count INT DEFAULT 0 NOT NULL,
    lines_of_code INT NOT NULL,
    comment_lines_count INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_quality_reports_analysis_id ON quality_reports(analysis_id);

-- ------------------------------------------------------------------------------
-- 6. ARCHITECTURE_REPORTS TABLE
-- Stores architectural evaluation, modularity, coupling, and DAG metrics.
-- ------------------------------------------------------------------------------
CREATE TABLE architecture_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_id UUID UNIQUE NOT NULL REFERENCES analysis(id) ON DELETE CASCADE,
    architecture_pattern VARCHAR(100) NOT NULL,
    modularity_score NUMERIC(5, 2) NOT NULL,
    coupling_score NUMERIC(5, 2) NOT NULL,
    cohesion_score NUMERIC(5, 2) NOT NULL,
    circular_dependencies_count INT DEFAULT 0 NOT NULL,
    architectural_debt_hours NUMERIC(8, 2) DEFAULT 0.0 NOT NULL,
    summary TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_architecture_reports_analysis_id ON architecture_reports(analysis_id);

-- ------------------------------------------------------------------------------
-- 7. HEALTH_SCORES TABLE
-- Stores aggregated health indices across quality, security, architecture, performance, docs, maintainability.
-- ------------------------------------------------------------------------------
CREATE TABLE health_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_id UUID UNIQUE NOT NULL REFERENCES analysis(id) ON DELETE CASCADE,
    overall_score NUMERIC(5, 2) NOT NULL,
    quality_score NUMERIC(5, 2) NOT NULL,
    security_score NUMERIC(5, 2) NOT NULL,
    architecture_score NUMERIC(5, 2) NOT NULL,
    performance_score NUMERIC(5, 2) NOT NULL,
    documentation_score NUMERIC(5, 2) NOT NULL,
    maintainability_score NUMERIC(5, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_health_scores_analysis_id ON health_scores(analysis_id);
CREATE INDEX idx_health_scores_overall_score ON health_scores(overall_score);

-- ------------------------------------------------------------------------------
-- 8. HISTORY TABLE
-- Tracks historical trends and score progressions over time per repository.
-- ------------------------------------------------------------------------------
CREATE TABLE history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    analysis_id UUID NOT NULL REFERENCES analysis(id) ON DELETE CASCADE,
    commit_hash VARCHAR(40) NOT NULL,
    overall_score NUMERIC(5, 2) NOT NULL,
    total_security_issues INT DEFAULT 0 NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_history_repository_id ON history(repository_id);
CREATE INDEX idx_history_recorded_at ON history(recorded_at DESC);

-- ------------------------------------------------------------------------------
-- 9. CHAT TABLE
-- Stores interactive AI Q&A chat history and vector embeddings (pgvector) per repo analysis.
-- ------------------------------------------------------------------------------
CREATE TABLE chat (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    analysis_id UUID REFERENCES analysis(id) ON DELETE SET NULL,
    role VARCHAR(20) NOT NULL, -- 'user', 'assistant', 'system'
    message TEXT NOT NULL,
    embedding vector(1536), -- Vector embeddings for RAG semantic search
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_chat_repository_id ON chat(repository_id);
CREATE INDEX idx_chat_user_id ON chat(user_id);
CREATE INDEX idx_chat_analysis_id ON chat(analysis_id);
CREATE INDEX idx_chat_created_at ON chat(created_at ASC);
