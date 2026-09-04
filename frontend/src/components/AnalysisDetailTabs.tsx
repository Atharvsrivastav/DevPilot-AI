"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  Cpu,
  GitPullRequest,
  Sparkles,
  Package,
  FlaskConical,
  Gauge,
  FileCode,
} from "lucide-react";

interface Finding {
  id?: string;
  severity?: string;
  title?: string;
  issue_type?: string;
  type?: string;
  description?: string;
  affected_file?: string;
  file_path?: string;
  line_number?: number;
  line?: number;
  recommendation?: string;
  fix_recommendation?: string;
  scanner_source?: string;
  confidence?: string;
}

type AnyRecord = Record<string, any>;

function fileOf(f: Finding): string {
  return f.affected_file || f.file_path || "unknown file";
}
function lineOf(f: Finding): number {
  return f.line_number ?? f.line ?? 1;
}
function fixOf(f: Finding): string {
  return f.recommendation || f.fix_recommendation || "See finding details.";
}

function FindingCard({ f }: { f: Finding }) {
  const sev = (f.severity || "INFO").toUpperCase();
  const sevStyle =
    sev === "CRITICAL"
      ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
      : sev === "HIGH"
        ? "bg-orange-500/15 text-orange-300 border-orange-500/30"
        : sev === "MEDIUM"
          ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
          : "bg-slate-500/15 text-slate-300 border-slate-500/30";
  return (
    <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${sevStyle}`}>
            {sev}
          </span>
          <span className="text-sm font-semibold text-white truncate">
            {f.title || f.issue_type || f.type || "Finding"}
          </span>
        </div>
        {f.id && <span className="text-[11px] font-mono text-slate-500">{f.id}</span>}
      </div>
      <div className="text-xs font-mono text-cyan-300/90 flex items-center gap-1.5">
        <FileCode className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
        <span className="truncate">{fileOf(f)}:L{lineOf(f)}</span>
      </div>
      {f.description && <p className="text-xs text-slate-400 leading-relaxed">{f.description}</p>}
      <div className="text-xs text-emerald-300/90 bg-emerald-500/5 p-2.5 rounded-lg border border-emerald-500/15">
        <strong>Recommendation:</strong> {fixOf(f)}
      </div>
      {f.scanner_source && (
        <div className="text-[11px] font-mono text-slate-500">
          Source: {f.scanner_source}
          {f.confidence ? ` · Confidence: ${f.confidence}` : ""}
        </div>
      )}
    </div>
  );
}

function ModuleState({ section, children }: { section: AnyRecord | null | undefined; children: React.ReactNode }) {
  if (!section || section.status === "failed") {
    return (
      <div className="p-5 text-xs font-mono text-slate-500 text-center rounded-xl bg-white/[0.02] border border-white/5">
        {section?.error
          ? `This check failed: ${section.error}`
          : "This check did not run for this analysis."}
      </div>
    );
  }
  return <>{children}</>;
}

function ReasonList({ items }: { items: string[] }) {
  if (!items?.length) return null;
  return (
    <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
      {items.map((r, i) => (
        <li key={i}>{r}</li>
      ))}
    </ul>
  );
}

export function AnalysisDetailTabs({ record }: { record: AnyRecord | null }) {
  const [activeTab, setActiveTab] = useState<
    "security" | "quality" | "architecture" | "supply" | "insights"
  >("security");

  const security: AnyRecord | null = record?.security ?? null;
  const quality: AnyRecord | null = record?.quality ?? null;
  const architecture: AnyRecord | null = record?.architecture ?? null;
  const dependencies: AnyRecord | null = record?.dependencies ?? null;
  const testing: AnyRecord | null = record?.testing ?? null;
  const performance: AnyRecord | null = record?.performance_signals ?? null;
  const ai: AnyRecord | null = record?.ai_reviewer ?? null;

  const secFindings: Finding[] = security?.findings ?? [];
  const qualFindings: Finding[] = quality?.findings ?? [];

  if (!record) return null;

  const tabs = [
    { id: "security", label: "Security", icon: ShieldAlert, count: secFindings.length },
    { id: "quality", label: "Code quality", icon: Cpu, count: qualFindings.length },
    { id: "architecture", label: "Architecture", icon: GitPullRequest, count: null },
    { id: "supply", label: "Dependencies & Tests", icon: Package, count: null },
    { id: "insights", label: "AI insights", icon: Sparkles, count: null },
  ] as const;

  return (
    <div className="glass-panel p-6 rounded-lg space-y-6">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-4" role="tablist">
        {tabs.map((t) => {
          const IconComp = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                isActive
                  ? "bg-slate-100 text-slate-950"
                  : "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5"
              }`}
            >
              <IconComp className="w-3.5 h-3.5" />
              <span>{t.label}</span>
              {typeof t.count === "number" && (
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${isActive ? "bg-slate-950 text-white" : "bg-white/10 text-slate-300"}`}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeTab === "security" && (
        <ModuleState section={security}>
          <div className="space-y-3">
            {secFindings.length === 0 ? (
              <div className="p-5 text-xs text-slate-400 text-center rounded-xl bg-white/[0.02]">
                No issues detected by current checks.
                {security?.raw_metrics?.scanned_files != null && (
                  <span className="block mt-1 font-mono text-slate-500">
                    {security.raw_metrics.scanned_files} file(s) scanned.
                  </span>
                )}
              </div>
            ) : (
              secFindings.map((f, i) => <FindingCard key={f.id || i} f={f} />)
            )}
          </div>
        </ModuleState>
      )}

      {activeTab === "quality" && (
        <ModuleState section={quality}>
          <div className="space-y-3">
            {qualFindings.length === 0 ? (
              <div className="p-5 text-xs text-slate-400 text-center rounded-xl bg-white/[0.02]">
                No issues detected by current checks.
              </div>
            ) : (
              qualFindings.map((f, i) => <FindingCard key={f.id || i} f={f} />)
            )}
          </div>
        </ModuleState>
      )}

      {activeTab === "architecture" && (
        <ModuleState section={architecture}>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
              <span className="text-slate-400">
                Detected pattern:{" "}
                <strong className="text-white">{architecture?.detected_pattern || "Undetermined"}</strong>
              </span>
              {architecture?.modularity_score != null && (
                <span className="font-mono text-slate-400">
                  Modularity: <span className="text-cyan-300">{architecture.modularity_score}/100</span>
                </span>
              )}
              {architecture?.coupling_score != null && (
                <span className="font-mono text-slate-400">
                  Coupling: <span className="text-cyan-300">{architecture.coupling_score}/100</span>
                </span>
              )}
            </div>
            {architecture?.summary && (
              <p className="text-xs text-slate-400 leading-relaxed">{architecture.summary}</p>
            )}
            {Array.isArray(architecture?.folder_graph) && architecture.folder_graph.length > 0 ? (
              <div>
                <h5 className="text-xs font-semibold text-slate-300 mb-2">
                  Module structure (from repository tree)
                </h5>
                <div className="max-h-64 overflow-y-auto p-3 rounded-xl bg-slate-950/80 border border-white/10 font-mono text-[11px] text-slate-400 space-y-0.5">
                  {architecture.folder_graph.slice(0, 60).map((d: string, i: number) => (
                    <div key={i} className="truncate">📁 {d}</div>
                  ))}
                  {architecture.folder_graph.length > 60 && (
                    <div className="text-slate-600">+ {architecture.folder_graph.length - 60} more</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-5 text-xs text-slate-500 text-center rounded-xl bg-white/[0.02]">
                No module structure available for this analysis.
              </div>
            )}
          </div>
        </ModuleState>
      )}

      {activeTab === "supply" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: "Dependencies", icon: Package, data: dependencies },
            { title: "Testing", icon: FlaskConical, data: testing },
            { title: "Performance signals", icon: Gauge, data: performance, note: "Static signals only — no runtime benchmarking." },
          ].map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.title} className="p-4 rounded-md bg-slate-950/60 border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-white flex items-center gap-2">
                    <Icon className="w-4 h-4 text-cyan-400" />
                    {c.title}
                  </h5>
                  {typeof c.data?.score === "number" && (
                    <span className="text-sm font-black font-mono text-white">{c.data.score}</span>
                  )}
                </div>
                {c.data && c.data.status === "completed" ? (
                  <>
                    <ReasonList items={c.data.reasons || []} />
                    {Array.isArray(c.data.evidence) && c.data.evidence.length > 0 && (
                      <div className="font-mono text-[11px] text-slate-500 space-y-0.5 max-h-32 overflow-y-auto">
                        {c.data.evidence.slice(0, 12).map((e: string, i: number) => (
                          <div key={i} className="truncate">· {e}</div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-slate-500">Not available for this analysis.</p>
                )}
                {c.note && <p className="text-[11px] font-mono text-slate-600">{c.note}</p>}
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "insights" && (
        <div className="space-y-4 text-xs">
          {!ai || ai.status === "unavailable" || ai.status === "failed" ? (
            <div className="p-5 text-xs text-slate-400 text-center rounded-xl bg-white/[0.02]">
              AI insights unavailable
              {ai?.error ? `: ${ai.error}` : " (no LLM key configured)"}. Deterministic
              results above are unaffected.
            </div>
          ) : (
            <div className="p-5 rounded-md bg-slate-950/60 border border-white/5 space-y-4">
              <div className="text-[11px] font-mono text-amber-300/80 uppercase tracking-wider">
                AI-generated — interpretive, verify against evidence
              </div>
              {ai.repository_summary && (
                <p className="text-slate-300 leading-relaxed">{ai.repository_summary}</p>
              )}
              {Array.isArray(ai.improvement_suggestions) && ai.improvement_suggestions.length > 0 && (
                <div className="space-y-1">
                  <h5 className="font-bold text-cyan-300 uppercase text-[11px]">Suggestions</h5>
                  <ul className="text-slate-400 space-y-1 list-disc list-inside">
                    {ai.improvement_suggestions.map((s: string, i: number) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {Array.isArray(ai.pr_review_comments) && ai.pr_review_comments.length > 0 && (
                <div className="space-y-1">
                  <h5 className="font-bold text-cyan-300 uppercase text-[11px]">Review notes</h5>
                  <ul className="text-slate-400 space-y-1 list-disc list-inside">
                    {ai.pr_review_comments.map((s: string, i: number) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
