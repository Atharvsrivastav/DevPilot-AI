"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  RepositoryCard,
  ScoreWidget,
  PillarChartWidget,
  RecentAnalysisWidget,
} from "@/components/DashboardWidgets";
import { AnalyzeModal, type AnalysisRecord } from "@/components/AnalyzeModal";
import { AnalysisDetailTabs } from "@/components/AnalysisDetailTabs";
import { LoadingSkeleton, ErrorBlock, EmptyBlock } from "@/components/StateBlocks";
import { Sparkles, RefreshCw, Plus, Search } from "lucide-react";
import { apiFetch, ApiError, parseRepoInput, repoSearch } from "@/lib/api";
import { useRepo, repoKey, repoQuery, withRepo } from "@/lib/useRepo";

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
  };
  health?: {
    overall_health_score?: number | null;
    health_grade?: string;
    individual_scores?: Record<string, number | null>;
    formulas_used?: Record<string, string>;
  } | null;
  dependencies?: { score?: number } | null;
  testing?: { score?: number } | null;
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
        if (!cancelled) setRecord(data);
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
    router.push(`/dashboard${repoSearch(parsed.owner, parsed.name)}`);
  };

  const refresh = () => {
    if (!repo) return;
    setLoading(true);
    setError(null);
    apiFetch<FullRecord>(`/api/v1/analysis/by-repo?${repoQuery(repo)}`)
      .then(setRecord)
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
      router.push(
        `/dashboard${repoSearch(rec.repository.owner, rec.repository.name)}`
      );
    }
  };

  const r = record?.repository;
  const health = record?.health;
  const ind = health?.individual_scores || {};
  const formulas = health?.formulas_used || {};

  const pillars = [
    { name: "Security", score: ind.security_score ?? null, color: "bg-emerald-400" },
    { name: "Code Quality", score: ind.code_quality_score ?? null, color: "bg-cyan-400" },
    { name: "Architecture", score: ind.architecture_score ?? null, color: "bg-indigo-400" },
    { name: "Performance Signals", score: ind.performance_score ?? null, color: "bg-amber-400" },
    { name: "Documentation", score: ind.documentation_score ?? null, color: "bg-purple-400" },
    { name: "Dependencies", score: ind.dependencies_score ?? null, color: "bg-teal-400" },
    { name: "Testing", score: ind.testing_score ?? null, color: "bg-rose-400" },
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
          <RepositoryCard
            name={r?.name || repo.repo}
            owner={r?.owner || repo.owner}
            url={r?.url || `https://github.com/${repo.owner}/${repo.repo}`}
            defaultBranch={r?.requested_branch || r?.default_branch || "main"}
            framework={[
              r?.language,
              r?.license,
              r?.commit_sha ? `commit ${r.commit_sha}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
            isPrivate={false}
          />

          {(r?.stars != null || r?.forks != null || r?.open_issues != null) && (
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs font-mono text-slate-400">
              {r?.stars != null && <span>★ {r.stars} stars</span>}
              {r?.forks != null && <span>⑂ {r.forks} forks</span>}
              {r?.open_issues != null && <span>◉ {r.open_issues} open issues</span>}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <ScoreWidget
              title="Overall Health"
              score={health?.overall_health_score ?? null}
              grade={health?.health_grade || "—"}
              icon="health"
              formula={formulas.overall_health_score}
            />
            <ScoreWidget
              title="Security"
              score={ind.security_score ?? null}
              grade={ind.security_score != null ? "Measured" : "—"}
              icon="security"
              formula={formulas.security}
            />
            <ScoreWidget
              title="Architecture"
              score={ind.architecture_score ?? null}
              grade={ind.architecture_score != null ? "Measured" : "—"}
              icon="health"
              formula={formulas.architecture}
            />
            <ScoreWidget
              title="Code Quality"
              score={ind.code_quality_score ?? null}
              grade={ind.code_quality_score != null ? "Measured" : "—"}
              icon="health"
              formula={formulas.quality}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PillarChartWidget pillars={pillars} />
            <RecentAnalysisWidget repo={repo} />
          </div>

          <AnalysisDetailTabs record={record} />
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
