"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  Cpu,
  GitPullRequest,
  Package,
  FlaskConical,
  FileText,
  Github,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { apiFetch, ApiError, parseRepoInput, repoSearch } from "@/lib/api";
import { saveRepositoryState, type RepositoryState } from "@/lib/useRepo";

const CHECKS = [
  {
    icon: ShieldCheck,
    name: "Security",
    desc: "Secret patterns, injection risks, unsafe calls, pinned-CVE catalog matches — each with file and line.",
  },
  {
    icon: Cpu,
    name: "Code quality",
    desc: "Complexity outliers, dead code, duplicate blocks, and unused imports from AST inspection.",
  },
  {
    icon: GitPullRequest,
    name: "Architecture",
    desc: "Module structure from the real file tree. No invented dependency graphs.",
  },
  {
    icon: Package,
    name: "Dependencies",
    desc: "Manifests parsed, lockfiles checked, dependency surface counted.",
  },
  {
    icon: FlaskConical,
    name: "Testing",
    desc: "Test files, runner configs, and CI test steps actually observed in the repo.",
  },
  {
    icon: FileText,
    name: "Documentation",
    desc: "README presence and quality, contributing guides, license detection.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Paste a repository URL",
    desc: "Any public github.com/owner/repo. The owner and name are parsed and validated before anything runs.",
  },
  {
    n: "02",
    title: "Pipeline fetches and scans",
    desc: "Metadata, tree, and source files come from the GitHub API. Scanners run per repository revision.",
  },
  {
    n: "03",
    title: "Read the evidence",
    desc: "Every score shows its formula, every finding shows its file. Nothing is asserted without a source.",
  },
];

export default function HomePage() {
  const [url, setUrl] = useState("");
  const [inputError, setInputError] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState("");
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const router = useRouter();

  const handleAnalyze = async (e?: React.FormEvent | React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (loading) return;

    setAnalysisError(null);
    setInputError("");

    const parsed = parseRepoInput(url);
    if (!parsed) {
      setInputError(
        "Enter a valid GitHub URL (github.com/owner/repo) or owner/repo."
      );
      return;
    }

    setLoading(true);
    setCurrentStep("Connecting to analysis pipeline...");

    try {
      // Step 4: Call backend API to queue analysis
      const queueRes = await apiFetch<{
        analysis_id: string;
        status: string;
        message: string;
      }>("/api/v1/analysis", {
        method: "POST",
        body: JSON.stringify({
          repo_url: parsed.url,
          branch: "main",
        }),
      });

      const analysisId = queueRes.analysis_id;
      setCurrentStep(`Analysis queued (${parsed.owner}/${parsed.name}). Initializing...`);

      // Step 6: Poll for completion
      const startTime = Date.now();
      const pollInterval = 1000;
      let isDone = false;

      while (!isDone) {
        if (Date.now() - startTime > 120000) {
          throw new Error("Analysis timed out after 120 seconds. The repository may be too large or GitHub API is slow.");
        }

        await new Promise((resolve) => setTimeout(resolve, pollInterval));

        try {
          const statusRes = await apiFetch<{
            analysis_id: string;
            status: string;
            progress: number;
            current_step: string;
            repository: {
              owner: string;
              name: string;
              url?: string;
              default_branch?: string;
              commit_sha?: string;
            };
            error_code?: string;
            error_message?: string;
          }>(`/api/v1/analysis/${analysisId}`);

          if (statusRes.current_step) {
            setCurrentStep(statusRes.current_step);
          }

          if (statusRes.status === "COMPLETED") {
            isDone = true;
            // Step 7: Store the resulting repository/analysis state
            const r = statusRes.repository || { owner: parsed.owner, name: parsed.name };
            const repoState: RepositoryState = {
              owner: r.owner,
              repo: r.name,
              url: r.url || parsed.url,
              defaultBranch: r.default_branch || "main",
              repositoryId: `${r.owner}/${r.name}`,
              commitSha: r.commit_sha || null,
              analysisId: statusRes.analysis_id,
            };
            saveRepositoryState(repoState);

            // Step 8: Navigate to the repository-specific Dashboard
            router.push(`/dashboard${repoSearch(r.owner, r.name)}`);
            return;
          }

          if (statusRes.status === "FAILED") {
            isDone = true;
            setLoading(false);
            setAnalysisError(
              statusRes.error_message || "Analysis failed. Please verify the repository exists and is accessible."
            );
            return;
          }
        } catch (pollErr: any) {
          if (pollErr instanceof ApiError && (pollErr.status === 404 || pollErr.status === 401)) {
            throw pollErr;
          }
        }
      }
    } catch (err: any) {
      setLoading(false);
      setAnalysisError(
        err instanceof ApiError
          ? err.message
          : err?.message || "Unable to start analysis. Make sure backend is running."
      );
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-12">
      {/* Hero */}
      <section className="space-y-5">
        <div className="panel-label">DevPilot AI · GitHub repository analysis</div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
          Static analysis for any GitHub repository.
        </h1>
        <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-2xl">
          Paste a repository URL. DevPilot fetches live data from the GitHub
          API and reports on security, quality, architecture, dependencies,
          testing, and documentation — every finding backed by file evidence,
          every score backed by a published formula.
        </p>

        <div className="max-w-xl space-y-3 pt-1">
          <form
            action="#"
            onSubmit={handleAnalyze}
            className="flex items-center gap-2"
          >
            <div className="flex items-center gap-2 px-3 flex-1 rounded-lg bg-slate-950/80 border border-white/15 focus-within:border-slate-400 transition-colors">
              <Github className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <input
                type="text"
                value={url}
                disabled={loading}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (inputError) setInputError("");
                  if (analysisError) setAnalysisError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAnalyze(e);
                  }
                }}
                placeholder="github.com/owner/repo"
                aria-label="GitHub repository URL"
                aria-invalid={Boolean(inputError || analysisError)}
                spellCheck={false}
                className="flex-1 bg-transparent py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none font-mono disabled:opacity-60"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              onClick={(e) => {
                e.preventDefault();
                handleAnalyze(e);
              }}
              className="px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-white text-slate-950 text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-800" />
                  <span>Analyzing…</span>
                </>
              ) : (
                <>
                  <span>Analyze</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Live Progress UX */}
          {loading && (
            <div className="rounded-lg border border-cyan-500/30 bg-cyan-950/20 p-3.5 flex items-center gap-3 text-xs text-cyan-200 font-mono shadow-sm">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400 flex-shrink-0" />
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center justify-between text-[11px] text-cyan-400 uppercase tracking-wider font-semibold">
                  <span>Live Pipeline Step</span>
                  <span>In Progress</span>
                </div>
                <p className="text-slate-200 truncate">{currentStep || "Running analysis scanners..."}</p>
              </div>
            </div>
          )}

          {/* Analysis Error Alert */}
          {analysisError && (
            <div
              role="alert"
              className="rounded-lg border border-rose-500/30 bg-rose-950/25 p-3 flex items-start gap-2.5 text-xs text-rose-300 font-mono"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1 min-w-0">
                <p className="font-semibold text-rose-200">Analysis Error</p>
                <p className="text-rose-300/90 leading-relaxed break-words">{analysisError}</p>
              </div>
            </div>
          )}

          {/* Validation Error */}
          {inputError && !loading && (
            <p role="alert" className="text-xs text-rose-400 font-mono flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{inputError}</span>
            </p>
          )}

          {!inputError && !analysisError && !loading && (
            <p className="text-xs text-slate-600 font-mono">
              Public repositories work immediately. Private repos need a
              server-side token.
            </p>
          )}
        </div>
      </section>

      {/* What gets checked */}
      <section className="space-y-4">
        <h2 className="panel-label">What gets checked</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px rounded-lg overflow-hidden border border-white/10 bg-white/10">
          {CHECKS.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.name} className="bg-[#11141a] p-4 flex gap-3">
                <div className="w-8 h-8 rounded-md bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-slate-300" />
                </div>
                <div className="space-y-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white">{c.name}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{c.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="space-y-4">
        <h2 className="panel-label">How it works</h2>
        <ol className="rounded-lg border border-white/10 divide-y divide-white/10">
          {STEPS.map((s) => (
            <li key={s.n} className="p-4 flex gap-4">
              <span className="font-mono text-xs text-slate-500 pt-0.5">{s.n}</span>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">{s.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Honesty note + entry */}
      <section className="rounded-lg border border-white/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
          No fabricated metrics. If a check cannot run, the report says so.
          AI summaries are labeled as such and never invent findings.
        </p>
        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
        >
          <span>Open dashboard</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </section>
    </div>
  );
}
