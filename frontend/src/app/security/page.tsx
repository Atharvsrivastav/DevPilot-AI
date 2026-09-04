"use client";

import React, { Suspense, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, FileCode, Calculator } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { useRepo, repoKey, repoQuery } from "@/lib/useRepo";
import {
  LoadingSkeleton,
  ErrorBlock,
  EmptyBlock,
} from "@/components/StateBlocks";

interface SecurityFinding {
  id?: string;
  severity?: string;
  title?: string;
  issue_type?: string;
  affected_file?: string;
  file_path?: string;
  line_number?: number;
  description?: string;
  recommendation?: string;
  scanner_source?: string;
}

interface SecurityRecord {
  status: string;
  error_message?: string | null;
  security?: {
    status?: string;
    findings?: SecurityFinding[];
  } | null;
}

const SEVERITIES = ["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"];

function SecurityInner() {
  const repo = useRepo();
  const [record, setRecord] = useState<SecurityRecord | null>(null);
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
    apiFetch<SecurityRecord>(`/api/v1/analysis/by-repo?${repoQuery(repo)}`)
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
    apiFetch<SecurityRecord>(`/api/v1/analysis/by-repo?${repoQuery(repo)}`)
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

  const findings = record?.security?.findings ?? [];
  const filtered =
    filterSeverity === "ALL"
      ? findings
      : findings.filter(
          (v) => (v.severity || "").toUpperCase() === filterSeverity
        );

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 max-w-7xl mx-auto py-8 px-4 sm:px-6"
    >
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-rose-400">
            <ShieldAlert className="w-4 h-4" />
            <span>Multi-Engine Security Scanner (Gitleaks + Semgrep + Trivy)</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight linear-gradient-text">
            Security Vulnerabilities & CVE Audit
          </h1>
          <p className="text-xs text-slate-400">
            {repo
              ? `Live findings for ${repo.owner}/${repo.repo}. Scans for hardcoded secrets, SQL injection, XSS, CSRF, and unsafe dependencies.`
              : "Scans for hardcoded secrets, SQL injection, XSS, CSRF, and unsafe dependencies."}
          </p>
        </div>
      </div>

      {/* Transparent Formula Callout */}
      <div className="glass-panel p-4 rounded-md border border-rose-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 text-rose-400 font-bold">
          <Calculator className="w-4 h-4" />
          <span>Security Score Formula:</span>
          <span className="text-white font-normal">100 - (Critical*25 + High*15 + Medium*8 + Low*3)</span>
        </div>
        <div className="text-slate-400 text-[11px]">
          Sources: Semgrep, Gitleaks, Trivy, npm audit
        </div>
      </div>

      {!repo ? (
        <EmptyBlock
          title="No repository selected"
          hint="Add ?owner=<owner>&repo=<repo> to the URL, or pick a repository from the dashboard."
        />
      ) : loading && !record ? (
        <LoadingSkeleton lines={4} label="Loading security scan results" />
      ) : error ? (
        <ErrorBlock message={error} onRetry={refresh} />
      ) : !record ? (
        <EmptyBlock
          title={`'${repo.owner}/${repo.repo}' hasn't been analyzed yet`}
          hint="Run an analysis to generate security findings from live GitHub data."
        />
      ) : record.status === "FAILED" ? (
        <ErrorBlock
          message={record.error_message || "Analysis failed."}
          onRetry={refresh}
        />
      ) : (
        <>
          {/* Severity Filter Bar */}
          <div className="flex flex-wrap items-center gap-2">
            {SEVERITIES.map((sev) => (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  filterSeverity === sev
                    ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20"
                    : "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5"
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          {/* Vulnerability Cards List */}
          <div className="space-y-4">
            {filtered.length === 0 ? (
              <EmptyBlock
                title="No issues detected by current checks"
                hint="The scanners that ran reported no findings at this severity. This reflects only the checks that ran — not a guarantee that the repository is fully secure."
              />
            ) : (
              filtered.map((item, idx) => {
                const sev = (item.severity || "—").toUpperCase();
                return (
                  <div
                    key={item.id || `${item.file_path || item.affected_file}-${item.line_number}-${idx}`}
                    className="glass-panel p-6 rounded-lg space-y-3 border border-white/10 relative overflow-hidden"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-md ${
                            sev === "CRITICAL"
                              ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                              : sev === "HIGH"
                              ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                              : sev === "MEDIUM"
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                              : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                          }`}
                        >
                          {sev}
                        </span>
                        <h3 className="text-base font-bold text-white">
                          {item.title || item.issue_type || item.id || "Finding"}
                        </h3>
                      </div>
                      <div className="flex items-center gap-3 font-mono text-xs">
                        <span className="text-slate-400 text-[11px]">
                          Tool: {item.scanner_source || "Security Scanner"}
                        </span>
                        {item.id && (
                          <span className="text-slate-500">{item.id}</span>
                        )}
                      </div>
                    </div>

                    <div className="text-xs font-mono text-cyan-400 flex items-center gap-1.5">
                      <FileCode className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {item.affected_file || item.file_path || "location not reported"}
                        {item.line_number != null ? `:L${item.line_number}` : ""}
                      </span>
                    </div>

                    {item.description && (
                      <p className="text-xs text-slate-300">{item.description}</p>
                    )}

                    {item.recommendation && (
                      <div className="text-xs font-medium text-emerald-400 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                        <strong>Fix Recommendation:</strong> {item.recommendation}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}

export default function SecurityPage() {
  return (
    <Suspense
      fallback={<LoadingSkeleton lines={4} label="Loading security page" />}
    >
      <SecurityInner />
    </Suspense>
  );
}
