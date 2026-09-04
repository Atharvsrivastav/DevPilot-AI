"use client";

import React, { Suspense, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Cpu,
  GitPullRequest,
  Sparkles,
  Package,
  FlaskConical,
  Gauge,
  FileText,
  BookOpen,
  Calculator,
  Download,
  Share2,
} from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { useRepo, repoKey, repoQuery } from "@/lib/useRepo";
import { AnalysisDetailTabs } from "@/components/AnalysisDetailTabs";
import {
  LoadingSkeleton,
  ErrorBlock,
  EmptyBlock,
} from "@/components/StateBlocks";

type AnyRecord = Record<string, unknown>;

interface PillarSection {
  score?: number | null;
  findings?: unknown[];
  evidence?: unknown[];
  reasons?: string[];
  summary?: string;
  status?: string;
}

function asSection(value: unknown): PillarSection | null {
  if (!value || typeof value !== "object") return null;
  return value as PillarSection;
}

function findingsCount(value: unknown): number | null {
  const s = asSection(value);
  if (!s) return null;
  return Array.isArray(s.findings) ? s.findings.length : 0;
}

function scoreOf(value: unknown): number | null {
  const s = asSection(value);
  return typeof s?.score === "number" ? s.score : null;
}

function AnalysisInner() {
  const repo = useRepo();
  const [record, setRecord] = useState<AnyRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    apiFetch<AnyRecord>(`/api/v1/analysis/by-repo?${repoQuery(repo)}`)
      .then((data) => {
        if (!cancelled) setRecord(data);
      })
      .catch((e: unknown) => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const refresh = () => {
    if (!repo) return;
    setLoading(true);
    setError(null);
    apiFetch<AnyRecord>(`/api/v1/analysis/by-repo?${repoQuery(repo)}`)
      .then(setRecord)
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 404) setRecord(null);
        else setError(e instanceof ApiError ? e.message : "Failed to load analysis.");
      })
      .finally(() => setLoading(false));
  };

  const rec = record as
    | (AnyRecord & {
        analysis_id?: string;
        status?: string;
        error_message?: string | null;
        repository?: {
          owner?: string;
          name?: string;
          url?: string;
          requested_branch?: string | null;
          default_branch?: string | null;
          commit_sha?: string | null;
          description?: string | null;
          language?: string | null;
          license?: string | null;
        };
        health?: {
          overall_health_score?: number | null;
          health_grade?: string;
          individual_scores?: Record<string, number | null>;
          formulas_used?: Record<string, string>;
        } | null;
        ai_reviewer?: {
          status?: string;
          error?: string;
          repository_summary?: string;
        } | null;
      })
    | null;

  const r = rec?.repository;
  const health = rec?.health;
  const formulas = health?.formulas_used || {};
  const formulaEntries = Object.entries(formulas);

  const pillars = [
    { name: "Security", icon: ShieldCheck, value: rec?.security, color: "text-rose-400" },
    { name: "Code Quality", icon: Cpu, value: rec?.quality, color: "text-cyan-400" },
    { name: "Architecture", icon: GitPullRequest, value: rec?.architecture, color: "text-indigo-400" },
    { name: "Documentation", icon: BookOpen, value: rec?.documentation, color: "text-purple-400" },
    { name: "Dependencies", icon: Package, value: rec?.dependencies, color: "text-teal-400" },
    { name: "Testing", icon: FlaskConical, value: rec?.testing, color: "text-emerald-400" },
    { name: "Performance", icon: Gauge, value: rec?.performance_signals, color: "text-amber-400" },
  ];

  const ai = rec?.ai_reviewer;
  const aiAvailable =
    !!ai && ai.status !== "unavailable" && ai.status !== "failed";

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 max-w-7xl mx-auto py-8 px-4 sm:px-6"
    >
      {!repo ? (
        <EmptyBlock
          title="No repository selected"
          hint="Pick a repository from the dashboard (owner/repo in the URL) to view its analysis report."
        />
      ) : loading && !record ? (
        <div className="space-y-4">
          <LoadingSkeleton lines={2} label="Loading report" />
          <LoadingSkeleton lines={4} label="Loading findings" />
        </div>
      ) : error ? (
        <ErrorBlock message={error} onRetry={refresh} />
      ) : !record || !rec ? (
        <EmptyBlock
          title={`'${repo.owner}/${repo.repo}' hasn't been analyzed yet`}
          hint="Run an analysis from the dashboard to generate this report from live GitHub data."
        />
      ) : rec.status === "FAILED" ? (
        <ErrorBlock
          message={rec.error_message || "Analysis failed."}
          onRetry={refresh}
        />
      ) : (
        <>
          {/* Report Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
                <span>Report ID: {rec.analysis_id || "—"}</span>
                <span>•</span>
                <span>Calculated from Measurable AST Data</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight linear-gradient-text">
                Repository Evidence & Analysis Report
              </h1>
              <p className="text-xs text-slate-400 font-mono">
                Repository: {r?.owner || repo.owner}/{r?.name || repo.repo}{" "}
                (Branch: {r?.requested_branch || r?.default_branch || "main"})
                {r?.commit_sha ? ` • commit ${r.commit_sha.slice(0, 7)}` : ""}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button className="px-4 py-2 text-xs font-semibold rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Report</span>
              </button>
              <button className="px-4 py-2 text-xs font-semibold rounded-md bg-slate-100 hover:bg-white text-slate-950 transition-colors flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" />
                <span>Export PDF</span>
              </button>
            </div>
          </div>

          {/* Repo Overview */}
          <div className="glass-panel p-6 rounded-lg space-y-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              Repository Overview
            </h3>
            {r?.description && (
              <p className="text-xs text-slate-400 leading-relaxed">
                {r.description}
              </p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-950/80 border border-white/5">
                <div className="text-slate-500 uppercase text-[10px]">
                  Health Score
                </div>
                <div className="text-lg font-black text-white">
                  {health?.overall_health_score ?? "—"}
                  {health?.health_grade ? (
                    <span className="ml-2 text-xs text-cyan-400">
                      {health.health_grade}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-white/5">
                <div className="text-slate-500 uppercase text-[10px]">
                  Primary Language
                </div>
                <div className="text-sm font-bold text-white">
                  {r?.language || "—"}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-white/5">
                <div className="text-slate-500 uppercase text-[10px]">License</div>
                <div className="text-sm font-bold text-white">
                  {r?.license || "—"}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-white/5">
                <div className="text-slate-500 uppercase text-[10px]">
                  AI Insights
                </div>
                <div className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  {aiAvailable ? "AI-generated" : "Unavailable"}
                </div>
              </div>
            </div>
          </div>

          {/* Transparent Formula & Raw Evidence Inspector */}
          <div className="glass-panel p-6 rounded-lg space-y-4 border border-cyan-500/30">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Calculator className="w-5 h-5 text-cyan-400" />
              Transparent Score Derivation & Evidence Audit
            </h3>

            {formulaEntries.length === 0 ? (
              <p className="text-xs font-mono text-slate-500">
                No score formulas reported for this analysis.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                {formulaEntries.map(([name, formula]) => (
                  <div
                    key={name}
                    className="p-4 rounded-md bg-slate-950/80 border border-white/5 space-y-2"
                  >
                    <div className="text-slate-400 font-bold uppercase">
                      {name}
                    </div>
                    <div className="text-cyan-300 break-words">{formula}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pillar findings counts */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {pillars.map((p) => {
              const Icon = p.icon;
              const count = findingsCount(p.value);
              const score = scoreOf(p.value);
              return (
                <div
                  key={p.name}
                  className="p-4 rounded-md bg-slate-950/60 border border-white/5 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${p.color}`} />
                    <span className="text-xs font-bold text-white">
                      {p.name}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 font-mono">
                    <span className="text-xl font-black text-white">
                      {count ?? "—"}
                    </span>
                    <span className="text-[11px] text-slate-500">findings</span>
                    {score != null && (
                      <span className="ml-auto text-xs text-cyan-300">
                        {score}/100
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            <div className="p-4 rounded-md bg-slate-950/60 border border-amber-500/20 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span className="text-xs font-bold text-white">AI Insights</span>
              </div>
              <div className="text-[11px] font-mono text-amber-300/80 uppercase tracking-wider">
                {aiAvailable ? "AI-generated" : "Unavailable"}
              </div>
              {!aiAvailable && (
                <p className="text-[11px] text-slate-500">
                  Deterministic results above are unaffected.
                </p>
              )}
            </div>
          </div>

          <AnalysisDetailTabs record={record} />
        </>
      )}
    </motion.div>
  );
}

export default function AnalysisPage() {
  return (
    <Suspense fallback={<LoadingSkeleton lines={4} label="Loading report" />}>
      <AnalysisInner />
    </Suspense>
  );
}
