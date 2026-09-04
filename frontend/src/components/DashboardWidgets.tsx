import React from "react";
import {
  GitBranch,
  ExternalLink,
  Command,
  GitCommit,
  Users,
  Layers,
  ShieldCheck,
  FileCheck2,
  Cpu,
  ArrowUpRight,
  CheckSquare,
  History,
  GitPullRequest,
  Sparkles,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { repoQuery, type RepoRef } from "@/lib/useRepo";

interface RepositoryCardProps {
  name: string;
  owner: string;
  url: string;
  defaultBranch: string;
  framework?: string;
  commitSha?: string | null;
  description?: string | null;
  stars?: number | null;
  forks?: number | null;
  openIssues?: number | null;
  isPrivate?: boolean;
}

export function RepositoryCard({
  name,
  owner,
  url,
  defaultBranch,
  framework,
  commitSha,
  description,
  stars,
  forks,
  openIssues,
}: RepositoryCardProps) {
  return (
    <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold tracking-tight text-white font-mono">
              {owner} <span className="text-slate-500">/</span> {name}
            </h2>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              aria-label="Open on GitHub"
              className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-800"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
          {description && (
            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
              {description}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
            <GitBranch className="w-3.5 h-3.5 text-slate-400" />
            <span>{defaultBranch}</span>
          </div>
          {commitSha && (
            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
              <GitCommit className="w-3.5 h-3.5 text-emerald-400" />
              <span>{commitSha.slice(0, 7)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-3 border-t border-slate-800/80 text-xs font-mono text-slate-400">
        {stars != null && (
          <span className="flex items-center gap-1.5">
            <span className="text-slate-500">★</span> {stars.toLocaleString()} stars
          </span>
        )}
        {forks != null && (
          <span className="flex items-center gap-1.5">
            <span className="text-slate-500">⑂</span> {forks.toLocaleString()} forks
          </span>
        )}
        {openIssues != null && (
          <span className="flex items-center gap-1.5">
            <span className="text-slate-500">◉</span> {openIssues.toLocaleString()} open issues
          </span>
        )}
        {framework && (
          <span className="text-slate-300">
            <span className="text-slate-500">Stack:</span> {framework}
          </span>
        )}
      </div>
    </div>
  );
}

interface ScoreWidgetProps {
  title: string;
  score: number | null;
  grade?: string;
  formula?: string;
  confidence?: string;
  weight?: string;
  onClick?: () => void;
  active?: boolean;
}

export function ScoreWidget({
  title,
  score,
  grade,
  formula,
  confidence,
  weight,
  onClick,
  active,
}: ScoreWidgetProps) {
  const analyzed = score !== null && score !== undefined;
  const tone =
    !analyzed || score === null
      ? "text-slate-500"
      : score >= 85
        ? "text-emerald-400"
        : score >= 70
          ? "text-amber-400"
          : "text-rose-400";

  const confBadgeStyle =
    confidence === "High"
      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      : confidence === "Medium"
        ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
        : confidence === "Low"
          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
          : "bg-slate-500/10 text-slate-400 border-slate-500/20";

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`rounded-xl p-4 transition-all duration-200 text-left relative ${
        onClick ? "cursor-pointer hover:border-slate-700 hover:bg-slate-900/80" : ""
      } ${
        active
          ? "bg-slate-900 border-2 border-cyan-500/80 ring-2 ring-cyan-500/20"
          : "bg-slate-900/50 border border-slate-800"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            {title}
          </span>
          {weight && (
            <span className="text-[10px] font-mono text-slate-500">({weight})</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {grade && (
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
              {grade}
            </span>
          )}
          {onClick && (
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
          )}
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        {analyzed && score !== null ? (
          <div className="flex items-baseline gap-1.5">
            <span className={`text-3xl font-bold tracking-tight font-mono ${tone}`}>
              {score}
            </span>
            <span className="text-xs text-slate-500 font-mono">/ 100</span>
          </div>
        ) : (
          <div className="text-xs font-mono text-slate-500">Not analyzed</div>
        )}

        {confidence && (
          <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${confBadgeStyle}`}>
            {confidence}
          </span>
        )}
      </div>

      {formula && (
        <div className="mt-2 text-[11px] font-mono text-slate-500 truncate" title={formula}>
          {formula}
        </div>
      )}
    </div>
  );
}

export function PillarChartWidget({
  pillars,
  onSelectPillar,
}: {
  pillars?: Array<{ name: string; score: number | null; weight?: string; id?: string }>;
  onSelectPillar?: (id: string) => void;
}) {
  const defaultPillars = [
    { id: "security", name: "Security", score: null, weight: "20%" },
    { id: "quality", name: "Code Quality", score: null, weight: "20%" },
    { id: "architecture", name: "Architecture", score: null, weight: "15%" },
    { id: "supply", name: "Testing", score: null, weight: "15%" },
    { id: "supply", name: "Dependencies", score: null, weight: "10%" },
    { id: "supply", name: "Documentation", score: null, weight: "10%" },
    { id: "activity", name: "Activity", score: null, weight: "10%" },
    { id: "supply", name: "Performance Signals", score: null, weight: "Signals" },
  ];

  const activePillars = pillars || defaultPillars;

  return (
    <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white">Pillar Weight Breakdown</h3>
          <p className="text-[11px] text-slate-400">Click any pillar to view detailed findings</p>
        </div>
        <span className="text-[11px] text-slate-500 font-mono">Formula weights sum to 100%</span>
      </div>

      <div className="space-y-3">
        {activePillars.map((p) => {
          const tone =
            p.score == null
              ? "bg-slate-700"
              : p.score >= 85
                ? "bg-emerald-400"
                : p.score >= 70
                  ? "bg-amber-400"
                  : "bg-rose-400";

          return (
            <div
              key={p.name}
              onClick={() => p.id && onSelectPillar?.(p.id)}
              className={`space-y-1 p-1.5 -mx-1.5 rounded-lg transition-colors ${
                onSelectPillar ? "cursor-pointer hover:bg-slate-800/60" : ""
              }`}
            >
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300 font-sans flex items-center gap-1.5">
                  {p.name}
                  {p.weight && (
                    <span className="text-[10px] text-slate-500 font-mono">({p.weight})</span>
                  )}
                </span>
                <span className="text-slate-400 font-semibold">
                  {p.score !== null ? `${p.score}` : "—"}
                </span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={p.score ?? 0}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${p.name} score`}
                className="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden"
              >
                <div
                  className={`h-full rounded-full transition-all duration-500 ${tone}`}
                  style={{ width: `${p.score ?? 0}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DevelopmentActivityWidget({
  recentCommits,
  topContributors,
}: {
  recentCommits?: Array<{ sha: string; message: string; author_name: string; date: string }>;
  topContributors?: Array<{ login: string; contributions: number; avatar_url?: string }>;
}) {
  return (
    <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <GitCommit className="w-4 h-4 text-slate-400" />
          Recent Git Commits
        </h3>
        <span className="text-[11px] text-slate-500 font-mono">
          {recentCommits?.length || 0} commits recorded
        </span>
      </div>

      <div className="space-y-2">
        {!recentCommits || recentCommits.length === 0 ? (
          <div className="p-4 text-xs text-slate-500 text-center rounded-lg bg-slate-950/40 font-mono">
            No commit history available in the inspected sample.
          </div>
        ) : (
          recentCommits.slice(0, 5).map((c, i) => (
            <div
              key={c.sha || i}
              className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-start justify-between gap-3 text-xs"
            >
              <div className="space-y-1 min-w-0">
                <div className="font-medium text-slate-200 truncate">{c.message}</div>
                <div className="text-[11px] text-slate-500 flex items-center gap-2">
                  <span>{c.author_name}</span>
                  {c.date && <span>· {new Date(c.date).toLocaleDateString()}</span>}
                </div>
              </div>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 flex-shrink-0">
                {c.sha.slice(0, 7)}
              </span>
            </div>
          ))
        )}
      </div>

      {topContributors && topContributors.length > 0 && (
        <div className="pt-3 border-t border-slate-800/80 space-y-2">
          <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            Top Contributors ({topContributors.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {topContributors.slice(0, 8).map((u, i) => (
              <span
                key={u.login || i}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300"
              >
                <span>@{u.login}</span>
                <span className="text-slate-500">({u.contributions})</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function RecentAnalysisWidget({ repo }: { repo: RepoRef }) {
  const [historyList, setHistoryList] = React.useState<Array<any>>([]);
  const [loading, setLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    let cancelled = false;
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const list = await apiFetch<Array<any>>(
          `/api/v1/analysis/history?${repoQuery(repo)}`
        );
        if (!cancelled) setHistoryList(list);
      } catch {
        if (!cancelled) setHistoryList([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchHistory();
    return () => {
      cancelled = true;
    };
  }, [repo.owner, repo.repo]);

  return (
    <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Command className="w-4 h-4 text-slate-400" />
          Recent Analysis Runs
        </h3>
        <span className="text-[11px] text-slate-500 font-mono">
          {repo.owner}/{repo.repo}
        </span>
      </div>
      <div className="space-y-2">
        {loading ? (
          <div className="p-4 text-xs font-mono text-slate-500 text-center">
            Loading analysis history...
          </div>
        ) : historyList.length === 0 ? (
          <div className="p-4 text-xs text-slate-500 text-center rounded-lg bg-slate-950/40">
            No previous analysis runs recorded for this repository.
          </div>
        ) : (
          historyList.slice(0, 5).map((item) => (
            <div
              key={item.analysis_id || item.id}
              className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-3"
            >
              <div className="space-y-0.5 min-w-0">
                <div className="text-xs font-medium text-slate-200 truncate font-mono">
                  {(item.repository?.commit_sha ? `commit ${item.repository.commit_sha}` : item.analysis_id || "").toString().slice(0, 20)}
                </div>
                <div className="text-[11px] font-mono text-slate-500">
                  {item.created_at ? new Date(item.created_at).toLocaleString() : ""}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs font-mono font-bold text-slate-200">
                  {item.health?.overall_health_score ?? "—"}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {item.status || "—"}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function CompactEngineeringSnapshot({
  repo,
  record,
}: {
  repo: RepoRef;
  record: any;
}) {
  const r = record?.repository;
  const deps = record?.dependencies?.metrics;
  const tests = record?.testing?.metrics;

  return (
    <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-4 font-mono text-xs">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
        <div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Repository</div>
          <div className="font-semibold text-slate-200 truncate">{repo.owner}/{repo.repo}</div>
        </div>
        <div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Revision</div>
          <div className="font-semibold text-emerald-400">
            {r?.commit_sha ? r.commit_sha.slice(0, 7) : "HEAD"} ({r?.default_branch || "main"})
          </div>
        </div>
        <div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Community</div>
          <div className="text-slate-300">
            ★ {r?.stars?.toLocaleString() ?? 0} · ⑂ {r?.forks?.toLocaleString() ?? 0}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Testing Engine</div>
          <div className="text-slate-300">
            {tests?.runners?.length ? tests.runners.join(", ") : (tests?.test_files_count ? "Custom Tests" : "None detected")}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Dependencies</div>
          <div className="text-slate-300">
            {deps?.dependencies_count ? `${deps.dependencies_count} pkgs` : (deps?.manifests?.length ? "Detected" : "None detected")}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Analyzer Version</div>
          <div className="text-slate-400">
            {record?.analyzer_version || "DevPilot-v2.0"}
          </div>
        </div>
      </div>
    </div>
  );
}

export interface PriorityItem {
  id: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  title: string;
  reason: string;
  file?: string;
  line?: number;
  evidence?: string;
  recommendation: string;
}

export function PriorityFixesWidget({
  record,
  onInspectFile,
}: {
  record: any;
  onInspectFile?: (file: string, line?: number) => void;
}) {
  const repoKey = `${record?.repository?.owner}/${record?.repository?.name}`;
  const [taskStatus, setTaskStatus] = React.useState<Record<string, "Open" | "In Progress" | "Resolved">>({});

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(`devpilot_tasks:${repoKey}`);
      if (stored) setTaskStatus(JSON.parse(stored));
    } catch {}
  }, [repoKey]);

  const toggleStatus = (id: string) => {
    const current = taskStatus[id] || "Open";
    const next: "Open" | "In Progress" | "Resolved" = current === "Open" ? "In Progress" : current === "In Progress" ? "Resolved" : "Open";
    const updated: Record<string, "Open" | "In Progress" | "Resolved"> = { ...taskStatus, [id]: next };
    setTaskStatus(updated);
    try {
      localStorage.setItem(`devpilot_tasks:${repoKey}`, JSON.stringify(updated));
    } catch {}
  };

  const items: PriorityItem[] = [];
  const secFindings = record?.security?.findings || [];
  const qualFindings = record?.quality?.findings || [];
  const testScore = record?.health?.individual_scores?.testing_score;

  secFindings.forEach((f: any, idx: number) => {
    const sev = (f.severity || "LOW").toUpperCase();
    if (sev === "CRITICAL" || sev === "HIGH" || sev === "MEDIUM") {
      items.push({
        id: `sec-${idx}-${f.affected_file || f.file_path}`,
        severity: sev as any,
        title: f.title || f.issue_type || "Security Finding",
        reason: f.description || "Potential security vulnerability detected during AST and regex scanning.",
        file: f.affected_file || f.file_path,
        line: f.line_number || f.line,
        evidence: f.snippet,
        recommendation: f.recommendation || f.fix_recommendation || "Review and remediate vulnerability according to best practices.",
      });
    }
  });

  qualFindings.forEach((f: any, idx: number) => {
    const sev = (f.severity || "LOW").toUpperCase();
    if (sev === "CRITICAL" || sev === "HIGH" || (f.title && f.title.toLowerCase().includes("complexity"))) {
      items.push({
        id: `qual-${idx}-${f.affected_file || f.file_path}`,
        severity: sev === "CRITICAL" ? "CRITICAL" : "HIGH",
        title: f.title || f.issue_type || "Code Quality Finding",
        reason: f.description || "Structural or complexity defect identified in source code.",
        file: f.affected_file || f.file_path,
        line: f.line_number || f.line,
        evidence: f.snippet,
        recommendation: f.recommendation || "Refactor function or extract helper modules to reduce cyclomatic complexity.",
      });
    }
  });

  if (testScore === 0 || testScore === null) {
    items.push({
      id: "test-missing-runner",
      severity: "HIGH",
      title: "Missing Automated Test Suite",
      reason: "No recognized test files or test runner execution scripts detected in repository manifests.",
      recommendation: "Configure a modern test runner (such as Jest, Vitest, or Pytest) and add automated regression tests.",
    });
  }

  const sevOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  items.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]);
  const displayItems = items.slice(0, 5);

  return (
    <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">Priority Fixes</h3>
        </div>
        <span className="text-[11px] font-mono text-slate-500">
          {displayItems.length} action items ranked by deterministic severity
        </span>
      </div>

      {displayItems.length === 0 ? (
        <div className="p-4 rounded-lg bg-slate-950/40 border border-slate-800 text-xs font-mono text-slate-400 text-center">
          No critical or high-severity priority fixes identified in current analysis.
        </div>
      ) : (
        <div className="space-y-3">
          {displayItems.map((item) => {
            const status = taskStatus[item.id] || "Open";
            const sevStyle =
              item.severity === "CRITICAL"
                ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                : item.severity === "HIGH"
                  ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/20";

            return (
              <div
                key={item.id}
                className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${sevStyle}`}>
                      {item.severity}
                    </span>
                    <span className="font-semibold text-slate-200">{item.title}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleStatus(item.id)}
                      className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold transition-colors border ${
                        status === "Resolved"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : status === "In Progress"
                            ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                      }`}
                    >
                      {status}
                    </button>
                  </div>
                </div>

                {item.file && (
                  <div
                    onClick={() => onInspectFile?.(item.file!, item.line)}
                    className="font-mono text-[11px] text-slate-400 cursor-pointer hover:text-cyan-400 transition-colors flex items-center gap-1.5"
                  >
                    <span>{item.file}</span>
                    {item.line && <span>:L{item.line}</span>}
                  </div>
                )}

                <p className="text-slate-400 leading-relaxed">{item.reason}</p>

                <div className="text-slate-300 bg-slate-900/60 p-2 rounded border border-slate-800/80">
                  <span className="text-emerald-400 font-semibold font-mono">Action: </span>
                  <span>{item.recommendation}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function HealthTimelineWidget({
  repo,
  currentAnalysisId,
  onSelectAnalysis,
}: {
  repo: RepoRef;
  currentAnalysisId?: string;
  onSelectAnalysis?: (analysisId: string) => void;
}) {
  const [history, setHistory] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    let cancelled = false;
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const list = await apiFetch<any[]>(`/api/v1/analysis/history?${repoQuery(repo)}`);
        if (!cancelled) {
          const completed = (list || []).filter((x) => x.status === "COMPLETED");
          completed.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          setHistory(completed);
        }
      } catch {
        if (!cancelled) setHistory([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchHistory();
    return () => {
      cancelled = true;
    };
  }, [repo.owner, repo.repo]);

  if (loading) {
    return (
      <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-5 text-xs font-mono text-slate-500 text-center">
        Loading health timeline...
      </div>
    );
  }

  if (history.length <= 1) {
    return (
      <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            Repository Health Timeline
          </h3>
          <span className="text-[11px] font-mono text-slate-500">1 completed analysis</span>
        </div>
        <div className="p-4 rounded-lg bg-slate-950/40 border border-slate-800/80 text-xs text-slate-400 space-y-2">
          <div className="font-semibold text-slate-300">One analysis available</div>
          <p className="text-slate-500 leading-relaxed">
            A chronological timeline of score trends will appear as you analyze new commits for this repository.
          </p>
          {history[0] && (
            <div className="pt-2 flex items-center gap-3 font-mono text-[11px] text-slate-400">
              <span>Commit: {history[0].repository?.commit_sha?.slice(0, 7) || "HEAD"}</span>
              <span>·</span>
              <span className="text-emerald-400 font-bold">Health: {history[0].health?.overall_health_score ?? "—"}</span>
              <span>·</span>
              <span>{new Date(history[0].created_at).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <History className="w-4 h-4 text-cyan-400" />
          Repository Health Timeline
        </h3>
        <span className="text-[11px] font-mono text-slate-500">
          {history.length} runs across repository history
        </span>
      </div>

      <div className="pt-4 pb-2 overflow-x-auto">
        <div className="flex items-center justify-between min-w-[500px] relative px-4">
          <div className="absolute left-6 right-6 top-1/2 h-0.5 bg-slate-800 -translate-y-1/2 z-0" />

          {history.map((run) => {
            const isSelected = run.analysis_id === currentAnalysisId;
            const score = run.health?.overall_health_score ?? 0;
            const sha = run.repository?.commit_sha?.slice(0, 7) || run.analysis_id.slice(0, 7);
            const date = new Date(run.created_at).toLocaleDateString();

            return (
              <div
                key={run.analysis_id}
                onClick={() => onSelectAnalysis?.(run.analysis_id)}
                className={`relative z-10 flex flex-col items-center gap-2 cursor-pointer group transition-transform ${
                  isSelected ? "scale-110" : "hover:scale-105"
                }`}
              >
                <div className={`px-2 py-0.5 rounded font-mono text-xs font-bold transition-all ${
                  isSelected
                    ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                    : "bg-slate-800 text-slate-200 group-hover:bg-slate-700"
                }`}>
                  {score}
                </div>

                <div className={`w-4 h-4 rounded-full border-2 transition-all ${
                  isSelected
                    ? "bg-cyan-400 border-white ring-4 ring-cyan-500/30"
                    : "bg-slate-900 border-slate-700 group-hover:border-cyan-400"
                }`} />

                <div className="text-center font-mono space-y-0.5">
                  <div className="text-[11px] text-slate-300 font-semibold">{sha}</div>
                  <div className="text-[10px] text-slate-500">{date}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function WhatChangedWidget({
  repo,
  currentRecord,
}: {
  repo: RepoRef;
  currentRecord: any;
}) {
  const [prevRecord, setPrevRecord] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    let cancelled = false;
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const list = await apiFetch<any[]>(`/api/v1/analysis/history?${repoQuery(repo)}`);
        if (!cancelled && list && list.length >= 2) {
          const sorted = list
            .filter((x) => x.status === "COMPLETED")
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          const currentIndex = sorted.findIndex((x) => x.analysis_id === currentRecord?.analysis_id);
          const prev = currentIndex >= 0 && currentIndex + 1 < sorted.length ? sorted[currentIndex + 1] : sorted[1];
          if (prev) {
            const fullPrev = await apiFetch<any>(`/api/v1/analysis/${prev.analysis_id}`);
            if (!cancelled) setPrevRecord(fullPrev);
          }
        }
      } catch {
        if (!cancelled) setPrevRecord(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (currentRecord?.analysis_id) {
      fetchHistory();
    }
    return () => {
      cancelled = true;
    };
  }, [repo.owner, repo.repo, currentRecord?.analysis_id]);

  if (loading) return null;

  if (!prevRecord) {
    return (
      <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-5 space-y-2">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <GitPullRequest className="w-4 h-4 text-cyan-400" />
          What Changed? (Comparison)
        </h3>
        <p className="text-xs font-mono text-slate-500">
          Only one analysis available for this repository. Analyze another commit to view automated delta and findings diff.
        </p>
      </div>
    );
  }

  const curScores = currentRecord?.health?.individual_scores || {};
  const prevScores = prevRecord?.health?.individual_scores || {};
  const curHealth = currentRecord?.health?.overall_health_score ?? 0;
  const prevHealth = prevRecord?.health?.overall_health_score ?? 0;
  const healthDelta = Math.round((curHealth - prevHealth) * 10) / 10;

  const pillars = [
    { label: "Overall Health", cur: curHealth, prev: prevHealth, delta: healthDelta },
    { label: "Security", cur: curScores.security_score, prev: prevScores.security_score },
    { label: "Code Quality", cur: curScores.code_quality_score, prev: prevScores.code_quality_score },
    { label: "Architecture", cur: curScores.architecture_score, prev: prevScores.architecture_score },
    { label: "Testing", cur: curScores.testing_score, prev: prevScores.testing_score },
    { label: "Dependencies", cur: curScores.dependencies_score, prev: prevScores.dependencies_score },
  ];

  return (
    <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <GitPullRequest className="w-4 h-4 text-cyan-400" />
            What Changed?
          </h3>
          <p className="text-[11px] text-slate-400">
            Comparing commit {currentRecord.repository?.commit_sha?.slice(0, 7)} vs {prevRecord.repository?.commit_sha?.slice(0, 7)}
          </p>
        </div>
        <div className={`px-2.5 py-1 rounded font-mono text-xs font-bold ${
          healthDelta > 0 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
          healthDelta < 0 ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
          "bg-slate-800 text-slate-400"
        }`}>
          {healthDelta > 0 ? `+${healthDelta}` : healthDelta} Health Delta
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {pillars.map((p) => {
          if (p.cur == null && p.prev == null) return null;
          const delta = p.delta ?? (p.cur != null && p.prev != null ? Math.round((p.cur - p.prev) * 10) / 10 : null);
          return (
            <div key={p.label} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1 font-mono">
              <div className="text-[10px] text-slate-500 uppercase truncate">{p.label}</div>
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-bold text-slate-200">{p.cur ?? "—"}</span>
                {delta != null && (
                  <span className={`text-[11px] font-semibold ${
                    delta > 0 ? "text-emerald-400" : delta < 0 ? "text-rose-400" : "text-slate-500"
                  }`}>
                    {delta > 0 ? `+${delta}` : delta}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

