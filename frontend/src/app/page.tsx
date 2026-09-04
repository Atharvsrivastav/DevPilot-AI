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
} from "lucide-react";
import { parseRepoInput, repoSearch } from "@/lib/api";

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
  const router = useRouter();

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseRepoInput(url);
    if (!parsed) {
      setInputError(
        "Enter a valid GitHub URL (github.com/owner/repo) or owner/repo."
      );
      return;
    }
    setInputError("");
    router.push(`/dashboard${repoSearch(parsed.owner, parsed.name)}`);
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

        <div className="max-w-xl space-y-2 pt-1">
          <form onSubmit={handleAnalyze} className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 flex-1 rounded-lg bg-slate-950/80 border border-white/15 focus-within:border-slate-400 transition-colors">
              <Github className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="github.com/owner/repo"
                aria-label="GitHub repository URL"
                aria-invalid={Boolean(inputError)}
                spellCheck={false}
                className="flex-1 bg-transparent py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none font-mono"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-white text-slate-950 text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <span>Analyze</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
          {inputError ? (
            <p role="alert" className="text-xs text-rose-400 font-mono">
              {inputError}
            </p>
          ) : (
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
