"use client";

import React from "react";
import { motion } from "framer-motion";
import { Cpu, CheckCircle2, AlertTriangle, FileCode, Layers, Activity } from "lucide-react";

export default function CodeQualityPage() {
  const metrics = [
    { label: "Code Quality Score", value: "85 / 100", status: "Good" },
    { label: "Avg Complexity", value: "4.2", status: "Optimal" },
    { label: "Duplication Rate", value: "1.8%", status: "Low" },
    { label: "Doc Coverage", value: "72.0%", status: "Moderate" },
  ];

  const findings = [
    {
      type: "High Cyclomatic Complexity",
      title: "Function 'analyze_repository' exceeds branch threshold",
      file: "backend/app/infrastructure/github/repo_analyzer.py",
      line: 18,
      metric: "Complexity: 14 (Threshold: 10)",
      rec: "Extract nested decision branches into strategy pattern functions.",
    },
    {
      type: "Unused Import",
      title: "Unused import symbol 'datetime' detected",
      file: "backend/app/domain/models/analysis.py",
      line: 3,
      metric: "Unused Symbol",
      rec: "Clean up unused import statements to reduce memory load.",
    },
    {
      type: "Large Source File",
      title: "Source file exceeds 400 lines threshold",
      file: "frontend/src/components/DashboardWidgets.tsx",
      line: 1,
      metric: "Lines: 485",
      rec: "Refactor large widget component file into modular sub-files.",
    },
  ];

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
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
            <Cpu className="w-4 h-4" />
            <span>Code Quality Engine</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight linear-gradient-text">
            Code Quality & Maintainability Analysis
          </h1>
          <p className="text-xs text-slate-400">
            Scans cyclomatic complexity, dead code, unused imports, and refactoring priority index.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((m) => (
          <div key={m.label} className="glass-panel p-5 rounded-2xl space-y-1">
            <div className="text-xs font-semibold text-slate-400 uppercase">{m.label}</div>
            <div className="text-2xl font-black text-cyan-400 font-mono">{m.value}</div>
            <div className="text-[11px] text-slate-500 font-mono">Status: {m.status}</div>
          </div>
        ))}
      </div>

      {/* Quality Findings */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white">Quality Smells & Refactoring Targets</h3>
        <div className="space-y-4">
          {findings.map((item, idx) => (
            <div key={idx} className="glass-panel p-6 rounded-3xl space-y-3 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">{item.type}</span>
                <span className="text-xs font-mono text-slate-500">{item.metric}</span>
              </div>
              <h4 className="text-base font-bold text-white">{item.title}</h4>
              <div className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                <span>{item.file}:L{item.line}</span>
              </div>
              <div className="text-xs font-medium text-slate-300 bg-white/5 p-3 rounded-xl border border-white/5">
                <strong>Refactoring Advice:</strong> {item.rec}
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
