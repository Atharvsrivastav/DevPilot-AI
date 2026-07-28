import React from "react";
import { ShieldAlert, Cpu, GitBranch, Activity, ExternalLink, Command, ArrowRight } from "lucide-react";

interface RepositoryCardProps {
  name: string;
  owner: string;
  url: string;
  defaultBranch: string;
  framework: string;
  isPrivate: boolean;
}

export function RepositoryCard({ name, owner, url, defaultBranch, framework, isPrivate }: RepositoryCardProps) {
  return (
    <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
      {/* Glow highlight background */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl group-hover:bg-cyan-500/20 transition-all duration-500" />
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              {framework}
            </span>
            <span className={`text-[11px] font-semibold uppercase px-2.5 py-0.5 rounded-full ${isPrivate ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
              {isPrivate ? "Private" : "Public"}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            {owner} <span className="text-slate-500">/</span> <span className="linear-gradient-text">{name}</span>
          </h2>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-slate-400 hover:text-cyan-400 transition-colors inline-flex items-center gap-1 font-mono"
          >
            <span>{url}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-slate-300 text-xs font-mono bg-slate-900/90 px-3.5 py-2 rounded-xl border border-white/10 shadow-inner">
            <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
            <span>{defaultBranch}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ScoreWidgetProps {
  title: string;
  score: number;
  grade?: string;
  icon: "health" | "security";
}

export function ScoreWidget({ title, score, grade, icon }: ScoreWidgetProps) {
  const isHealth = icon === "health";
  const colorClass =
    score >= 85
      ? "from-emerald-400 to-teal-400 text-emerald-400"
      : score >= 70
      ? "from-amber-400 to-orange-400 text-amber-400"
      : "from-rose-400 to-red-400 text-rose-400";

  return (
    <div className="glass-panel p-6 rounded-2xl relative overflow-hidden flex items-center justify-between">
      <div className="space-y-3 z-10">
        <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
          {isHealth ? <Activity className="w-4 h-4 text-cyan-400" /> : <ShieldAlert className="w-4 h-4 text-rose-400" />}
          <span>{title}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`text-5xl font-black tracking-tight bg-gradient-to-br ${colorClass} bg-clip-text text-transparent font-mono`}>
            {score}
          </span>
          <span className="text-xs text-slate-500 font-mono">/ 100</span>
        </div>
        {grade && (
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-200">
            <span>Rating:</span>
            <span className="text-cyan-400 font-mono">{grade}</span>
          </div>
        )}
      </div>
      
      {/* Vercel-style circular gauge indicator */}
      <div className="relative w-20 h-20 flex items-center justify-center rounded-full bg-slate-950/80 border border-white/10 shadow-inner">
        <span className="text-2xl font-black font-mono text-white">{score}%</span>
      </div>
    </div>
  );
}

export function PillarChartWidget() {
  const pillars = [
    { name: "Security", score: 92, color: "bg-emerald-400" },
    { name: "Code Quality", score: 85, color: "bg-cyan-400" },
    { name: "Architecture", score: 88, color: "bg-indigo-400" },
    { name: "Performance", score: 76, color: "bg-amber-400" },
    { name: "Documentation", score: 70, color: "bg-purple-400" },
    { name: "Dependencies", score: 95, color: "bg-teal-400" },
    { name: "Testing", score: 65, color: "bg-rose-400" },
  ];

  return (
    <div className="glass-panel p-6 rounded-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 tracking-tight">
          <Cpu className="w-5 h-5 text-indigo-400" />
          Pillar Breakdown & Health Metrics
        </h3>
        <span className="text-xs text-slate-400 font-mono">Updated real-time</span>
      </div>
      <div className="space-y-4">
        {pillars.map((p) => (
          <div key={p.name} className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-slate-300">
              <span>{p.name}</span>
              <span className="font-mono text-cyan-400">{p.score}%</span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={p.score}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${p.name} rating score`}
              className="w-full h-2 rounded-full bg-slate-950 border border-white/5 overflow-hidden p-0.5"
            >
              <div
                className={`h-full ${p.color} rounded-full transition-all duration-700 ease-out`}
                style={{ width: `${p.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RecentAnalysisWidget() {
  const analyses = [
    { id: "anl_01", repo: "DevPilot-AI", commit: "a8f3c91", status: "COMPLETED", date: "10 mins ago", score: 88 },
    { id: "anl_02", repo: "fastapi-core", commit: "b2d41ef", status: "COMPLETED", date: "2 hours ago", score: 92 },
    { id: "anl_03", repo: "nextjs-dashboard", commit: "c99a012", status: "COMPLETED", date: "1 day ago", score: 79 },
  ];

  return (
    <div className="glass-panel p-6 rounded-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 tracking-tight">
          <Command className="w-5 h-5 text-amber-400" />
          Recent Repository Analyses
        </h3>
        <button className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors inline-flex items-center gap-1">
          View All <ArrowRight className="w-3 h-3" />
        </button>
      </div>
      <div className="space-y-3">
        {analyses.map((item) => (
          <div
            key={item.id}
            className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all flex items-center justify-between group"
          >
            <div className="space-y-1">
              <div className="text-sm font-semibold text-white group-hover:text-cyan-400 transition-colors">
                {item.repo}
              </div>
              <div className="text-xs font-mono text-slate-500">
                sha: {item.commit} • {item.date}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-950 text-cyan-400 border border-white/10">
                {item.score}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {item.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
