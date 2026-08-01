"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { GitPullRequest, Layers, CheckCircle2, ArrowRight, Database, Server, Code2 } from "lucide-react";

export default function ArchitecturePage() {
  const [archData, setArchData] = React.useState<any>(null);

  React.useEffect(() => {
    const fetchArchData = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/v1/analysis/latest", {
          headers: { Authorization: "Bearer mock_jwt_token_demo" },
        });
        if (res.ok) {
          const data = await res.json();
          setArchData(data.architecture);
        }
      } catch (err) {
        console.error("Error loading architecture data:", err);
      }
    };
    fetchArchData();
  }, []);

  const patternName = archData?.detected_pattern || "Not Analyzed";
  const confidence = archData?.confidence_score ?? "N/A";
  const modularity = archData?.modularity_score ?? "N/A";
  const coupling = archData?.coupling_score ?? "N/A";
  const mermaidDiagram = archData?.mermaid_diagram || "graph TD\n    NoData['Run Repository Analysis to generate architecture diagram']";

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
            Pattern: {patternName} (Confidence: {confidence}%)
          </span>
        </div>
      </div>

      {/* Architecture Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="glass-panel p-5 rounded-2xl space-y-1">
          <div className="text-xs font-semibold text-slate-400 uppercase">Modularity Score</div>
          <div className="text-3xl font-black text-indigo-400 font-mono">{modularity} {modularity !== "N/A" ? "/ 100" : ""}</div>
          <div className="text-[11px] text-slate-500 font-mono">Component Isolation Rating</div>
        </div>
        <div className="glass-panel p-5 rounded-2xl space-y-1">
          <div className="text-xs font-semibold text-slate-400 uppercase">Coupling Index</div>
          <div className="text-3xl font-black text-emerald-400 font-mono">{coupling} {coupling !== "N/A" ? "/ 100" : ""}</div>
          <div className="text-[11px] text-slate-500 font-mono">Layer Interdependence Index</div>
        </div>
        <div className="glass-panel p-5 rounded-2xl space-y-1">
          <div className="text-xs font-semibold text-slate-400 uppercase">Architecture Rating</div>
          <div className="text-3xl font-black text-cyan-400 font-mono">{archData?.architecture_score ?? "N/A"} {archData?.architecture_score ? "/ 100" : ""}</div>
          <div className="text-[11px] text-slate-500 font-mono">Calculated Score</div>
        </div>
      </div>

      {/* Architecture Diagram Visualizer */}
      <div className="glass-panel p-8 rounded-3xl space-y-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-400" />
          Detected Architecture Layer Isolation Map: {patternName}
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
        <h4 className="font-bold text-white text-sm">Generated Mermaid.js Flowchart</h4>
        <div className="p-4 rounded-2xl bg-slate-950 text-slate-300 border border-white/10 overflow-x-auto leading-relaxed">
          <pre>{mermaidDiagram}</pre>
        </div>
      </div>
    </motion.div>
  );
}
