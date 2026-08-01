"use client";

import React from "react";
import { motion } from "framer-motion";
import { Cpu, CheckCircle2, AlertTriangle, FileCode, Layers, Activity } from "lucide-react";

export default function CodeQualityPage() {
  const [qualityData, setQualityData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    const fetchQualityData = async () => {
      try {
        setLoading(true);
        const res = await fetch("http://localhost:8000/api/v1/analysis/latest", {
          headers: { Authorization: "Bearer mock_jwt_token_demo" },
        });
        if (res.ok) {
          const data = await res.json();
          setQualityData(data.quality);
        }
      } catch (err) {
        console.error("Error loading quality data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchQualityData();
  }, []);

  const qualityScore = qualityData?.quality_score;
  const rawMetrics = qualityData?.raw_metrics || {};
  const findings = qualityData?.findings || [];

  const metrics = [
    { label: "Code Quality Score", value: qualityScore !== null && qualityScore !== undefined ? `${qualityScore} / 100` : "Not Analyzed", status: qualityScore >= 80 ? "Optimal" : "Needs Review" },
    { label: "Scanned Files", value: `${rawMetrics.scanned_files || 0}`, status: "Tracked" },
    { label: "Total Issues", value: `${qualityData?.total_issues || findings.length}`, status: "Flagged" },
    { label: "High Complexity", value: `${rawMetrics.high_complexity_count || qualityData?.high_complexity_count || 0}`, status: "Functions" },
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
          {loading ? (
            <div className="p-8 text-center text-xs font-mono text-slate-400 glass-panel rounded-3xl">
              Loading quality scan findings...
            </div>
          ) : findings.length === 0 ? (
            <div className="p-8 text-center glass-panel rounded-3xl space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <h4 className="text-sm font-bold text-white">No Code Quality Issues Detected</h4>
              <p className="text-xs text-slate-400">Codebase meets clean complexity and maintainability standards.</p>
            </div>
          ) : (
            findings.map((item: any, idx: number) => (
              <div key={item.id || idx} className="glass-panel p-6 rounded-3xl space-y-3 border border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">{item.issue_type || item.type}</span>
                  <span className="text-xs font-mono text-slate-500">Line {item.line_number || item.line || 1}</span>
                </div>
                <h4 className="text-base font-bold text-white">{item.title}</h4>
                <div className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{item.file_path || item.file}:L{item.line_number || item.line || 1}</span>
                </div>
                <p className="text-xs text-slate-300">{item.description}</p>
                <div className="text-xs font-medium text-slate-300 bg-white/5 p-3 rounded-xl border border-white/5">
                  <strong>Refactoring Advice:</strong> {item.recommendation || item.rec}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}
