"use client";

import React, { Suspense, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { History as HistoryIcon, GitCommit, Calendar } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { useRepo, repoKey, repoQuery } from "@/lib/useRepo";
import {
  LoadingSkeleton,
  ErrorBlock,
  EmptyBlock,
} from "@/components/StateBlocks";

interface HistoryRepository {
  owner?: string;
  name?: string;
  commit_sha?: string | null;
  requested_branch?: string | null;
  default_branch?: string | null;
}

interface HistoryRow {
  analysis_id: string;
  repository?: HistoryRepository | null;
  repository_id?: string;
  commit_sha?: string | null;
  created_at?: string;
  status?: string;
  health?: { overall_health_score?: number | null } | null;
}

function repoLabel(item: HistoryRow): string {
  const r = item.repository;
  if (r?.owner && r?.name) return `${r.owner}/${r.name}`;
  if (item.repository_id) return item.repository_id;
  return "Repository";
}

function commitOf(item: HistoryRow): string | null {
  return item.repository?.commit_sha || item.commit_sha || null;
}

function HistoryInner() {
  const repo = useRepo();
  const [historyList, setHistoryList] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const key = repo ? repoKey(repo) : "all";

  useEffect(() => {
    let cancelled = false;
    setHistoryList([]); // clear stale rows immediately
    setError(null);
    setLoading(true);
    const qs = repo ? `?${repoQuery(repo)}` : "";
    apiFetch<HistoryRow[]>(`/api/v1/analysis/history${qs}`)
      .then((list) => {
        if (!cancelled) setHistoryList(Array.isArray(list) ? list : []);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(
            e instanceof ApiError ? e.message : "Failed to load history."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const retry = () => {
    setLoading(true);
    setError(null);
    const qs = repo ? `?${repoQuery(repo)}` : "";
    apiFetch<HistoryRow[]>(`/api/v1/analysis/history${qs}`)
      .then((list) => setHistoryList(Array.isArray(list) ? list : []))
      .catch((e: unknown) => {
        setError(e instanceof ApiError ? e.message : "Failed to load history.");
      })
      .finally(() => setLoading(false));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 max-w-7xl mx-auto py-8 px-4 sm:px-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
            <HistoryIcon className="w-4 h-4" />
            <span>Audit Trail & Analysis History</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight linear-gradient-text">
            Repository Analysis Log History
          </h1>
          <p className="text-xs text-slate-400">
            {repo
              ? `Filtered to ${repo.owner}/${repo.repo} — chronological audit log tracking score trends and previous scanning executions.`
              : "Chronological audit log tracking score trends and previous scanning executions."}
          </p>
        </div>
      </div>

      {/* History Table List */}
      <div className="glass-panel rounded-lg overflow-hidden border border-white/10">
        <div className="divide-y divide-white/10">
          {loading && historyList.length === 0 ? (
            <div className="p-4">
              <LoadingSkeleton lines={3} label="Loading analysis history" />
            </div>
          ) : error ? (
            <div className="p-4">
              <ErrorBlock message={error} onRetry={retry} />
            </div>
          ) : historyList.length === 0 ? (
            <div className="p-4">
              <EmptyBlock
                title={
                  repo
                    ? `No analyses recorded for '${repo.owner}/${repo.repo}' yet`
                    : "No analysis records stored yet"
                }
                hint="Run an analysis from the dashboard."
              />
            </div>
          ) : (
            historyList.map((item) => {
              const commit = commitOf(item);
              const score = item.health?.overall_health_score;
              return (
                <div
                  key={item.analysis_id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="space-y-1 font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">
                        {repoLabel(item)}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        {item.repository?.requested_branch ||
                          item.repository?.default_branch ||
                          "main"}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-2 flex-wrap">
                      <GitCommit className="w-3.5 h-3.5 text-cyan-400" />
                      <span>ID: {item.analysis_id}</span>
                      {commit && (
                        <>
                          <span>•</span>
                          <span>commit {commit.slice(0, 7)}</span>
                        </>
                      )}
                      <span>•</span>
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>
                        {item.created_at
                          ? new Date(item.created_at).toLocaleString()
                          : "Unknown time"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs font-mono text-slate-400">
                        Health Score
                      </div>
                      <div className="text-xl font-bold text-emerald-400 font-mono">
                        {score !== undefined && score !== null
                          ? `${score} / 100`
                          : "N/A"}
                      </div>
                    </div>
                    <span className="text-xs font-bold uppercase px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {item.status || "COMPLETED"}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<LoadingSkeleton lines={3} label="Loading history" />}>
      <HistoryInner />
    </Suspense>
  );
}
