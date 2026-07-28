"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { GitPullRequest, Layers, CheckCircle2, ArrowRight, Database, Server, Code2 } from "lucide-react";

export default function ArchitecturePage() {
  const [selectedPattern] = useState("Clean Architecture");

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
            Detects Clean Architecture, Hexagonal (Ports & Adapters), MVC, or Microservices structural patterns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-3.5 py-1.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold">
            Pattern: {selectedPattern} (Confidence: 95%)
          </span>
        </div>
      </div>

      {/* Architecture Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="glass-panel p-5 rounded-2xl space-y-1">
          <div className="text-xs font-semibold text-slate-400 uppercase">Modularity Score</div>
          <div className="text-3xl font-black text-indigo-400 font-mono">90 / 100</div>
          <div className="text-[11px] text-slate-500 font-mono">High Component Isolation</div>
        </div>
        <div className="glass-panel p-5 rounded-2xl space-y-1">
          <div className="text-xs font-semibold text-slate-400 uppercase">Coupling Index</div>
          <div className="text-3xl font-black text-emerald-400 font-mono">20 / 100</div>
          <div className="text-[11px] text-slate-500 font-mono">Loose Coupling Enforced</div>
        </div>
        <div className="glass-panel p-5 rounded-2xl space-y-1">
          <div className="text-xs font-semibold text-slate-400 uppercase">Circular Dependencies</div>
          <div className="text-3xl font-black text-cyan-400 font-mono">0 Detected</div>
          <div className="text-[11px] text-slate-500 font-mono">Clean DAG Hierarchy</div>
        </div>
      </div>

      {/* Clean Architecture Diagram Visualizer */}
      <div className="glass-panel p-8 rounded-3xl space-y-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-400" />
          Clean Architecture Layer Isolation Map
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center font-mono">
          <div className="p-5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 space-y-2">
            <Server className="w-6 h-6 mx-auto" />
            <div className="text-xs font-bold uppercase">1. Presentation</div>
            <div className="text-[11px] text-slate-300">FastAPI Controllers & Next.js Routes</div>
          </div>
          <div className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 space-y-2">
            <GitPullRequest className="w-6 h-6 mx-auto" />
            <div className="text-xs font-bold uppercase">2. Use Cases</div>
            <div className="text-[11px] text-slate-300">Application Orchestrators</div>
          </div>
          <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 space-y-2">
            <Code2 className="w-6 h-6 mx-auto" />
            <div className="text-xs font-bold uppercase">3. Domain Models</div>
            <div className="text-[11px] text-slate-300">Pure Entities & Interfaces</div>
          </div>
          <div className="p-5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 space-y-2">
            <Database className="w-6 h-6 mx-auto" />
            <div className="text-xs font-bold uppercase">4. Infrastructure</div>
            <div className="text-[11px] text-slate-300">PostgreSQL + pgvector Engine</div>
          </div>
        </div>
      </div>

      {/* Mermaid.js Diagram Source Box */}
      <div className="glass-panel p-6 rounded-3xl space-y-3 font-mono text-xs">
        <h4 className="font-bold text-white text-sm">Mermaid.js Flowchart Representation</h4>
        <div className="p-4 rounded-2xl bg-slate-950 text-slate-300 border border-white/10 overflow-x-auto leading-relaxed">
          <pre>{`graph TD
    subgraph External ["External / Presentation"]
        API["FastAPI / Next.js Controllers"]
    end

    subgraph Infra ["Infrastructure Layer"]
        DB["PostgreSQL / pgvector DB"]
        GitHub["GitHub API Client"]
    end

    subgraph UseCases ["Application Use Cases"]
        UC["AnalyzeRepository UseCase"]
    end

    subgraph Domain ["Core Domain Layer"]
        Model["Domain Entities"]
        Interface["Repository Interfaces"]
    end

    API --> UC
    UC --> Model
    UC --> Interface
    DB -.-> Interface
    GitHub -.-> Interface`}</pre>
        </div>
      </div>
    </motion.div>
  );
}
