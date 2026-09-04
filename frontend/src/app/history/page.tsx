"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  History as HistoryIcon,
  GitCommit,
  Calendar,
  Search,
  Filter,
  ArrowUpDown,
  GitPullRequest,
  CheckCircle2,
  X,
  ExternalLink,
} from "lucide-react";
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
  health?: {
    overall_health_score?: number | null;
    health_grade?: string;
    individual_scores?: Record<string, number | null>;
  } | null;
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
  const router = useRouter();
  const [historyList, setHistoryList] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters and Sorting
  const [searchFilter, setSearchFilter] = useState("");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "score_desc" | "score_asc">("date_desc");

  // Comparison State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  const [compareData, setCompareData] = useState<{ runA: any; runB: any } | null>(null);
  const [loadingCompare, setLoadingCompare] = useState(false);

  const key = repo ? repoKey(repo) : "all";

  useEffect(() => {
    let cancelled = false;
    setHistoryList([]);
    setError(null);
    setLoading(true);
    setSelectedIds([]);
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
  }, [key]);

  const filteredHistory = useMemo(() => {
    let list = [...historyList];
    const q = searchFilter.trim().toLowerCase();

    if (q) {
      list = list.filter((item) => {
        const name = repoLabel(item).toLowerCase();
        const sha = (commitOf(item) || "").toLowerCase();
        const id = (item.analysis_id || "").toLowerCase();
        return name.includes(q) || sha.includes(q) || id.includes(q);
      });
    }

    list.sort((a, b) => {
      if (sortBy === "date_desc") {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
      if (sortBy === "date_asc") {
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      }
      if (sortBy === "score_desc") {
        return (b.health?.overall_health_score ?? -1) - (a.health?.overall_health_score ?? -1);
      }
      if (sortBy === "score_asc") {
        return (a.health?.overall_health_score ?? 999) - (b.health?.overall_health_score ?? 999);
      }
      return 0;
    });

    return list;
  }, [historyList, searchFilter, sortBy]);

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      if (selectedIds.length >= 2) {
        setSelectedIds([selectedIds[1], id]);
      } else {
        setSelectedIds([...selectedIds, id]);
      }
    }
  };

  const handleStartCompare = async () => {
    if (selectedIds.length !== 2) return;
    setLoadingCompare(true);
    setComparing(true);
    try {
      const [runA, runB] = await Promise.all([
        apiFetch<any>(`/api/v1/analysis/${selectedIds[0]}`),
        apiFetch<any>(`/api/v1/analysis/${selectedIds[1]}`),
      ]);
      setCompareData({ runA, runB });
    } catch {
      setCompareData(null);
    } finally {
      setLoadingCompare(false);
    }
  };

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
            <HistoryIcon className="w-4 h-4" />
            <span>Audit Trail & Historical Analysis Log</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono">
            Analysis History
          </h1>
          <p className="text-xs text-slate-400">
            {repo
              ? `Audit trail for ${repo.owner}/${repo.repo} — track score drift, compare revisions, and drill into historical findings.`
              : "Global repository analysis audit log."}
          </p>
        </div>

        {selectedIds.length === 2 && (
          <button
            onClick={handleStartCompare}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono transition-colors flex items-center gap-2 shadow-lg shadow-cyan-500/20"
          >
            <GitPullRequest className="w-4 h-4" />
            <span>Compare Selected (2)</span>
          </button>
        )}
      </div>

      {/* Filter and Sort Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 px-3 text-slate-400 rounded-xl bg-slate-950/80 border border-slate-800 flex-1">
          <Search className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search by repo name, commit SHA, or analysis ID..."
            className="flex-1 bg-transparent py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
          />
        </div>

        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-slate-400">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
          >
            <option value="date_desc" className="bg-slate-900">Newest Date First</option>
            <option value="date_asc" className="bg-slate-900">Oldest Date First</option>
            <option value="score_desc" className="bg-slate-900">Highest Score First</option>
            <option value="score_asc" className="bg-slate-900">Lowest Score First</option>
          </select>
        </div>
      </div>

      {/* History Table List */}
      <div className="rounded-xl bg-slate-900/50 border border-slate-800 overflow-hidden">
        <div className="divide-y divide-slate-800/80 font-mono text-xs">
          {loading && historyList.length === 0 ? (
            <div className="p-6">
              <LoadingSkeleton lines={3} label="Loading analysis history" />
            </div>
          ) : error ? (
            <div className="p-6">
              <ErrorBlock message={error} onRetry={retry} />
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="p-8">
              <EmptyBlock
                title={
                  repo
                    ? `No analyses recorded for '${repo.owner}/${repo.repo}'`
                    : "No analysis records stored yet"
                }
                hint="Run an analysis from the dashboard."
              />
            </div>
          ) : (
            filteredHistory.map((item) => {
              const commit = commitOf(item);
              const score = item.health?.overall_health_score;
              const isSelected = selectedIds.includes(item.analysis_id);

              return (
                <div
                  key={item.analysis_id}
                  className={`p-4 flex items-center justify-between gap-4 transition-colors ${
                    isSelected ? "bg-slate-800/50" : "hover:bg-slate-900/80"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(item.analysis_id)}
                      className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-cyan-500/20 cursor-pointer"
                    />

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-200">
                          {repoLabel(item)}
                        </span>
                        {commit && (
                          <span className="text-[11px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1">
                            <GitCommit className="w-3 h-3 text-emerald-400" />
                            {commit.slice(0, 7)}
                          </span>
                        )}
                        <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {item.status || "COMPLETED"}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 flex items-center gap-3">
                        <span>ID: {item.analysis_id}</span>
                        <span>·</span>
                        <span>
                          {item.created_at
                            ? new Date(item.created_at).toLocaleString()
                            : ""}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-base font-bold text-white">
                        {score != null ? score : "—"}
                        <span className="text-[10px] text-slate-500 font-normal"> / 100</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-sans">Health Score</div>
                    </div>

                    <button
                      onClick={() => {
                        const r = item.repository;
                        if (r?.owner && r?.name) {
                          router.push(`/dashboard?owner=${r.owner}&repo=${r.name}`);
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                    >
                      View
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Comparison Modal */}
      <AnimatePresence>
        {comparing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <GitPullRequest className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-lg font-bold text-white font-mono">
                    Repository Comparison Engine
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setComparing(false);
                    setCompareData(null);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loadingCompare || !compareData ? (
                <div className="p-12 text-center text-xs font-mono text-slate-500">
                  Loading side-by-side comparison data...
                </div>
              ) : (
                <div className="space-y-6 font-mono text-xs">
                  {/* Summary Comparison Header */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                      <div className="text-slate-400 text-[10px] uppercase">Analysis Run A</div>
                      <div className="text-sm font-bold text-slate-200">
                        {compareData.runA.repository?.owner}/{compareData.runA.repository?.name}
                      </div>
                      <div className="text-[11px] text-emerald-400">
                        Commit: {compareData.runA.repository?.commit_sha?.slice(0, 7) || "HEAD"}
                      </div>
                      <div className="text-base font-black text-white pt-2">
                        Health: {compareData.runA.health?.overall_health_score ?? "—"}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                      <div className="text-slate-400 text-[10px] uppercase">Analysis Run B</div>
                      <div className="text-sm font-bold text-slate-200">
                        {compareData.runB.repository?.owner}/{compareData.runB.repository?.name}
                      </div>
                      <div className="text-[11px] text-emerald-400">
                        Commit: {compareData.runB.repository?.commit_sha?.slice(0, 7) || "HEAD"}
                      </div>
                      <div className="text-base font-black text-white pt-2">
                        Health: {compareData.runB.health?.overall_health_score ?? "—"}
                      </div>
                    </div>
                  </div>

                  {/* Score Deltas Table */}
                  <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950">
                    <div className="p-3 bg-slate-900/60 font-bold text-slate-300 border-b border-slate-800">
                      Pillar Score Deltas
                    </div>
                    <div className="divide-y divide-slate-800/80">
                      {[
                        { key: "security_score", label: "Security" },
                        { key: "code_quality_score", label: "Code Quality" },
                        { key: "architecture_score", label: "Architecture" },
                        { key: "testing_score", label: "Testing" },
                        { key: "dependencies_score", label: "Dependencies" },
                        { key: "documentation_score", label: "Documentation" },
                        { key: "activity_score", label: "Activity" },
                      ].map((pillar) => {
                        const scoreA = compareData.runA.health?.individual_scores?.[pillar.key];
                        const scoreB = compareData.runB.health?.individual_scores?.[pillar.key];
                        const delta =
                          scoreA != null && scoreB != null
                            ? Math.round((scoreB - scoreA) * 10) / 10
                            : null;

                        return (
                          <div key={pillar.key} className="p-3 grid grid-cols-4 items-center">
                            <span className="font-semibold text-slate-300">{pillar.label}</span>
                            <span className="text-center text-slate-400">{scoreA ?? "—"}</span>
                            <span className="text-center text-slate-400">{scoreB ?? "—"}</span>
                            <span className={`text-right font-bold ${
                              delta == null
                                ? "text-slate-500"
                                : delta > 0
                                  ? "text-emerald-400"
                                  : delta < 0
                                    ? "text-rose-400"
                                    : "text-slate-400"
                            }`}>
                              {delta != null ? (delta > 0 ? `+${delta}` : delta) : "—"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<LoadingSkeleton lines={4} label="Loading analysis history" />}>
      <HistoryInner />
    </Suspense>
  );
}
