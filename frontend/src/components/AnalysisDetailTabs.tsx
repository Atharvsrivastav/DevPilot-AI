"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Cpu,
  GitPullRequest,
  Sparkles,
  Package,
  FlaskConical,
  Gauge,
  FileCode,
  GitCommit,
  Users,
  CheckCircle2,
  AlertTriangle,
  Info,
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
  snippet?: string;
  evidence?: string;
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

function FindingRow({ f }: { f: Finding }) {
  const sev = (f.severity || "LOW").toUpperCase();
  const sevBadge =
    sev === "CRITICAL"
      ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
      : sev === "HIGH"
        ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
        : sev === "MEDIUM"
          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
          : "bg-blue-500/10 text-blue-400 border-blue-500/20";

  return (
    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-[10px] font-bold font-mono uppercase px-2 py-0.5 rounded border ${sevBadge}`}>
            {sev}
          </span>
          <span className="text-sm font-bold text-white truncate">
            {f.title || f.issue_type || f.type || "Security Finding"}
          </span>
        </div>
        {f.id && <span className="text-[11px] font-mono text-slate-500">{f.id}</span>}
      </div>

      <div className="font-mono text-slate-400 flex items-center gap-1.5">
        <FileCode className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
        <span className="text-slate-300 truncate">{fileOf(f)}:L{lineOf(f)}</span>
      </div>

      {f.description && <p className="text-slate-300 leading-relaxed">{f.description}</p>}

      {f.snippet && (
        <div className="font-mono text-[11px] bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 text-slate-300 overflow-x-auto">
          <code>{f.snippet}</code>
        </div>
      )}

      <div className="text-slate-300 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 flex items-start gap-2">
        <span className="text-emerald-400 font-semibold flex-shrink-0">Recommendation:</span>
        <span>{fixOf(f)}</span>
      </div>

      {f.scanner_source && (
        <div className="text-[10px] font-mono text-slate-500 pt-1">
          Scanner: {f.scanner_source}
          {f.confidence ? ` · Confidence: ${f.confidence}` : ""}
        </div>
      )}
    </div>
  );
}

function ModuleState({ section, children }: { section: AnyRecord | null | undefined; children: React.ReactNode }) {
  if (!section || section.status === "failed") {
    return (
      <div className="p-6 text-xs font-mono text-slate-400 text-center rounded-xl bg-slate-900/40 border border-slate-800">
        {section?.error
          ? `Module failed: ${section.error}`
          : "This module was not executed for this analysis."}
      </div>
    );
  }
  return <>{children}</>;
}

function ReasonList({ items }: { items: string[] }) {
  if (!items?.length) return null;
  return (
    <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
      {items.map((r, i) => (
        <li key={i}>{r}</li>
      ))}
    </ul>
  );
}

interface AnalysisDetailTabsProps {
  record: AnyRecord | null;
  selectedTab?: string;
  onTabChange?: (tab: string) => void;
}

export function AnalysisDetailTabs({
  record,
  selectedTab,
  onTabChange,
}: AnalysisDetailTabsProps) {
  const [internalTab, setInternalTab] = useState<string>("security");
  const [securityFilter, setSecurityFilter] = useState<string>("ALL");

  const currentTab = selectedTab || internalTab;

  const handleTabClick = (id: string) => {
    setInternalTab(id);
    onTabChange?.(id);
  };

  const security: AnyRecord | null = record?.security ?? null;
  const quality: AnyRecord | null = record?.quality ?? null;
  const architecture: AnyRecord | null = record?.architecture ?? null;
  const dependencies: AnyRecord | null = record?.dependencies ?? null;
  const testing: AnyRecord | null = record?.testing ?? null;
  const activity: AnyRecord | null = record?.activity ?? null;
  const performance: AnyRecord | null = record?.performance_signals ?? null;
  const ai: AnyRecord | null = record?.ai_reviewer ?? null;

  const secFindings: Finding[] = security?.findings ?? [];
  const qualFindings: Finding[] = quality?.findings ?? [];

  const filteredSecFindings =
    securityFilter === "ALL"
      ? secFindings
      : secFindings.filter((f) => (f.severity || "").toUpperCase() === securityFilter);

  if (!record) return null;

  const tabs = [
    { id: "security", label: "Security", icon: ShieldAlert, count: secFindings.length },
    { id: "quality", label: "Code Quality", icon: Cpu, count: qualFindings.length },
    { id: "architecture", label: "Architecture", icon: GitPullRequest, count: null },
    { id: "supply", label: "Dependencies & Tests", icon: Package, count: null },
    { id: "activity", label: "Activity", icon: GitCommit, count: null },
    { id: "insights", label: "AI Insights", icon: Sparkles, count: null },
  ];

  return (
    <div id="analysis-detail-section" className="rounded-xl bg-slate-900/40 border border-slate-800 p-6 space-y-6">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-4" role="tablist">
        {tabs.map((t) => {
          const IconComp = t.icon;
          const isActive = currentTab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => handleTabClick(t.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? "bg-slate-100 text-slate-950 shadow-sm"
                  : "bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800"
              }`}
            >
              <IconComp className="w-3.5 h-3.5" />
              <span>{t.label}</span>
              {typeof t.count === "number" && (
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${isActive ? "bg-slate-950 text-white" : "bg-slate-800 text-slate-300"}`}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Security Tab */}
      {currentTab === "security" && (
        <ModuleState section={security}>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
              <div>
                <h4 className="text-sm font-bold text-white">Security Vulnerabilities & Secrets</h4>
                <p className="text-xs text-slate-400">
                  AST checks for hardcoded credentials, injection patterns, and vulnerable manifests.
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setSecurityFilter(lvl)}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold transition-colors ${
                      securityFilter === lvl
                        ? "bg-slate-200 text-slate-950"
                        : "bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800"
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {filteredSecFindings.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                <div className="text-sm font-semibold text-white">No issues detected by current checks.</div>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {security?.raw_metrics?.scanned_files != null
                    ? `Scanned ${security.raw_metrics.scanned_files} file(s). No hardcoded secrets, injection vectors, or catalog CVEs found.`
                    : "No security issues detected. This reflects executed static checks, not an absolute guarantee of zero vulnerabilities."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSecFindings.map((f, i) => (
                  <FindingRow key={f.id || i} f={f} />
                ))}
              </div>
            )}
          </div>
        </ModuleState>
      )}

      {/* Code Quality Tab */}
      {currentTab === "quality" && (
        <ModuleState section={quality}>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-bold text-white">Code Quality & Maintainability Evidence</h4>
              <p className="text-xs text-slate-400">
                Cyclomatic complexity, contiguous duplicate blocks, large files, and unused imports.
              </p>
            </div>

            {qualFindings.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                <div className="text-sm font-semibold text-white">No quality smells detected by current checks.</div>
                <p className="text-xs text-slate-400">
                  {quality?.raw_metrics?.scanned_files != null
                    ? `Analyzed ${quality.raw_metrics.scanned_files} files without triggering complexity or code clone thresholds.`
                    : "Codebase satisfies maintainability thresholds."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {qualFindings.map((f, i) => (
                  <FindingRow key={f.id || i} f={f} />
                ))}
              </div>
            )}
          </div>
        </ModuleState>
      )}

      {/* Architecture Tab */}
      {currentTab === "architecture" && (
        <ModuleState section={architecture}>
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
                <div className="text-[11px] font-mono text-slate-400">Detected Pattern</div>
                <div className="text-sm font-bold text-white">{architecture?.detected_pattern || "Undetermined"}</div>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
                <div className="text-[11px] font-mono text-slate-400">Modularity Score</div>
                <div className="text-sm font-bold font-mono text-cyan-400">{architecture?.modularity_score ?? "—"} / 100</div>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
                <div className="text-[11px] font-mono text-slate-400">Coupling Score</div>
                <div className="text-sm font-bold font-mono text-cyan-400">{architecture?.coupling_score ?? "—"} / 100</div>
              </div>
            </div>

            {architecture?.summary && (
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                {architecture.summary}
              </div>
            )}

            {Array.isArray(architecture?.folder_graph) && architecture.folder_graph.length > 0 ? (
              <div className="space-y-2">
                <h5 className="text-xs font-semibold text-slate-300">Repository Directory Hierarchy</h5>
                <div className="max-h-64 overflow-y-auto p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-400 space-y-1">
                  {architecture.folder_graph.slice(0, 50).map((d: string, i: number) => (
                    <div key={i} className="truncate">📁 {d}</div>
                  ))}
                  {architecture.folder_graph.length > 50 && (
                    <div className="text-slate-600 font-sans">+ {architecture.folder_graph.length - 50} more directories</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 text-xs text-slate-500 text-center rounded-xl bg-slate-950/40">
                No folder hierarchy extracted for this repository.
              </div>
            )}
          </div>
        </ModuleState>
      )}

      {/* Dependencies & Tests Tab */}
      {currentTab === "supply" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Dependencies Card */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-cyan-400" />
                Dependencies
              </h5>
              {typeof dependencies?.score === "number" && (
                <span className="text-sm font-bold font-mono text-white">{dependencies.score} / 100</span>
              )}
            </div>
            {dependencies && dependencies.status === "completed" ? (
              <>
                <ReasonList items={dependencies.reasons || []} />
                {Array.isArray(dependencies.evidence) && dependencies.evidence.length > 0 && (
                  <div className="font-mono text-[11px] text-slate-400 space-y-1 max-h-48 overflow-y-auto pt-2 border-t border-slate-800/80">
                    {dependencies.evidence.slice(0, 15).map((e: string, i: number) => (
                      <div key={i} className="truncate">· {e}</div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-slate-500">Not analyzed</p>
            )}
          </div>

          {/* Testing Card */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold text-white flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-rose-400" />
                Testing Posture
              </h5>
              {typeof testing?.score === "number" && (
                <span className="text-sm font-bold font-mono text-white">{testing.score} / 100</span>
              )}
            </div>
            {testing && testing.status === "completed" ? (
              <>
                <ReasonList items={testing.reasons || []} />
                {Array.isArray(testing.evidence) && testing.evidence.length > 0 && (
                  <div className="font-mono text-[11px] text-slate-400 space-y-1 max-h-48 overflow-y-auto pt-2 border-t border-slate-800/80">
                    {testing.evidence.slice(0, 15).map((e: string, i: number) => (
                      <div key={i} className="truncate">· {e}</div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-slate-500">Not analyzed</p>
            )}
          </div>

          {/* Performance Signals Card */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold text-white flex items-center gap-2">
                <Gauge className="w-4 h-4 text-amber-400" />
                Performance Signals
              </h5>
              {typeof performance?.score === "number" && (
                <span className="text-sm font-bold font-mono text-white">{performance.score} / 100</span>
              )}
            </div>
            {performance && performance.status === "completed" ? (
              <>
                <ReasonList items={performance.reasons || []} />
                {Array.isArray(performance.evidence) && performance.evidence.length > 0 && (
                  <div className="font-mono text-[11px] text-slate-400 space-y-1 max-h-48 overflow-y-auto pt-2 border-t border-slate-800/80">
                    {performance.evidence.slice(0, 10).map((e: string, i: number) => (
                      <div key={i} className="truncate">· {e}</div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-slate-500">Not analyzed</p>
            )}
            <p className="text-[10px] font-mono text-slate-500 pt-1">
              Static bundle & file signals only. No runtime benchmarking performed.
            </p>
          </div>
        </div>
      )}

      {/* Activity Tab */}
      {currentTab === "activity" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-white">Repository Activity & Maintenance</h4>
              <p className="text-xs text-slate-400">Commit frequency, maintenance recency, and contributor collaboration.</p>
            </div>
            {typeof activity?.score === "number" && (
              <span className="text-base font-bold font-mono text-white px-3 py-1 rounded bg-slate-800 border border-slate-700">
                {activity.score} / 100
              </span>
            )}
          </div>

          {activity && activity.status === "completed" ? (
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
              <ReasonList items={activity.reasons || []} />
              {Array.isArray(activity.evidence) && activity.evidence.length > 0 && (
                <div className="font-mono text-[11px] text-slate-400 space-y-1 pt-2 border-t border-slate-800/80">
                  {activity.evidence.map((e: string, i: number) => (
                    <div key={i}>· {e}</div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-500 rounded-xl bg-slate-950/40">
              Activity data not available for this run.
            </div>
          )}
        </div>
      )}

      {/* AI Insights Tab */}
      {currentTab === "insights" && (
        <div className="space-y-4 text-xs">
          {!ai || ai.status === "unavailable" || ai.status === "failed" ? (
            <div className="p-6 text-xs text-slate-400 text-center rounded-xl bg-slate-900/40 border border-slate-800">
              AI insights unavailable
              {ai?.error ? `: ${ai.error}` : " (no LLM key configured)"}. Deterministic scanner results above are unaffected.
            </div>
          ) : (
            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="text-[11px] font-mono text-amber-400/90 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI-generated — interpretive, verify against evidence</span>
              </div>
              {ai.repository_summary && (
                <p className="text-slate-300 leading-relaxed">{ai.repository_summary}</p>
              )}
              {Array.isArray(ai.improvement_suggestions) && ai.improvement_suggestions.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <h5 className="font-bold text-white text-xs">Actionable Recommendations</h5>
                  <ul className="text-slate-300 space-y-1.5 list-disc list-inside">
                    {ai.improvement_suggestions.map((s: string, i: number) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {Array.isArray(ai.pr_review_comments) && ai.pr_review_comments.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <h5 className="font-bold text-white text-xs">Repository Review Notes</h5>
                  <ul className="text-slate-300 space-y-1.5 list-disc list-inside">
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
