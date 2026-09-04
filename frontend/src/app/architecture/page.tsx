"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  GitPullRequest,
  Layers,
  Folder,
  Cpu,
  ShieldCheck,
  Package,
  FileCode,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Filter,
} from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { useRepo, repoKey, repoQuery } from "@/lib/useRepo";
import {
  LoadingSkeleton,
  ErrorBlock,
  EmptyBlock,
} from "@/components/StateBlocks";

interface ArchitectureData {
  status?: string;
  detected_pattern?: string | null;
  confidence_score?: number | null;
  modularity_score?: number | null;
  coupling_score?: number | null;
  architecture_score?: number | null;
  folder_graph?: string[];
  mermaid_diagram?: string | null;
  summary?: string | null;
  error?: string | null;
}

interface ArchitectureRecord {
  status: string;
  error_message?: string | null;
  architecture?: ArchitectureData | null;
}

interface ArchTier {
  id: string;
  name: string;
  color: string;
  description: string;
  folders: string[];
}

function classifyFoldersIntoTiers(folders: string[]): ArchTier[] {
  const tiers: ArchTier[] = [
    {
      id: "frontend",
      name: "Presentation / Frontend",
      color: "border-cyan-500/30 text-cyan-400 bg-cyan-500/10",
      description: "User interface, client components, and web presentation layer.",
      folders: [],
    },
    {
      id: "backend",
      name: "API & Controllers",
      color: "border-indigo-500/30 text-indigo-400 bg-indigo-500/10",
      description: "HTTP routing, controllers, endpoints, and request dispatching.",
      folders: [],
    },
    {
      id: "domain",
      name: "Domain & Business Logic",
      color: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
      description: "Core business rules, entities, and use cases.",
      folders: [],
    },
    {
      id: "infrastructure",
      name: "Infrastructure & Data",
      color: "border-amber-500/30 text-amber-400 bg-amber-500/10",
      description: "Database access, external adapters, integrations, and storage.",
      folders: [],
    },
    {
      id: "shared",
      name: "Utilities & Libraries",
      color: "border-purple-500/30 text-purple-400 bg-purple-500/10",
      description: "Shared helpers, common utilities, and runtime tools.",
      folders: [],
    },
    {
      id: "tests",
      name: "Testing & Verification",
      color: "border-rose-500/30 text-rose-400 bg-rose-500/10",
      description: "Automated test suites, mocks, benchmarks, and specs.",
      folders: [],
    },
  ];

  folders.forEach((f) => {
    const lower = f.toLowerCase();
    if (lower.includes("frontend") || lower.includes("ui") || lower.includes("components") || lower.includes("views") || lower.includes("pages") || lower.includes("client")) {
      tiers[0].folders.push(f);
    } else if (lower.includes("api") || lower.includes("routes") || lower.includes("controllers") || lower.includes("endpoints") || lower.includes("server")) {
      tiers[1].folders.push(f);
    } else if (lower.includes("domain") || lower.includes("models") || lower.includes("use_cases") || lower.includes("core") || lower.includes("services")) {
      tiers[2].folders.push(f);
    } else if (lower.includes("infra") || lower.includes("database") || lower.includes("db") || lower.includes("repositories") || lower.includes("adapters")) {
      tiers[3].folders.push(f);
    } else if (lower.includes("test") || lower.includes("spec") || lower.includes("__tests__")) {
      tiers[5].folders.push(f);
    } else {
      tiers[4].folders.push(f);
    }
  });

  return tiers.filter((t) => t.folders.length > 0);
}

function ArchitectureInner() {
  const repo = useRepo();
  const [record, setRecord] = useState<ArchitectureRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const key = repo ? repoKey(repo) : "";

  useEffect(() => {
    if (!repo) {
      setRecord(null);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setRecord(null);
    setError(null);
    setLoading(true);
    apiFetch<ArchitectureRecord>(`/api/v1/analysis/by-repo?${repoQuery(repo)}`)
      .then((data) => {
        if (!cancelled) setRecord(data);
      })
      .catch((e) => {
        if (!cancelled) {
          if (e instanceof ApiError && e.status === 404) setRecord(null);
          else setError(e instanceof ApiError ? e.message : "Failed to load analysis.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  const refresh = () => {
    if (!repo) return;
    setLoading(true);
    setError(null);
    apiFetch<ArchitectureRecord>(`/api/v1/analysis/by-repo?${repoQuery(repo)}`)
      .then(setRecord)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 404) setRecord(null);
        else setError(e instanceof ApiError ? e.message : "Failed to load analysis.");
      })
      .finally(() => setLoading(false));
  };

  const arch = record?.architecture ?? null;
  const patternName = arch?.detected_pattern || "Modular Application";
  const confidenceScore = arch?.confidence_score ?? 75;
  const confidenceLevel = confidenceScore >= 80 ? "High" : confidenceScore >= 60 ? "Medium" : "Low";
  const folders = Array.isArray(arch?.folder_graph) ? arch.folder_graph : [];

  const tiers = useMemo(() => classifyFoldersIntoTiers(folders), [folders]);

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
            <GitPullRequest className="w-4 h-4" />
            <span>Architecture Explorer</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono">
            Software Architecture & Structural Map
          </h1>
          <p className="text-xs text-slate-400">
            {repo
              ? `Real architectural layout for ${repo.owner}/${repo.repo} — structural pattern classification, layer decoupling, and component isolation.`
              : "Structural architecture analyzer for verified repository codebases."}
          </p>
        </div>

        {arch && (
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200">
              Pattern: <span className="text-cyan-400 font-bold">{patternName}</span>
            </span>
            <span className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold ${
              confidenceLevel === "High"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : confidenceLevel === "Medium"
                  ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
            }`}>
              Confidence: {confidenceLevel} ({confidenceScore}%)
            </span>
          </div>
        )}
      </div>

      {!repo ? (
        <EmptyBlock
          title="No repository selected"
          hint="Select a repository from the dashboard to explore its architecture."
        />
      ) : loading && !record ? (
        <div className="space-y-4">
          <LoadingSkeleton lines={2} label="Analyzing software architecture" />
          <LoadingSkeleton lines={4} label="Loading structural modules" />
        </div>
      ) : error ? (
        <ErrorBlock message={error} onRetry={refresh} />
      ) : !record ? (
        <EmptyBlock
          title={`'${repo.owner}/${repo.repo}' hasn't been analyzed yet`}
          hint="Run an analysis to generate architecture results from live GitHub data."
        />
      ) : record.status === "FAILED" ? (
        <ErrorBlock
          message={record.error_message || "Analysis failed."}
          onRetry={refresh}
        />
      ) : !arch ? (
        <EmptyBlock
          title="Architecture data unavailable"
          hint="This analysis did not report structural architecture results."
        />
      ) : (
        <>
          {/* Architecture Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 font-mono">
            <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-5 space-y-1">
              <div className="text-[10px] uppercase text-slate-500 tracking-wider">Modularity Score</div>
              <div className="text-3xl font-bold text-slate-200">
                {arch.modularity_score ?? "—"} <span className="text-xs text-slate-500">/ 100</span>
              </div>
              <div className="text-[11px] text-slate-400">Boundary & component encapsulation index</div>
            </div>

            <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-5 space-y-1">
              <div className="text-[10px] uppercase text-slate-500 tracking-wider">Coupling Index</div>
              <div className="text-3xl font-bold text-emerald-400">
                {arch.coupling_score ?? "—"} <span className="text-xs text-slate-500">/ 100</span>
              </div>
              <div className="text-[11px] text-slate-400">Interdependence and cohesion rating</div>
            </div>

            <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-5 space-y-1">
              <div className="text-[10px] uppercase text-slate-500 tracking-wider">Overall Architecture</div>
              <div className="text-3xl font-bold text-cyan-400">
                {arch.architecture_score ?? "—"} <span className="text-xs text-slate-500">/ 100</span>
              </div>
              <div className="text-[11px] text-slate-400">Weighted architectural health rating</div>
            </div>
          </div>

          {arch.summary && (
            <div className="rounded-xl bg-slate-900/40 border border-slate-800 p-5 text-xs text-slate-300 leading-relaxed font-sans">
              <span className="font-bold text-slate-200 font-mono">Architectural Diagnosis: </span>
              {arch.summary}
            </div>
          )}

          {/* Architecture Explorer: Architectural Tiers */}
          <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-6 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="space-y-0.5">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-cyan-400" />
                  Architectural Layers & Modules ({folders.length} paths mapped)
                </h3>
                <p className="text-xs text-slate-400">
                  Click any architectural layer to inspect its corresponding directories.
                </p>
              </div>

              {/* Zoom & Reset Controls */}
              <div className="flex items-center gap-1.5 font-mono text-xs">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(0.8, z - 0.1))}
                  className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 text-slate-500">{Math.round(zoomLevel * 100)}%</span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
                  className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    setZoomLevel(1);
                    setSelectedTier(null);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-800 text-[11px]"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Architectural Tier Cards */}
            <div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 transition-transform duration-200"
              style={{ transform: `scale(${zoomLevel})`, transformOrigin: "top left" }}
            >
              {tiers.map((tier) => {
                const isSelected = selectedTier === tier.id;
                return (
                  <div
                    key={tier.id}
                    onClick={() => setSelectedTier(isSelected ? null : tier.id)}
                    className={`p-5 rounded-xl border transition-all cursor-pointer space-y-3 ${
                      isSelected
                        ? "bg-slate-900 border-cyan-500 ring-2 ring-cyan-500/20"
                        : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded border ${tier.color}`}>
                        {tier.name}
                      </span>
                      <span className="font-mono text-xs text-slate-500">
                        {tier.folders.length} {tier.folders.length === 1 ? "dir" : "dirs"}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed font-sans">
                      {tier.description}
                    </p>

                    <div className="space-y-1.5 pt-2 border-t border-slate-800/80 font-mono text-xs">
                      {tier.folders.slice(0, 4).map((f) => (
                        <div key={f} className="flex items-center gap-2 text-slate-300 truncate">
                          <Folder className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                          <span className="truncate">{f}</span>
                        </div>
                      ))}
                      {tier.folders.length > 4 && (
                        <div className="text-[11px] text-cyan-400 pt-1">
                          +{tier.folders.length - 4} more directories
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Tier Expanded File Explorer */}
            {selectedTier && (
              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-200">
                    Inspecting: {tiers.find((t) => t.id === selectedTier)?.name}
                  </h4>
                  <button
                    onClick={() => setSelectedTier(null)}
                    className="text-slate-400 hover:text-white text-[11px]"
                  >
                    Close Tier
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {tiers.find((t) => t.id === selectedTier)?.folders.map((f) => (
                    <div
                      key={f}
                      className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center gap-2 text-slate-300 truncate"
                    >
                      <Folder className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                      <span className="truncate">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}

export default function ArchitecturePage() {
  return (
    <Suspense fallback={<LoadingSkeleton lines={4} label="Loading architecture explorer" />}>
      <ArchitectureInner />
    </Suspense>
  );
}
