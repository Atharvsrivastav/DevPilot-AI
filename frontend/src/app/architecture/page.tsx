"use client";

import React, { Suspense, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { GitPullRequest, Layers, Folder } from "lucide-react";
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

const FOLDER_CAP = 30;

function formatScore(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value)
    ? `${value} / 100`
    : "—";
}

function ArchitectureInner() {
  const repo = useRepo();
  const [record, setRecord] = useState<ArchitectureRecord | null>(null);
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
    apiFetch<ArchitectureRecord>(`/api/v1/analysis/by-repo?${repoQuery(repo)}`)
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
    apiFetch<ArchitectureRecord>(`/api/v1/analysis/by-repo?${repoQuery(repo)}`)
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

  const arch = record?.architecture ?? null;
  const patternName = arch?.detected_pattern || null;
  const confidence = arch?.confidence_score;
  const folders = Array.isArray(arch?.folder_graph) ? arch.folder_graph : [];
  const visibleFolders = folders.slice(0, FOLDER_CAP);
  const hiddenCount = folders.length - visibleFolders.length;

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
          <div className="flex items-center gap-2 text-xs font-mono text-indigo-400">
            <GitPullRequest className="w-4 h-4" />
            <span>Architecture Analyzer Engine</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight linear-gradient-text">
            Software Architecture & Dependency Graph
          </h1>
          <p className="text-xs text-slate-400">
            {repo
              ? `Live architecture results for ${repo.owner}/${repo.repo}: detected structural pattern, modularity, coupling, and directory layout.`
              : "Detects Clean Architecture, Hexagonal (Ports & Adapters), MVC, or Microservices structural patterns."}
          </p>
        </div>

        {patternName && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-3.5 py-1.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold">
              Pattern: {patternName}
              {typeof confidence === "number" && Number.isFinite(confidence)
                ? ` (Confidence: ${confidence}%)`
                : ""}
            </span>
          </div>
        )}
      </div>

      {!repo ? (
        <EmptyBlock
          title="No repository selected"
          hint="Add ?owner=<owner>&repo=<repo> to the URL, or pick a repository from the dashboard."
        />
      ) : loading && !record ? (
        <div className="space-y-4">
          <LoadingSkeleton lines={2} label="Loading architecture metrics" />
          <LoadingSkeleton lines={4} label="Loading directory structure" />
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
          hint="This analysis did not produce architecture results. Run a fresh analysis to generate them."
        />
      ) : (
        <>
          {/* Architecture Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="glass-panel p-5 rounded-md space-y-1">
              <div className="text-xs font-semibold text-slate-400 uppercase">
                Modularity Score
              </div>
              <div className="text-3xl font-black text-indigo-400 font-mono">
                {formatScore(arch.modularity_score)}
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                Component Isolation Rating
              </div>
            </div>
            <div className="glass-panel p-5 rounded-md space-y-1">
              <div className="text-xs font-semibold text-slate-400 uppercase">
                Coupling Index
              </div>
              <div className="text-3xl font-black text-emerald-400 font-mono">
                {formatScore(arch.coupling_score)}
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                Layer Interdependence Index
              </div>
            </div>
            <div className="glass-panel p-5 rounded-md space-y-1">
              <div className="text-xs font-semibold text-slate-400 uppercase">
                Architecture Rating
              </div>
              <div className="text-3xl font-black text-cyan-400 font-mono">
                {formatScore(arch.architecture_score)}
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                Calculated Score
              </div>
            </div>
          </div>

          {arch.summary && (
            <div className="glass-panel p-5 rounded-md">
              <p className="text-xs text-slate-300 leading-relaxed">
                {arch.summary}
              </p>
            </div>
          )}

          {/* Detected Directory Structure */}
          <div className="glass-panel p-8 rounded-lg space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              Detected Directory Structure
              {patternName ? `: ${patternName}` : ""}
            </h3>

            {visibleFolders.length === 0 ? (
              <EmptyBlock
                title="Directory structure unavailable"
                hint="This analysis did not report a folder layout for the repository."
              />
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 font-mono">
                  {visibleFolders.map((folder) => (
                    <div
                      key={folder}
                      className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs flex items-center gap-2 overflow-hidden"
                    >
                      <Folder className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                      <span className="truncate">{folder}</span>
                    </div>
                  ))}
                </div>
                {hiddenCount > 0 && (
                  <p className="text-[11px] text-slate-500 font-mono">
                    +{hiddenCount} more {hiddenCount === 1 ? "directory" : "directories"} not shown
                  </p>
                )}
              </>
            )}
          </div>

          {/* Mermaid.js Diagram Source Box */}
          <div className="glass-panel p-6 rounded-lg space-y-3 font-mono text-xs">
            <h4 className="font-bold text-white text-sm">
              Generated Mermaid.js Flowchart
            </h4>
            {arch.mermaid_diagram ? (
              <div className="p-4 rounded-md bg-slate-950 text-slate-300 border border-white/10 overflow-x-auto leading-relaxed">
                <pre>{arch.mermaid_diagram}</pre>
              </div>
            ) : (
              <EmptyBlock
                title="Diagram unavailable"
                hint="This analysis did not generate a Mermaid diagram for the repository."
              />
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}

export default function ArchitecturePage() {
  return (
    <Suspense
      fallback={<LoadingSkeleton lines={4} label="Loading architecture page" />}
    >
      <ArchitectureInner />
    </Suspense>
  );
}
