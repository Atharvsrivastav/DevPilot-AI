"use client";

import React, { Suspense, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Cpu, FileCode } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { useRepo, repoKey, repoQuery } from "@/lib/useRepo";
import {
  LoadingSkeleton,
  ErrorBlock,
  EmptyBlock,
} from "@/components/StateBlocks";

interface QualityFinding {
  id?: string;
  severity?: string;
  title?: string;
  issue_type?: string;
  file_path?: string;
  affected_file?: string;
  line_number?: number;
  description?: string;
  recommendation?: string;
}

interface QualityData {
  status?: string;
  quality_score?: number | null;
  total_issues?: number | null;
  high_complexity_count?: number | null;
  large_files_count?: number | null;
  raw_metrics?: Record<string, unknown> | null;
  findings?: QualityFinding[];
  error?: string | null;
}

interface QualityRecord {
  status: string;
  error_message?: string | null;
  quality?: QualityData | null;
}

const SEVERITIES = ["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"];

function metricNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function CodeQualityInner() {
  const repo = useRepo();
  const [record, setRecord] = useState<QualityRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>("ALL");

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
    apiFetch<QualityRecord>(`/api/v1/analysis/by-repo?${repoQuery(repo)}`)
      .then((data) => {
        if (!cancelled) setRecord(data);
      })
      .catch((e) => {
        if (!cancelled) {
          if (e instanceof ApiError && e.status === 404) {
            setRecord(null); // never analyzed — empty state, not an error
          } else {
            setError(
              e instanceof ApiError ? e.message : "Failed to load analysis."
            );
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

  const refresh = () => {
    if (!repo) return;
    setLoading(true);
    setError(null);
    apiFetch<QualityRecord>(`/api/v1/analysis/by-repo?${repoQuery(repo)}`)
      .then(setRecord)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 404) setRecord(null);
        else
          setError(
            e instanceof ApiError ? e.message : "Failed to load analysis."
          );
      })
      .finally(() => setLoading(false));
  };

  const quality = record?.quality ?? null;
  const findings = quality?.findings ?? [];
  const filtered =
    filterSeverity === "ALL"
      ? findings
      : findings.filter(
          (f) => (f.severity || "").toUpperCase() === filterSeverity
        );

  const qualityScore = quality?.quality_score ?? null;
  const rawMetrics = quality?.raw_metrics ?? {};
  const totalIssues = quality?.total_issues ?? findings.length;
  const highComplexity =
    quality?.high_complexity_count ??
    metricNumber(rawMetrics.high_complexity_count);
  const largeFiles =
    quality?.large_files_count ??
    metricNumber(rawMetrics.large_files_count);

  const metrics = [
    {
      label: "Code Quality Score",
      value:
        qualityScore !== null && qualityScore !== undefined
          ? `${qualityScore} / 100`
          : "—",
      status:
        qualityScore == null
          ? "Not available"
          : qualityScore >= 80
            ? "Optimal"
            : "Needs Review",
    },
    {
      label: "Total Issues",
      value: `${totalIssues}`,
      status: "Flagged",
    },
    {
      label: "High Complexity",
      value: highComplexity != null ? `${highComplexity}` : "—",
      status: "Functions",
    },
    {
      label: "Large Files",
      value: largeFiles != null ? `${largeFiles}` : "—",
      status: "Tracked",
    },
  ];

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
            <Cpu className="w-4 h-4" />
            <span>Code Quality Engine</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight linear-gradient-text">
            Code Quality & Maintainability Analysis
          </h1>
          <p className="text-xs text-slate-400">
            {repo
              ? `Live quality results for ${repo.owner}/${repo.repo}: cyclomatic complexity, dead code, unused imports, and refactoring targets.`
              : "Scans cyclomatic complexity, dead code, unused imports, and refactoring priority index."}
          </p>
        </div>
      </div>

      {!repo ? (
        <EmptyBlock
          title="No repository selected"
          hint="Add ?owner=<owner>&repo=<repo> to the URL, or pick a repository from the dashboard."
        />
      ) : loading && !record ? (
        <div className="space-y-4">
          <LoadingSkeleton lines={2} label="Loading quality metrics" />
          <LoadingSkeleton lines={4} label="Loading quality findings" />
        </div>
      ) : error ? (
        <ErrorBlock message={error} onRetry={refresh} />
      ) : !record ? (
        <EmptyBlock
          title={`'${repo.owner}/${repo.repo}' hasn't been analyzed yet`}
          hint="Run an analysis to generate code quality results from live GitHub data."
        />
      ) : record.status === "FAILED" ? (
        <ErrorBlock
          message={record.error_message || "Analysis failed."}
          onRetry={refresh}
        />
      ) : !quality ? (
        <EmptyBlock
          title="Quality data unavailable"
          hint="This analysis did not produce code quality results. Run a fresh analysis to generate them."
        />
      ) : (
        <>
          {/* Metrics Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {metrics.map((m) => (
              <div key={m.label} className="glass-panel p-5 rounded-md space-y-1">
                <div className="text-xs font-semibold text-slate-400 uppercase">
                  {m.label}
                </div>
                <div className="text-2xl font-black text-cyan-400 font-mono">
                  {m.value}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Status: {m.status}
                </div>
              </div>
            ))}
          </div>

          {/* Severity Filter Bar */}
          <div className="flex flex-wrap items-center gap-2">
            {SEVERITIES.map((sev) => (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  filterSeverity === sev
                    ? "bg-slate-100 text-slate-950"
                    : "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5"
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          {/* Quality Findings */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">
              Quality Smells & Refactoring Targets
            </h3>
            <div className="space-y-4">
              {filtered.length === 0 ? (
                <EmptyBlock
                  title="No issues detected by current checks"
                  hint="The quality checks that ran reported no findings at this severity. This reflects only the checks that ran — not a guarantee of full code health."
                />
              ) : (
                filtered.map((item, idx) => (
                  <div
                    key={item.id || `${item.file_path || item.affected_file}-${item.line_number}-${idx}`}
                    className="glass-panel p-6 rounded-lg space-y-3 border border-white/10"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                        {item.issue_type || item.severity || "Quality"}
                      </span>
                      {item.line_number != null && (
                        <span className="text-xs font-mono text-slate-500">
                          Line {item.line_number}
                        </span>
                      )}
                    </div>
                    <h4 className="text-base font-bold text-white">
                      {item.title || item.issue_type || item.id || "Finding"}
                    </h4>
                    <div className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                      <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                      <span>
                        {item.file_path || item.affected_file || "location not reported"}
                        {item.line_number != null ? `:L${item.line_number}` : ""}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-slate-300">{item.description}</p>
                    )}
                    {item.recommendation && (
                      <div className="text-xs font-medium text-slate-300 bg-white/5 p-3 rounded-xl border border-white/5">
                        <strong>Refactoring Advice:</strong> {item.recommendation}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}

export default function CodeQualityPage() {
  return (
    <Suspense
      fallback={<LoadingSkeleton lines={4} label="Loading quality page" />}
    >
      <CodeQualityInner />
    </Suspense>
  );
}
