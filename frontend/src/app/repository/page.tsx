"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  AlertTriangle,
  ShieldAlert,
  Cpu,
  Sparkles,
  X,
  FileText,
  Filter,
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

interface FindingItem {
  id?: string;
  pillar?: string;
  severity?: string;
  title?: string;
  issue_type?: string;
  affected_file?: string;
  file_path?: string;
  line_number?: number;
  line?: number;
  snippet?: string;
  recommendation?: string;
}

interface ByRepoRecord {
  analysis_id?: string;
  status: string;
  error_message?: string | null;
  repository?: {
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
  } | null;
  security?: { findings?: FindingItem[] } | null;
  quality?: { findings?: FindingItem[] } | null;
  file_risk_map?: Record<
    string,
    { level: string; risk_score: number; findings: FindingItem[] }
  > | null;
}

interface FileExplanation {
  file_path: string;
  purpose: string;
  responsibilities: string[];
  functions: string[];
  dependencies: string[];
  potential_concerns: string[];
  source_attribution: string;
  is_ai_generated: boolean;
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

const QUICK_SEARCH_CHIPS = [
  { label: "All Files", q: "" },
  { label: "Auth", q: "auth" },
  { label: "Database", q: "db" },
  { label: "API", q: "api" },
  { label: "Payment", q: "pay" },
  { label: "Security", q: "sec" },
  { label: "Tests", q: "test" },
];

function RepositoryInner() {
  const repo = useRepo();
  const [details, setDetails] = useState<RepoDetails | null>(null);
  const [record, setRecord] = useState<ByRepoRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [riskFilter, setRiskFilter] = useState<string>("ALL");
  const [selectedBranch, setSelectedBranch] = useState("");

  // Slideout file inspector
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [explanation, setExplanation] = useState<FileExplanation | null>(null);
  const [explainError, setExplainError] = useState<string | null>(null);

  const key = repo ? repoKey(repo) : "";

  useEffect(() => {
    if (!repo) {
      setDetails(null);
      setRecord(null);
      setError(null);
      setLoading(false);
      setFilter("");
      setSelectedBranch("");
      setSelectedFile(null);
      return;
    }
    let cancelled = false;
    setDetails(null);
    setRecord(null);
    setError(null);
    setFilter("");
    setSelectedFile(null);
    setExplanation(null);
    setLoading(true);
    const repoUrl = `https://github.com/${repo.owner}/${repo.repo}`;
    const detailsReq = apiFetch<RepoDetails>(
      `/api/v1/repository/details?repo_url=${encodeURIComponent(repoUrl)}`
    );
    const recordReq = apiFetch<ByRepoRecord>(
      `/api/v1/analysis/by-repo?${repoQuery(repo)}`
    ).catch((e: unknown) => {
      if (e instanceof ApiError && e.status === 404) return null;
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
  }, [key]);

  // Compute file risk map from record
  const fileRisks = useMemo(() => {
    if (record?.file_risk_map) return record.file_risk_map;
    const map: Record<
      string,
      { level: string; risk_score: number; findings: FindingItem[] }
    > = {};

    const secFindings = record?.security?.findings || [];
    secFindings.forEach((f) => {
      const fp = f.affected_file || f.file_path;
      if (!fp) return;
      const entry = (map[fp] = map[fp] || {
        level: "LOW",
        risk_score: 0,
        findings: [],
      });
      const sev = (f.severity || "LOW").toUpperCase();
      const weight =
        sev === "CRITICAL" ? 40 : sev === "HIGH" ? 25 : sev === "MEDIUM" ? 10 : 5;
      entry.risk_score += weight;
      entry.findings.push({ ...f, pillar: "security" });
    });

    const qualFindings = record?.quality?.findings || [];
    qualFindings.forEach((f) => {
      const fp = f.affected_file || f.file_path;
      if (!fp) return;
      const entry = (map[fp] = map[fp] || {
        level: "LOW",
        risk_score: 0,
        findings: [],
      });
      const weight = (f.title || "").toLowerCase().includes("complexity")
        ? 20
        : 10;
      entry.risk_score += weight;
      entry.findings.push({ ...f, pillar: "quality" });
    });

    Object.values(map).forEach((entry) => {
      const s = entry.risk_score;
      entry.level =
        s >= 40
          ? "CRITICAL"
          : s >= 25
            ? "HIGH"
            : s >= 10
              ? "MEDIUM"
              : "LOW";
    });

    return map;
  }, [record]);

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

  const isFolderPath = (p: string) => {
    const base = p.split("/").pop() || "";
    return !base.includes(".");
  };

  const treePaths = useMemo(() => {
    const tree = details?.folder_tree || [];
    const q = filter.trim().toLowerCase();

    return tree.filter((p) => {
      if (q && !p.toLowerCase().includes(q)) return false;

      if (riskFilter !== "ALL") {
        const risk = fileRisks[p]?.level || "CLEAN";
        if (riskFilter === "CLEAN" && risk !== "CLEAN") return false;
        if (riskFilter !== "CLEAN" && risk !== riskFilter) return false;
      }

      return true;
    });
  }, [details, filter, riskFilter, fileRisks]);

  const handleExplainFile = async (filePath: string) => {
    if (!repo) return;
    setExplaining(true);
    setExplainError(null);
    setExplanation(null);
    try {
      const repoUrl = `https://github.com/${repo.owner}/${repo.repo}`;
      const res = await apiFetch<FileExplanation>(
        `/api/v1/repository/explain-file`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            repo_url: repoUrl,
            file_path: filePath,
            branch: selectedBranch || "main",
            analysis_id: record?.analysis_id,
          }),
        }
      );
      setExplanation(res);
    } catch (e: unknown) {
      setExplainError(
        e instanceof ApiError ? e.message : "Failed to explain file."
      );
    } finally {
      setExplaining(false);
    }
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

  const selectedFileFindings = selectedFile ? fileRisks[selectedFile]?.findings || [] : [];
  const selectedFileRisk = selectedFile ? fileRisks[selectedFile]?.level || "CLEAN" : "CLEAN";

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
          hint="Pick a repository from the dashboard (owner/repo in the URL) to browse its files, commits, and risk signals."
        />
      ) : loading && !details ? (
        <div className="space-y-4">
          <LoadingSkeleton lines={2} label="Loading repository" />
          <LoadingSkeleton lines={4} label="Loading file tree" />
        </div>
      ) : error ? (
        <ErrorBlock message={error} onRetry={() => {}} />
      ) : !details ? (
        <EmptyBlock
          title={`Couldn't find '${repo.owner}/${repo.repo}'`}
          hint="Check the owner/repo spelling, or analyze the repository from the dashboard first."
        />
      ) : (
        <>
          {/* Repo Header */}
          <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-6 space-y-4">
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
                <h1 className="text-3xl font-black text-white tracking-tight font-mono">
                  {repoOwner} <span className="text-slate-500">/</span> {repoName}
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
                  <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                    {r?.description || ""}
                  </p>
                )}
                {(r?.stars != null ||
                  r?.forks != null ||
                  r?.open_issues != null) && (
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs font-mono text-slate-400 pt-1">
                    {r?.stars != null && <span>★ {r.stars} stars</span>}
                    {r?.forks != null && <span>⑂ {r.forks} forks</span>}
                    {r?.open_issues != null && (
                      <span>◉ {r.open_issues} open issues</span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-300 bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800">
                  <GitBranch className="w-4 h-4 text-cyan-400" />
                  <span>Branch:</span>
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="bg-transparent font-bold text-white focus:outline-none cursor-pointer"
                  >
                    {branchOptions.map((b) => (
                      <option key={b} value={b} className="bg-slate-900 text-white">
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Main Grid: File Tree (Risk Map) & Commit History */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* File Tree Component */}
            <div className="lg:col-span-2 rounded-xl bg-slate-900/50 border border-slate-800 p-6 space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FolderGit2 className="w-5 h-5 text-cyan-400" />
                  Repository File & Risk Map ({treePaths.length} items)
                </h3>
                <span className="text-[11px] font-mono text-slate-500">
                  Click any file to inspect findings & explain
                </span>
              </div>

              {/* Quick Search Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {QUICK_SEARCH_CHIPS.map((chip) => (
                  <button
                    key={chip.label}
                    onClick={() => setFilter(chip.q)}
                    className={`px-2.5 py-1 rounded text-xs font-mono transition-colors border ${
                      filter === chip.q
                        ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 font-bold"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Filters row: Search input & Risk dropdown */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex items-center gap-2 px-3 text-slate-400 rounded-xl bg-slate-950/80 border border-slate-800 flex-1">
                  <Search className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <input
                    type="text"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Search files (e.g. auth, api, config)..."
                    aria-label="Filter files and folders"
                    className="flex-1 bg-transparent py-2 text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
                  <Filter className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-slate-400">Risk:</span>
                  <select
                    value={riskFilter}
                    onChange={(e) => setRiskFilter(e.target.value)}
                    className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="ALL" className="bg-slate-900">All Risk Levels</option>
                    <option value="CRITICAL" className="bg-slate-900">Critical Only</option>
                    <option value="HIGH" className="bg-slate-900">High Only</option>
                    <option value="MEDIUM" className="bg-slate-900">Medium Only</option>
                    <option value="LOW" className="bg-slate-900">Low Only</option>
                    <option value="CLEAN" className="bg-slate-900">Clean Files</option>
                  </select>
                </div>
              </div>

              {/* File Tree List */}
              <div className="divide-y divide-slate-800/80 font-mono text-xs max-h-[500px] overflow-y-auto rounded-lg bg-slate-950/40 p-2 border border-slate-800">
                {treePaths.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    {filter || riskFilter !== "ALL"
                      ? "No files match the selected filter criteria."
                      : "No files reported for this repository."}
                  </div>
                ) : (
                  treePaths.map((path, idx) => {
                    const folder = isFolderPath(path);
                    const risk = fileRisks[path]?.level;
                    const findingsCount = fileRisks[path]?.findings.length || 0;

                    const riskBadge =
                      risk === "CRITICAL"
                        ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        : risk === "HIGH"
                          ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
                          : risk === "MEDIUM"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : risk === "LOW"
                              ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                              : null;

                    return (
                      <div
                        key={`${path}-${idx}`}
                        onClick={() => {
                          if (!folder) {
                            setSelectedFile(path);
                            setExplanation(null);
                            setExplainError(null);
                          }
                        }}
                        className={`py-2 px-3 flex items-center justify-between rounded-lg transition-colors ${
                          folder
                            ? "cursor-default text-slate-400"
                            : "cursor-pointer hover:bg-slate-900/80 group"
                        } ${selectedFile === path ? "bg-slate-900 border border-cyan-500/40" : ""}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {folder ? (
                            <Folder className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                          ) : (
                            <FileCode className="w-4 h-4 text-cyan-400 flex-shrink-0 group-hover:text-cyan-300" />
                          )}
                          <span
                            className={
                              folder
                                ? "font-bold text-slate-300 truncate"
                                : "text-slate-300 truncate group-hover:text-white"
                            }
                          >
                            {path}
                          </span>
                        </div>

                        {!folder && (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {riskBadge ? (
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${riskBadge}`}
                              >
                                {risk} ({findingsCount})
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-600">CLEAN</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Commit History & Languages */}
            <div className="space-y-6">
              {/* Language Breakdown */}
              <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-6 space-y-4">
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
                          <span className="text-cyan-400 font-bold">
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
              <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-6 space-y-4">
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
                    {details.recent_commits.slice(0, 5).map((c) => (
                      <div
                        key={c.sha}
                        className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px] gap-2">
                          <span className="text-cyan-400 font-bold truncate">
                            sha: {c.sha.slice(0, 7)}
                          </span>
                          <span className="text-slate-500 flex-shrink-0">
                            {c.date ? new Date(c.date).toLocaleDateString() : ""}
                          </span>
                        </div>
                        <div className="text-slate-200 truncate">{c.message}</div>
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
              <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-6 space-y-4">
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
                    {details.top_contributors.slice(0, 6).map((c) => (
                      <div
                        key={c.login}
                        className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-2"
                      >
                        <span className="text-slate-200 font-bold truncate">
                          @{c.login}
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

          {/* Slideout / Drawer: File Inspector */}
          <AnimatePresence>
            {selectedFile && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 max-h-[85vh] overflow-y-auto shadow-2xl"
              >
                <div className="max-w-5xl mx-auto space-y-4">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-3">
                      <FileCode className="w-5 h-5 text-cyan-400" />
                      <div>
                        <h4 className="text-sm font-bold text-white font-mono">
                          {selectedFile}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                          <span>Risk Level:</span>
                          <span
                            className={`font-bold ${
                              selectedFileRisk === "CRITICAL"
                                ? "text-rose-400"
                                : selectedFileRisk === "HIGH"
                                  ? "text-orange-400"
                                  : selectedFileRisk === "MEDIUM"
                                    ? "text-amber-400"
                                    : "text-emerald-400"
                            }`}
                          >
                            {selectedFileRisk}
                          </span>
                          <span>·</span>
                          <span>{selectedFileFindings.length} findings detected</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleExplainFile(selectedFile)}
                        disabled={explaining}
                        className="px-3.5 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-semibold font-mono flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{explaining ? "Analyzing..." : "Explain This File"}</span>
                      </button>
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        aria-label="Close file inspector"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Explanation Block */}
                  {explaining && (
                    <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 text-xs font-mono text-slate-400 text-center animate-pulse">
                      Retrieving source code and generating grounded file explanation...
                    </div>
                  )}

                  {explainError && (
                    <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono">
                      {explainError}
                    </div>
                  )}

                  {explanation && (
                    <div className="rounded-xl bg-slate-900/70 border border-cyan-500/30 p-5 space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-cyan-400 uppercase tracking-wider text-[11px] font-mono">
                          {explanation.is_ai_generated ? "AI Architectural Explanation" : "Static Code Analysis"}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {explanation.source_attribution}
                        </span>
                      </div>

                      <p className="text-slate-200 leading-relaxed font-semibold">
                        {explanation.purpose}
                      </p>

                      {explanation.responsibilities?.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-slate-400 font-semibold font-mono">Responsibilities:</span>
                          <ul className="list-disc list-inside text-slate-300 space-y-1">
                            {explanation.responsibilities.map((r, i) => (
                              <li key={i}>{r}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        {explanation.functions?.length > 0 && (
                          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
                            <span className="text-slate-400 font-semibold font-mono text-[11px]">Exported Symbols / Functions:</span>
                            <div className="flex flex-wrap gap-1 pt-1 font-mono text-[11px]">
                              {explanation.functions.map((fn, i) => (
                                <span key={i} className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                                  {fn}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {explanation.dependencies?.length > 0 && (
                          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
                            <span className="text-slate-400 font-semibold font-mono text-[11px]">Dependencies:</span>
                            <div className="flex flex-wrap gap-1 pt-1 font-mono text-[11px]">
                              {explanation.dependencies.map((dep, i) => (
                                <span key={i} className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                                  {dep}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Associated Findings on this File */}
                  <div className="space-y-2">
                    <h5 className="text-xs font-semibold text-slate-300 font-mono">
                      Static Analyzer Findings ({selectedFileFindings.length})
                    </h5>

                    {selectedFileFindings.length === 0 ? (
                      <div className="p-4 rounded-lg bg-slate-950/40 border border-slate-800 text-xs font-mono text-slate-500 text-center">
                        No security or quality defects detected on this file.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {selectedFileFindings.map((f, i) => {
                          const sev = (f.severity || "LOW").toUpperCase();
                          return (
                            <div
                              key={i}
                              className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1 text-xs"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border bg-slate-800 text-slate-200">
                                    {sev}
                                  </span>
                                  <span className="font-semibold text-slate-200">
                                    {f.title || f.issue_type}
                                  </span>
                                </div>
                                <span className="text-[11px] font-mono text-slate-500">
                                  Line {f.line_number || f.line || 1}
                                </span>
                              </div>
                              {f.snippet && (
                                <div className="p-2 rounded bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto">
                                  <code>{f.snippet}</code>
                                </div>
                              )}
                              {f.recommendation && (
                                <div className="text-slate-400 text-[11px]">
                                  <span className="text-emerald-400 font-semibold font-mono">Fix: </span>
                                  {f.recommendation}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
