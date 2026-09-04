"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  FolderGit2,
  GitBranch,
  GitCommit,
  Users,
  Code,
  FileCode,
  Folder,
  ExternalLink,
  Search,
} from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { useRepo, repoKey, repoQuery } from "@/lib/useRepo";
import {
  LoadingSkeleton,
  ErrorBlock,
  EmptyBlock,
} from "@/components/StateBlocks";

interface CommitInfo {
  sha: string;
  message: string;
  author_name: string;
  date: string;
}

interface ContributorInfo {
  login: string;
  contributions: number;
  avatar_url?: string | null;
  html_url?: string | null;
}

interface RepoDetails {
  repository_name: string;
  owner: string;
  full_name: string;
  html_url: string;
  default_branch: string;
  languages: Record<string, number>;
  detected_framework?: string | null;
  branches: string[];
  recent_commits: CommitInfo[];
  top_contributors: ContributorInfo[];
  readme_content?: string | null;
  license_name?: string | null;
  folder_tree: string[];
}

interface ByRepoRepository {
  owner?: string;
  name?: string;
  url?: string;
  description?: string | null;
  stars?: number | null;
  forks?: number | null;
  open_issues?: number | null;
  commit_sha?: string | null;
  language?: string | null;
  license?: string | null;
}

interface ByRepoRecord {
  status: string;
  error_message?: string | null;
  repository?: ByRepoRepository | null;
}

const LANG_COLORS = [
  "bg-cyan-400",
  "bg-indigo-400",
  "bg-emerald-400",
  "bg-amber-400",
  "bg-rose-400",
  "bg-purple-400",
  "bg-teal-400",
];

function RepositoryInner() {
  const repo = useRepo();
  const [details, setDetails] = useState<RepoDetails | null>(null);
  const [record, setRecord] = useState<ByRepoRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");

  const key = repo ? repoKey(repo) : "";

  useEffect(() => {
    if (!repo) {
      setDetails(null);
      setRecord(null);
      setError(null);
      setLoading(false);
      setFilter("");
      setSelectedBranch("");
      return;
    }
    let cancelled = false;
    setDetails(null); // clear previous repo's data immediately
    setRecord(null);
    setError(null);
    setFilter("");
    setLoading(true);
    const repoUrl = `https://github.com/${repo.owner}/${repo.repo}`;
    const detailsReq = apiFetch<RepoDetails>(
      `/api/v1/repository/details?repo_url=${encodeURIComponent(repoUrl)}`
    );
    const recordReq = apiFetch<ByRepoRecord>(
      `/api/v1/analysis/by-repo?${repoQuery(repo)}`
    ).catch((e: unknown) => {
      if (e instanceof ApiError && e.status === 404) return null; // never analyzed — fine
      throw e;
    });
    Promise.all([detailsReq, recordReq])
      .then(([d, r]) => {
        if (cancelled) return;
        setDetails(d);
        setRecord(r);
        setSelectedBranch(d.default_branch || d.branches[0] || "main");
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(
            e instanceof ApiError ? e.message : "Failed to load repository."
          );
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

  const languages = useMemo(() => {
    const langs = details?.languages || {};
    const total = Object.values(langs).reduce((a, b) => a + b, 0);
    return Object.entries(langs)
      .sort((a, b) => b[1] - a[1])
      .map(([name, bytes], i) => ({
        name,
        bytes,
        pct: total > 0 ? (bytes / total) * 100 : 0,
        color: LANG_COLORS[i % LANG_COLORS.length],
      }));
  }, [details]);

  const treePaths = useMemo(() => {
    const tree = details?.folder_tree || [];
    const q = filter.trim().toLowerCase();
    if (!q) return tree;
    return tree.filter((p) => p.toLowerCase().includes(q));
  }, [details, filter]);

  const isFolderPath = (p: string) => {
    const base = p.split("/").pop() || "";
    return !base.includes(".");
  };

  const retry = () => {
    if (!repo) return;
    setLoading(true);
    setError(null);
    const repoUrl = `https://github.com/${repo.owner}/${repo.repo}`;
    apiFetch<RepoDetails>(
      `/api/v1/repository/details?repo_url=${encodeURIComponent(repoUrl)}`
    )
      .then((d) => {
        setDetails(d);
        setSelectedBranch(d.default_branch || d.branches[0] || "main");
        return apiFetch<ByRepoRecord>(
          `/api/v1/analysis/by-repo?${repoQuery(repo)}`
        ).catch((e: unknown) => {
          if (e instanceof ApiError && e.status === 404) return null;
          throw e;
        });
      })
      .then((r) => setRecord(r))
      .catch((e: unknown) => {
        setError(
          e instanceof ApiError ? e.message : "Failed to load repository."
        );
      })
      .finally(() => setLoading(false));
  };

  const r = record?.repository;
  const repoName = details?.repository_name || r?.name || repo?.repo || "";
  const repoOwner = details?.owner || r?.owner || repo?.owner || "";
  const repoUrl =
    details?.html_url || r?.url || `https://github.com/${repoOwner}/${repoName}`;
  const branchOptions =
    details && details.branches.length > 0
      ? details.branches
      : selectedBranch
        ? [selectedBranch]
        : ["main"];

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
          hint="Pick a repository from the dashboard (owner/repo in the URL) to browse its files, commits, and contributors."
        />
      ) : loading && !details ? (
        <div className="space-y-4">
          <LoadingSkeleton lines={2} label="Loading repository" />
          <LoadingSkeleton lines={4} label="Loading file tree" />
        </div>
      ) : error ? (
        <ErrorBlock message={error} onRetry={retry} />
      ) : !details ? (
        <EmptyBlock
          title={`Couldn't find '${repo.owner}/${repo.repo}'`}
          hint="Check the owner/repo spelling, or analyze the repository from the dashboard first."
        />
      ) : (
        <>
          {/* Repo Header */}
          <div className="glass-panel p-6 rounded-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  {details.detected_framework && (
                    <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {details.detected_framework}
                    </span>
                  )}
                  {(details.license_name || r?.license) && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {details.license_name || r?.license}
                    </span>
                  )}
                </div>
                <h1 className="text-3xl font-black text-white tracking-tight">
                  {repoOwner} <span className="text-slate-500">/</span>{" "}
                  <span className="linear-gradient-text">{repoName}</span>
                </h1>
                <a
                  href={repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors inline-flex items-center gap-1"
                >
                  <span>{repoUrl}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                {(r?.description || details.readme_content) && (
                  <p className="text-xs text-slate-400 max-w-2xl">
                    {r?.description || ""}
                  </p>
                )}
                {(r?.stars != null ||
                  r?.forks != null ||
                  r?.open_issues != null) && (
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs font-mono text-slate-400">
                    {r?.stars != null && <span>★ {r.stars} stars</span>}
                    {r?.forks != null && <span>⑂ {r.forks} forks</span>}
                    {r?.open_issues != null && (
                      <span>◉ {r.open_issues} open issues</span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-300 bg-slate-950 px-3.5 py-2 rounded-xl border border-white/10">
                  <GitBranch className="w-4 h-4 text-cyan-400" />
                  <span>Branch:</span>
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="bg-transparent font-bold text-white focus:outline-none cursor-pointer"
                  >
                    {branchOptions.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Main Grid: File Tree & Commit History */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* File Tree Component */}
            <div className="lg:col-span-2 glass-panel p-6 rounded-lg space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FolderGit2 className="w-5 h-5 text-cyan-400" />
                Repository File & Folder Tree ({treePaths.length} items)
              </h3>

              <div className="flex items-center gap-2 px-3 text-slate-400 rounded-xl bg-slate-950/80 border border-white/15">
                <Search className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <input
                  type="text"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Filter files and folders..."
                  aria-label="Filter files and folders"
                  className="flex-1 bg-transparent py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
                />
              </div>

              <div className="divide-y divide-white/5 font-mono text-xs max-h-96 overflow-y-auto">
                {treePaths.length === 0 ? (
                  <div className="p-6 text-center text-slate-500">
                    {filter
                      ? `No paths match '${filter}'.`
                      : "No files reported for this repository."}
                  </div>
                ) : (
                  treePaths.map((path, idx) => {
                    const folder = isFolderPath(path);
                    return (
                      <div
                        key={`${path}-${idx}`}
                        className="py-2.5 px-3 flex items-center justify-between hover:bg-white/5 rounded-xl transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {folder ? (
                            <Folder className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                          ) : (
                            <FileCode className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                          )}
                          <span
                            className={
                              folder
                                ? "font-bold text-slate-200 truncate"
                                : "text-slate-300 truncate"
                            }
                          >
                            {path}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Commit History & Languages */}
            <div className="space-y-6">
              {/* Language Breakdown */}
              <div className="glass-panel p-6 rounded-lg space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Code className="w-4 h-4 text-emerald-400" />
                  Language Breakdown
                </h3>
                {languages.length === 0 ? (
                  <p className="text-xs font-mono text-slate-500">
                    No language data reported.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {languages.map((l) => (
                      <div key={l.name} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-slate-300 font-mono">
                          <span>{l.name}</span>
                          <span className="text-cyan-400">
                            {l.pct.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                          <div
                            className={`h-full ${l.color} rounded-full`}
                            style={{ width: `${l.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Commits */}
              <div className="glass-panel p-6 rounded-lg space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <GitCommit className="w-4 h-4 text-amber-400" />
                  Recent Commits
                </h3>
                {details.recent_commits.length === 0 ? (
                  <p className="text-xs font-mono text-slate-500">
                    No commits reported.
                  </p>
                ) : (
                  <div className="space-y-3 font-mono text-xs">
                    {details.recent_commits.map((c) => (
                      <div
                        key={c.sha}
                        className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px] gap-2">
                          <span className="text-cyan-400 font-bold truncate">
                            sha: {c.sha.slice(0, 7)}
                          </span>
                          <span className="text-slate-500 flex-shrink-0">
                            {c.date ? new Date(c.date).toLocaleString() : ""}
                          </span>
                        </div>
                        <div className="text-slate-200">{c.message}</div>
                        {c.author_name && (
                          <div className="text-slate-500 text-[11px]">
                            by {c.author_name}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Contributors */}
              <div className="glass-panel p-6 rounded-lg space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  Top Contributors
                </h3>
                {details.top_contributors.length === 0 ? (
                  <p className="text-xs font-mono text-slate-500">
                    No contributor data reported.
                  </p>
                ) : (
                  <div className="space-y-2 font-mono text-xs">
                    {details.top_contributors.map((c) => (
                      <div
                        key={c.login}
                        className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-2"
                      >
                        <span className="text-slate-200 font-bold truncate">
                          {c.login}
                        </span>
                        <span className="text-slate-500 text-[11px] flex-shrink-0">
                          {c.contributions} commits
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}

export default function RepositoryPage() {
  return (
    <Suspense fallback={<LoadingSkeleton lines={4} label="Loading repository" />}>
      <RepositoryInner />
    </Suspense>
  );
}
