"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  RepositoryCard,
  ScoreWidget,
  PillarChartWidget,
  RecentAnalysisWidget,
  DevelopmentActivityWidget,
  CompactEngineeringSnapshot,
  PriorityFixesWidget,
  HealthTimelineWidget,
  WhatChangedWidget,
} from "@/components/DashboardWidgets";
import { AnalyzeModal, type AnalysisRecord } from "@/components/AnalyzeModal";
import { AnalysisDetailTabs } from "@/components/AnalysisDetailTabs";
import { LoadingSkeleton, ErrorBlock, EmptyBlock } from "@/components/StateBlocks";
import { Sparkles, RefreshCw, Plus, Search, Printer } from "lucide-react";
import { apiFetch, ApiError, parseRepoInput, repoSearch } from "@/lib/api";
import { useRepo, repoKey, repoQuery, withRepo, saveRepositoryState } from "@/lib/useRepo";

type FullRecord = AnalysisRecord & {
  repository?: {
    owner?: string;
    name?: string;
    url?: string;
    default_branch?: string | null;
    requested_branch?: string | null;
    commit_sha?: string | null;
    stars?: number | null;
    forks?: number | null;
    open_issues?: number | null;
    description?: string | null;
    license?: string | null;
    language?: string | null;
    recent_commits?: Array<{
      sha: string;
      message: string;
      author_name: string;
      date: string;
    }>;
    top_contributors?: Array<{
      login: string;
      contributions: number;
      avatar_url?: string;
    }>;
  };
  health?: {
    overall_health_score?: number | null;
    health_grade?: string;
    confidence_rating?: string;
    confidence_reason?: string;
    weights_used?: Record<string, number>;
    individual_scores?: Record<string, number | null>;
    formulas_used?: Record<string, string>;
  } | null;
  dependencies?: { score?: number } | null;
  testing?: { score?: number } | null;
  activity?: { score?: number } | null;
  performance_signals?: { score?: number } | null;
};

function DashboardInner() {
  const repo = useRepo();
  const router = useRouter();
  const [record, setRecord] = useState<FullRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [inputError, setInputError] = useState("");
  const [selectedTab, setSelectedTab] = useState<string>("security");

  const key = repo ? repoKey(repo) : "";

  useEffect(() => {
    if (!repo) {
      setRecord(null);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setRecord(null); // clear previous repo's data immediately
    setError(null);
    setLoading(true);
    apiFetch<FullRecord>(`/api/v1/analysis/by-repo?${repoQuery(repo)}`)
      .then((data) => {
        if (!cancelled) {
          setRecord(data);
          if (data.repository?.owner && data.repository?.name) {
            saveRepositoryState({
              owner: data.repository.owner,
              repo: data.repository.name,
              url: data.repository.url || `https://github.com/${data.repository.owner}/${data.repository.name}`,
              defaultBranch: data.repository.default_branch || data.repository.requested_branch || "main",
              repositoryId: `${data.repository.owner}/${data.repository.name}`,
              commitSha: data.repository.commit_sha || null,
              analysisId: data.analysis_id,
            });
          }
        }
      })
      .catch((e) => {
        if (!cancelled) {
          if (e instanceof ApiError && e.status === 404) {
            setRecord(null); // never analyzed — empty state, not an error
          } else {
            setError(e instanceof ApiError ? e.message : "Failed to load analysis.");
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const submitRepo = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseRepoInput(urlInput);
    if (!parsed) {
      setInputError("Enter a valid GitHub URL (github.com/owner/repo) or owner/repo.");
      return;
    }
    setInputError("");
    setUrlInput(parsed.url);
    setIsModalOpen(true);
  };

  const refresh = () => {
    if (!repo) return;
    setLoading(true);
    setError(null);
    apiFetch<FullRecord>(`/api/v1/analysis/by-repo?${repoQuery(repo)}`)
      .then((data) => {
        setRecord(data);
        if (data.repository?.owner && data.repository?.name) {
          saveRepositoryState({
            owner: data.repository.owner,
            repo: data.repository.name,
            url: data.repository.url || `https://github.com/${data.repository.owner}/${data.repository.name}`,
            defaultBranch: data.repository.default_branch || data.repository.requested_branch || "main",
            repositoryId: `${data.repository.owner}/${data.repository.name}`,
            commitSha: data.repository.commit_sha || null,
            analysisId: data.analysis_id,
          });
        }
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 404) setRecord(null);
        else setError(e instanceof ApiError ? e.message : "Failed to load analysis.");
      })
      .finally(() => setLoading(false));
  };

  const onComplete = (rec: AnalysisRecord) => {
    setRecord(rec as FullRecord);
    setIsModalOpen(false);
    if (rec.repository?.owner && rec.repository?.name) {
      saveRepositoryState({
        owner: rec.repository.owner,
        repo: rec.repository.name,
        url: (rec.repository as any).url || `https://github.com/${rec.repository.owner}/${rec.repository.name}`,
        defaultBranch: (rec.repository as any).default_branch || "main",
        repositoryId: `${rec.repository.owner}/${rec.repository.name}`,
        commitSha: (rec.repository as any).commit_sha || null,
        analysisId: rec.analysis_id,
      });
      router.push(
        `/dashboard${repoSearch(rec.repository.owner, rec.repository.name)}`
      );
    }
  };

  const handleScoreClick = (tabId: string) => {
    setSelectedTab(tabId);
    const el = document.getElementById("analysis-detail-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const r = record?.repository;
  const health = record?.health;
  const ind = health?.individual_scores || {};
  const formulas = health?.formulas_used || {};

  const pillars = [
    { id: "security", name: "Security", score: ind.security_score ?? null, weight: "20%" },
    { id: "quality", name: "Code Quality", score: ind.code_quality_score ?? null, weight: "20%" },
    { id: "architecture", name: "Architecture", score: ind.architecture_score ?? null, weight: "15%" },
    { id: "supply", name: "Testing", score: ind.testing_score ?? null, weight: "15%" },
    { id: "supply", name: "Dependencies", score: ind.dependencies_score ?? null, weight: "10%" },
    { id: "supply", name: "Documentation", score: ind.documentation_score ?? null, weight: "10%" },
    { id: "activity", name: "Activity", score: ind.activity_score ?? null, weight: "10%" },
    { id: "supply", name: "Performance Signals", score: ind.performance_score ?? null, weight: "Diagnostic" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 max-w-7xl mx-auto py-8 px-4 sm:px-6"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Repository intelligence</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight linear-gradient-text">
            {repo ? `${repo.owner} / ${repo.repo}` : "Dashboard"}
          </h1>
          {record?.status === "FAILED" ? (
            <p className="text-rose-400 text-sm font-mono">
              Analysis failed: {record.error_message}
            </p>
          ) : (
            <p className="text-slate-400 text-sm max-w-xl">
              {r?.description ||
                "Security, quality, architecture, and maintainability from live GitHub data."}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            disabled={!record}
            className="px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all inline-flex items-center gap-1.5 disabled:opacity-40"
            title="Export clean PDF report of current analysis"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            onClick={refresh}
            disabled={!repo || loading}
            className="px-4 py-2.5 text-xs font-bold rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-all inline-flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            <span>{loading ? "Loading..." : "Refresh"}</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 text-xs font-semibold rounded-md bg-slate-100 hover:bg-white text-slate-950 transition-colors inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Analyze repo</span>
          </button>
        </div>
      </div>

      <form onSubmit={submitRepo} className="flex flex-col sm:flex-row gap-2">
        <div className="flex items-center gap-2 px-3 text-slate-400 rounded-xl bg-slate-950/80 border border-white/15 flex-1">
          <Search className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="github.com/owner/repo — switch repository"
            aria-label="Repository URL to analyze"
            className="flex-1 bg-transparent py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none font-mono"
          />
        </div>
        <button
          type="submit"
          className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 transition-colors"
        >
          Load
        </button>
      </form>
      {inputError && (
        <p role="alert" className="-mt-6 text-xs text-rose-400 font-mono">
          {inputError}
        </p>
      )}

      {!repo ? (
        <EmptyBlock
          title="No repository selected"
          hint="Paste a github.com/owner/repo URL above, or open the analyzer to pick one."
        />
      ) : loading && !record ? (
        <div className="space-y-4">
          <LoadingSkeleton lines={2} label="Loading analysis" />
          <LoadingSkeleton lines={4} label="Loading metrics" />
        </div>
      ) : error ? (
        <ErrorBlock message={error} onRetry={refresh} />
      ) : !record ? (
        <EmptyBlock
          title={`'${repo.owner}/${repo.repo}' hasn't been analyzed yet`}
          hint="Run an analysis to generate security, quality, and architecture results from live GitHub data."
        />
      ) : record.status === "FAILED" ? (
        <ErrorBlock
          message={record.error_message || "Analysis failed."}
          onRetry={() => setIsModalOpen(true)}
        />
      ) : (
        <>
          <CompactEngineeringSnapshot repo={repo} record={record} />

          <RepositoryCard
            name={r?.name || repo.repo}
            owner={r?.owner || repo.owner}
            url={r?.url || `https://github.com/${repo.owner}/${repo.repo}`}
            defaultBranch={r?.requested_branch || r?.default_branch || "main"}
            commitSha={r?.commit_sha}
            framework={[
              r?.language,
              r?.license,
            ]
              .filter(Boolean)
              .join(" · ")}
            isPrivate={false}
            stars={r?.stars}
            forks={r?.forks}
            openIssues={r?.open_issues}
            description={r?.description}
          />

          {health?.confidence_rating && (
            <div className="flex flex-wrap items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
              <span className="text-slate-400 font-mono font-semibold">Evidence Confidence:</span>
              <span className={`px-2.5 py-0.5 rounded-full font-mono text-[11px] font-semibold border ${
                health.confidence_rating === "High"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : health.confidence_rating === "Medium"
                    ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                    : health.confidence_rating === "Low"
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      : "bg-slate-500/10 text-slate-400 border-slate-500/20"
              }`}>
                {health.confidence_rating}
              </span>
              {health.confidence_reason && (
                <span className="text-slate-400 text-xs">
                  — {health.confidence_reason}
                </span>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <ScoreWidget
              title="Overall Health"
              score={health?.overall_health_score ?? null}
              grade={health?.health_grade || "—"}
              confidence={health?.confidence_rating}
              formula={formulas.overall_health_score}
              weight="100%"
            />
            <ScoreWidget
              title="Security"
              score={ind.security_score ?? null}
              grade={ind.security_score != null ? "Measured" : "—"}
              confidence={health?.confidence_rating}
              formula={formulas.security}
              weight="20%"
              active={selectedTab === "security"}
              onClick={() => handleScoreClick("security")}
            />
            <ScoreWidget
              title="Code Quality"
              score={ind.code_quality_score ?? null}
              grade={ind.code_quality_score != null ? "Measured" : "—"}
              confidence={health?.confidence_rating}
              formula={formulas.quality}
              weight="20%"
              active={selectedTab === "quality"}
              onClick={() => handleScoreClick("quality")}
            />
            <ScoreWidget
              title="Architecture"
              score={ind.architecture_score ?? null}
              grade={ind.architecture_score != null ? "Measured" : "—"}
              confidence={health?.confidence_rating}
              formula={formulas.architecture}
              weight="15%"
              active={selectedTab === "architecture"}
              onClick={() => handleScoreClick("architecture")}
            />
          </div>

          <PriorityFixesWidget
            record={record}
            onInspectFile={(file) => {
              handleScoreClick("quality");
            }}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WhatChangedWidget repo={repo} currentRecord={record} />
            <HealthTimelineWidget
              repo={repo}
              currentAnalysisId={record?.analysis_id}
              onSelectAnalysis={(id) => {
                setLoading(true);
                apiFetch<FullRecord>(`/api/v1/analysis/${id}`)
                  .then((d) => setRecord(d))
                  .finally(() => setLoading(false));
              }}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <PillarChartWidget
                pillars={pillars}
                onSelectPillar={(tabId) => handleScoreClick(tabId)}
              />
            </div>
            <div className="lg:col-span-1">
              <DevelopmentActivityWidget
                recentCommits={r?.recent_commits}
                topContributors={r?.top_contributors}
              />
            </div>
            <div className="lg:col-span-1">
              <RecentAnalysisWidget repo={repo} />
            </div>
          </div>

          <AnalysisDetailTabs
            record={record}
            selectedTab={selectedTab}
            onTabChange={setSelectedTab}
          />
        </>
      )}

      <AnalyzeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialUrl={repo ? `https://github.com/${repo.owner}/${repo.repo}` : ""}
        onAnalysisComplete={onComplete}
      />
    </motion.div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<LoadingSkeleton lines={5} label="Loading dashboard" />}>
      <DashboardInner />
    </Suspense>
  );
}
