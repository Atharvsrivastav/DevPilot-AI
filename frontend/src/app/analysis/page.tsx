"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  ShieldCheck,
  Cpu,
  GitPullRequest,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Download,
  Share2,
  ExternalLink,
  Code2,
  Calculator,
  HelpCircle,
} from "lucide-react";

export default function AnalysisPage() {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    security: true,
    quality: true,
    architecture: false,
    formulaInspector: true,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 max-w-7xl mx-auto py-8 px-4 sm:px-6"
    >
      {/* Report Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
            <span>Report ID: rpt_01h92k8a12</span>
            <span>•</span>
            <span>Calculated from Measurable AST Data</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight linear-gradient-text">
            Repository Evidence & Analysis Report
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Repository: enterprise-org/DevPilot-AI (Branch: main)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="px-4 py-2 text-xs font-semibold rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all flex items-center gap-1.5">
            <Share2 className="w-3.5 h-3.5" />
            <span>Share Report</span>
          </button>
          <button className="px-4 py-2 text-xs font-semibold rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-1.5 font-bold">
            <Download className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Transparent Formula & Raw Evidence Inspector */}
      <div className="glass-panel p-6 rounded-3xl space-y-4 border border-cyan-500/30">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Calculator className="w-5 h-5 text-cyan-400" />
          Transparent Score Derivation & Evidence Audit
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/5 space-y-2">
            <div className="text-slate-400 font-bold uppercase">Security Score Formula</div>
            <div className="text-cyan-300">100 - (Critical*25 + High*15 + Medium*8 + Low*3)</div>
            <div className="text-slate-500 text-[11px]">Raw: Critical: 1 • High: 1 • Medium: 1</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/5 space-y-2">
            <div className="text-slate-400 font-bold uppercase">Quality Score Formula</div>
            <div className="text-cyan-300">100 - (HighComplexity*5 + DeadCode*4 + UnusedImports*2)</div>
            <div className="text-slate-500 text-[11px]">Raw: Complexity &gt; 10: 1 • Unused Imports: 1</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/5 space-y-2">
            <div className="text-slate-400 font-bold uppercase">Architecture Score Formula</div>
            <div className="text-cyan-300">BasePatternScore + (LayerCount*2.0) - (Coupling*0.1)</div>
            <div className="text-slate-500 text-[11px]">Pattern: Clean Architecture (Base: 95.0)</div>
          </div>
        </div>
      </div>

      {/* Collapsible Section 1: Security Audit */}
      <div className="glass-panel rounded-3xl overflow-hidden border border-white/10">
        <button
          onClick={() => toggleSection("security")}
          className="w-full p-6 flex items-center justify-between bg-white/[0.02] hover:bg-white/[0.04] transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-rose-400" />
            <div>
              <h3 className="text-base font-bold text-white">1. Security Vulnerability Scan (Gitleaks + Semgrep)</h3>
              <p className="text-xs text-slate-400">Hardcoded secrets, SQLi risks, XSS checks, & dependency CVEs</p>
            </div>
          </div>
          {openSections.security ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </button>

        {openSections.security && (
          <div className="p-6 border-t border-white/10 space-y-4">
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold uppercase text-rose-400 px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/30">
                  CRITICAL Risk (Score: 9.0)
                </span>
                <span className="font-mono text-slate-500">SEC-003 • Source: Semgrep Rule Engine</span>
              </div>
              <h4 className="text-sm font-bold text-white">Exposed JWT Signing Secret Key</h4>
              <p className="text-slate-400 font-mono">File: backend/app/core/config.py (Line 26)</p>
              <div className="p-3 rounded-xl bg-slate-900 font-mono text-slate-300">
                JWT_SECRET_KEY: str = "super_secret_jwt_key_change_in_production_123456789"
              </div>
              <div className="text-emerald-400 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                <strong>Fix Recommendation:</strong> Inject JWT secret via environment variables or secret manager.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Collapsible Section 2: Code Quality */}
      <div className="glass-panel rounded-3xl overflow-hidden border border-white/10">
        <button
          onClick={() => toggleSection("quality")}
          className="w-full p-6 flex items-center justify-between bg-white/[0.02] hover:bg-white/[0.04] transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-base font-bold text-white">2. Code Quality & AST Cyclomatic Complexity</h3>
              <p className="text-xs text-slate-400">Dead code, duplicate blocks, long functions, & naming standards</p>
            </div>
          </div>
          {openSections.quality ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </button>

        {openSections.quality && (
          <div className="p-6 border-t border-white/10 space-y-4">
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan-400 uppercase">High Complexity Warning</span>
                <span className="font-mono text-slate-500">QUAL-012 • Source: Python AST Inspector</span>
              </div>
              <h4 className="text-sm font-bold text-white">Function 'analyze_repository' exceeds branch limit</h4>
              <p className="text-slate-400 font-mono">File: backend/app/infrastructure/github/repo_analyzer.py (Complexity: 14)</p>
              <div className="text-slate-300 bg-white/5 p-3 rounded-xl">
                <strong>Recommendation:</strong> Refactor nested decision trees into separate evaluator strategy functions.
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
