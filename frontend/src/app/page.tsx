"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Cpu,
  GitPullRequest,
  Activity,
  Github,
  Search,
  CheckCircle2,
  Lock,
  Layers,
} from "lucide-react";

export default function HomePage() {
  const [url, setUrl] = useState("");
  const router = useRouter();

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      router.push("/dashboard");
    }
  };

  return (
    <div className="space-y-16 py-12 px-4 sm:px-8 max-w-6xl mx-auto">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center justify-center text-center space-y-8"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-semibold shadow-inner">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Next-Generation Automated Repository Intelligence</span>
        </div>

        <h1 className="text-5xl sm:text-7xl font-black tracking-tight linear-gradient-text leading-tight max-w-4xl">
          Deep Code Analysis for Modern Engineering Teams
        </h1>

        <p className="max-w-2xl text-slate-400 text-base sm:text-xl leading-relaxed font-light">
          Evaluates <span className="text-slate-200 font-semibold">Code Quality</span>, <span className="text-rose-400 font-semibold">Security</span>, <span className="text-indigo-400 font-semibold">Architecture</span>, <span className="text-amber-400 font-semibold">Performance</span>, & <span className="text-emerald-400 font-semibold">Maintainability</span> in seconds.
        </p>

        {/* Live URL Input Bar */}
        <form onSubmit={handleAnalyze} className="w-full max-w-xl flex items-center gap-2 p-1.5 rounded-2xl bg-slate-950/80 border border-white/15 shadow-2xl glass-panel">
          <div className="flex items-center gap-2 px-3 text-slate-400">
            <Github className="w-4 h-4 text-cyan-400" />
          </div>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste GitHub Repository URL... (e.g. github.com/fastapi/fastapi)"
            className="flex-1 bg-transparent text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none font-mono"
          />
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-1.5"
          >
            <span>Analyze</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>
      </motion.div>

      {/* Feature Pillar Cards */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {[
          {
            title: "Security Scanner",
            desc: "Detect hardcoded secrets, API keys, JWT risks, SQL Injection, & vulnerable dependencies.",
            icon: ShieldCheck,
            color: "text-rose-400",
            bg: "bg-rose-500/10",
            border: "border-rose-500/20",
          },
          {
            title: "Code Quality & Smells",
            desc: "Identifies cyclomatic complexity, dead code, long functions, & duplicate code patterns.",
            icon: Cpu,
            color: "text-cyan-400",
            bg: "bg-cyan-500/10",
            border: "border-cyan-500/20",
          },
          {
            title: "Architecture Visualizer",
            desc: "Detects Clean Architecture, Hexagonal, & MVC patterns with interactive Mermaid.js DAG graphs.",
            icon: GitPullRequest,
            color: "text-indigo-400",
            bg: "bg-indigo-500/10",
            border: "border-indigo-500/20",
          },
          {
            title: "Repository Health Score",
            desc: "Computes a weighted 0-100 overall health score and pillar grade across 7 parameters.",
            icon: Activity,
            color: "text-emerald-400",
            bg: "bg-emerald-500/10",
            border: "border-emerald-500/20",
          },
          {
            title: "AI Code Reviewer",
            desc: "PydanticAI agent generates senior staff code reviews, PR comments, & refactoring proposals.",
            icon: Sparkles,
            color: "text-amber-400",
            bg: "bg-amber-500/10",
            border: "border-amber-500/20",
          },
          {
            title: "Repository Chat (RAG)",
            desc: "Ask natural language questions about codebase structure with exact source file citations.",
            icon: Layers,
            color: "text-purple-400",
            bg: "bg-purple-500/10",
            border: "border-purple-500/20",
          },
        ].map((item, idx) => {
          const IconComp = item.icon;
          return (
            <motion.div
              key={item.title}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="glass-panel p-6 rounded-3xl space-y-3 relative group"
            >
              <div className={`w-10 h-10 rounded-2xl ${item.bg} border ${item.border} flex items-center justify-center`}>
                <IconComp className={`w-5 h-5 ${item.color}`} />
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">{item.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-light">{item.desc}</p>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Tech Stack Banner */}
      <div className="glass-panel p-8 rounded-3xl text-center space-y-4">
        <h4 className="text-xs font-mono uppercase tracking-widest text-slate-500">Enterprise Stack Architecture</h4>
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-300">
          <span className="px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10">Next.js 15 App Router</span>
          <span className="px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10">FastAPI</span>
          <span className="px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10">PydanticAI</span>
          <span className="px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10">PostgreSQL + pgvector</span>
          <span className="px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10">TailwindCSS</span>
        </div>
      </div>
    </div>
  );
}
