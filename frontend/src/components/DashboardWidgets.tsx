import React from "react";
import { GitBranch, ExternalLink, Command } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { repoQuery, type RepoRef } from "@/lib/useRepo";

interface RepositoryCardProps {
  name: string;
  owner: string;
  url: string;
  defaultBranch: string;
  framework: string;
  isPrivate: boolean;
}

export function RepositoryCard({ name, owner, url, defaultBranch, framework }: RepositoryCardProps) {
  return (
    <div className="glass-panel p-4 sm:p-5 rounded-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-white truncate">
            {owner} <span className="text-slate-600">/</span> {name}
          </h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-slate-500 hover:text-slate-300 transition-colors inline-flex items-center gap-1 font-mono"
            >
              <span className="truncate">{url}</span>
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
            </a>
            {framework && (
              <span className="font-mono text-slate-500 truncate">{framework}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-slate-300 text-xs font-mono bg-black/30 px-3 py-1.5 rounded-md border border-white/10 flex-shrink-0">
          <GitBranch className="w-3.5 h-3.5 text-slate-500" />
          <span>{defaultBranch}</span>
        </div>
      </div>
    </div>
  );
}

interface ScoreWidgetProps {
  title: string;
  score: number | null;
  grade?: string;
  icon: "health" | "security";
  formula?: string;
}

export function ScoreWidget({ title, score, grade, formula }: ScoreWidgetProps) {
  const analyzed = score !== null && score !== undefined;
  const tone =
    !analyzed || score === null
      ? "text-slate-500"
      : score >= 85
        ? "text-emerald-400"
        : score >= 70
          ? "text-amber-400"
          : "text-rose-400";

  return (
    <div className="glass-panel p-4 rounded-lg space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="panel-label">{title}</span>
        {grade && (
          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400">
            {grade}
          </span>
        )}
      </div>
      {analyzed && score !== null ? (
        <div className="flex items-baseline gap-1.5">
          <span className={`text-3xl font-bold tracking-tight font-mono ${tone}`}>
            {score}
          </span>
          <span className="text-xs text-slate-600 font-mono">/ 100</span>
        </div>
      ) : (
        <div className="text-xs font-mono text-slate-500">Not analyzed</div>
      )}
      {formula && (
        <div className="text-[11px] font-mono text-slate-600 truncate" title={formula}>
          {formula}
        </div>
      )}
    </div>
  );
}

export function PillarChartWidget({ pillars }: { pillars?: Array<{ name: string; score: number | null; color: string }> }) {
  const defaultPillars = [
    { name: "Security", score: null, color: "" },
    { name: "Code Quality", score: null, color: "" },
    { name: "Architecture", score: null, color: "" },
    { name: "Performance Signals", score: null, color: "" },
    { name: "Documentation", score: null, color: "" },
    { name: "Dependencies", score: null, color: "" },
    { name: "Testing", score: null, color: "" },
  ];

  const activePillars = pillars || defaultPillars;

  return (
    <div className="glass-panel p-4 sm:p-5 rounded-lg space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-white">Pillar breakdown</h3>
        <span className="text-[11px] text-slate-600 font-mono">measured values only</span>
      </div>
      <div className="space-y-3">
        {activePillars.map((p) => (
          <div key={p.name} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">{p.name}</span>
              <span className="font-mono text-slate-400">
                {p.score !== null ? `${p.score}` : "—"}
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={p.score ?? 0}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${p.name} score`}
              className="w-full h-1.5 rounded-full bg-black/40 overflow-hidden"
            >
              <div
                className={`h-full rounded-full transition-all duration-500 ${p.score !== null ? "bg-slate-300" : "bg-transparent"}`}
                style={{ width: `${p.score ?? 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
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
    <div className="glass-panel p-4 sm:p-5 rounded-lg space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Command className="w-4 h-4 text-slate-500" />
          Recent runs
        </h3>
        <span className="text-[11px] text-slate-600 font-mono">
          {repo.owner}/{repo.repo}
        </span>
      </div>
      <div className="space-y-2">
        {loading ? (
          <div className="p-4 text-xs font-mono text-slate-600 text-center">
            Loading history...
          </div>
        ) : historyList.length === 0 ? (
          <div className="p-4 text-xs text-slate-500 text-center rounded-md bg-white/[0.02]">
            No runs recorded for this repository yet.
          </div>
        ) : (
          historyList.slice(0, 6).map((item) => (
            <div
              key={item.analysis_id || item.id}
              className="p-3 rounded-md bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3"
            >
              <div className="space-y-0.5 min-w-0">
                <div className="text-[13px] font-medium text-slate-200 truncate font-mono">
                  {(item.repository?.commit_sha || item.analysis_id || "").toString().slice(0, 19)}
                </div>
                <div className="text-[11px] font-mono text-slate-600">
                  {item.created_at ? new Date(item.created_at).toLocaleString() : ""}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs font-mono font-semibold text-slate-300">
                  {item.health?.overall_health_score ?? "—"}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10">
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
