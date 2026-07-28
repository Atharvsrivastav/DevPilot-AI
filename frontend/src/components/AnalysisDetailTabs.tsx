"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  Cpu,
  GitPullRequest,
  Sparkles,
  MessageSquare,
  AlertTriangle,
  FileCode,
  Send,
  CheckCircle2,
  Code2,
} from "lucide-react";

export function AnalysisDetailTabs() {
  const [activeTab, setActiveTab] = useState<"security" | "quality" | "architecture" | "reviewer" | "chat">("security");
  const [chatQuestion, setChatQuestion] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; content: string; source?: string }>>([
    {
      role: "assistant",
      content: "Hello! I am your DevPilot RAG Assistant. Ask me anything about the DevPilot-AI codebase structure, architecture, or security findings.",
      source: "backend/app/main.py",
    },
  ]);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuestion.trim()) return;

    const userQ = chatQuestion;
    setChatMessages((prev) => [...prev, { role: "user", content: userQ }]);
    setChatQuestion("");

    // Simulate RAG response
    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Regarding your question "${userQ}": The codebase uses Clean Architecture isolating domain entities in app/domain/models, FastAPI endpoints in app/api/routes, and PostgreSQL pgvector sessions in app/infrastructure/database.`,
          source: "backend/app/infrastructure/database/session.py",
        },
      ]);
    }, 600);
  };

  const tabs = [
    { id: "security", label: "Security Vulnerabilities", icon: ShieldAlert, count: "3" },
    { id: "quality", label: "Code Quality & Smells", icon: Cpu, count: "5" },
    { id: "architecture", label: "Architecture Graph", icon: GitPullRequest, count: null },
    { id: "reviewer", label: "AI Code Reviewer", icon: Sparkles, count: null },
    { id: "chat", label: "Repository Q&A Chat (RAG)", icon: MessageSquare, count: null },
  ];

  return (
    <div className="glass-panel p-6 rounded-3xl space-y-6">
      {/* Tab Controls */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-4">
        {tabs.map((t) => {
          const IconComp = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                isActive
                  ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20"
                  : "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5"
              }`}
            >
              <IconComp className="w-3.5 h-3.5" />
              <span>{t.label}</span>
              {t.count && (
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${isActive ? 'bg-slate-950 text-white' : 'bg-white/10 text-slate-300'}`}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Security Vulnerabilities */}
      {activeTab === "security" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              Detected Security Vulnerabilities & Exposed Secrets
            </h4>
            <span className="text-xs text-rose-400 font-mono font-semibold">1 Critical • 1 High • 1 Medium</span>
          </div>

          <div className="space-y-3">
            {[
              {
                id: "SEC-001",
                severity: "CRITICAL",
                title: "Exposed JWT Signing Secret",
                file: "backend/app/core/config.py",
                line: 26,
                desc: "Default plaintext secret key embedded in configuration.",
                rec: "Migrate JWT secrets to environment variables (.env) or Azure Key Vault.",
              },
              {
                id: "SEC-004",
                severity: "HIGH",
                title: "SQL Injection Risk in Legacy Endpoint",
                file: "backend/app/infrastructure/database/legacy_query.py",
                line: 42,
                desc: "Raw string concatenation detected inside raw SQL string execute execution.",
                rec: "Use SQLAlchemy parameterized bind variables or asyncpg parameter placeholders ($1).",
              },
              {
                id: "SEC-007",
                severity: "MEDIUM",
                title: "Potential Cross-Site Scripting (XSS)",
                file: "frontend/src/components/UnsafeRender.tsx",
                line: 18,
                desc: "Direct innerHTML assignment without DOMPurify sanitization.",
                rec: "Sanitize user inputs using DOMPurify before dangerouslySetInnerHTML injection.",
              },
            ].map((issue) => (
              <div key={issue.id} className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                        issue.severity === "CRITICAL"
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {issue.severity}
                    </span>
                    <span className="text-sm font-bold text-white">{issue.title}</span>
                  </div>
                  <span className="text-xs font-mono text-slate-500">{issue.id}</span>
                </div>
                <div className="text-xs font-mono text-cyan-400 flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-slate-400" />
                  <span>{issue.file}:L{issue.line}</span>
                </div>
                <p className="text-xs text-slate-400">{issue.desc}</p>
                <div className="text-xs font-medium text-emerald-400 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                  <strong>Remediation:</strong> {issue.rec}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Code Quality */}
      {activeTab === "quality" && (
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            Code Quality, Cyclomatic Complexity, & Smell Report
          </h4>

          <div className="space-y-3">
            {[
              {
                type: "High Cyclomatic Complexity",
                title: "Function 'analyze_repository' exceed decision branch threshold",
                file: "backend/app/infrastructure/github/repo_analyzer.py",
                metric: "Complexity: 14 (Threshold: 10)",
                rec: "Extract nested decision branches into strategy pattern functions.",
              },
              {
                type: "Unused Import",
                title: "Unused import symbol 'datetime' detected",
                file: "backend/app/domain/models/analysis.py",
                metric: "Line 2",
                rec: "Clean up unused import statements to reduce memory load.",
              },
              {
                type: "Large File Warning",
                title: "Source file exceeds 400 lines threshold",
                file: "frontend/src/components/DashboardWidgets.tsx",
                metric: "Lines: 485",
                rec: "Refactor large widget component file into modular sub-files.",
              },
            ].map((item, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">{item.type}</span>
                  <span className="text-xs font-mono text-slate-400">{item.metric}</span>
                </div>
                <div className="text-sm font-bold text-white">{item.title}</div>
                <div className="text-xs font-mono text-slate-400">{item.file}</div>
                <p className="text-xs text-slate-300 bg-white/5 p-2.5 rounded-xl border border-white/5">
                  <strong>Suggestion:</strong> {item.rec}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Architecture Graph */}
      {activeTab === "architecture" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <GitPullRequest className="w-4 h-4 text-indigo-400" />
              Detected Architecture: Clean Architecture (Confidence: 95%)
            </h4>
            <span className="text-xs font-mono text-emerald-400">Modularity: 90/100</span>
          </div>

          {/* Architecture DAG Visualizer */}
          <div className="p-6 rounded-2xl bg-slate-950 border border-white/10 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
              <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 space-y-1">
                <div className="text-xs font-bold uppercase">Presentation</div>
                <div className="text-xs text-slate-300 font-mono">FastAPI Controllers</div>
              </div>
              <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 space-y-1">
                <div className="text-xs font-bold uppercase">Use Cases</div>
                <div className="text-xs text-slate-300 font-mono">Application Logic</div>
              </div>
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 space-y-1">
                <div className="text-xs font-bold uppercase">Domain Entities</div>
                <div className="text-xs text-slate-300 font-mono">Core Models & Interfaces</div>
              </div>
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 space-y-1">
                <div className="text-xs font-bold uppercase">Infrastructure</div>
                <div className="text-xs text-slate-300 font-mono">PostgreSQL + pgvector</div>
              </div>
            </div>

            <div className="text-xs text-slate-400 bg-white/5 p-4 rounded-xl space-y-1 font-mono">
              <div>✔ Dependency Rule Enforced: Outer layers depend on inner abstractions.</div>
              <div>✔ Domain Entities have ZERO external framework dependencies.</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: AI Code Reviewer */}
      {activeTab === "reviewer" && (
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Senior Staff AI Code Review Report
          </h4>

          <div className="p-5 rounded-2xl bg-slate-950/60 border border-white/5 space-y-4 text-xs">
            <div className="space-y-1">
              <h5 className="font-bold text-cyan-400 uppercase text-[11px]">1. Repository Summary</h5>
              <p className="text-slate-300 leading-relaxed">
                DevPilot AI is structured as an enterprise repository intelligence platform. It features a Next.js 15 App Router frontend paired with a FastAPI + PydanticAI backend and PostgreSQL pgvector database.
              </p>
            </div>

            <div className="space-y-1">
              <h5 className="font-bold text-amber-400 uppercase text-[11px]">2. PR Review Comments</h5>
              <ul className="list-disc list-inside text-slate-300 space-y-1">
                <li>Ensure all database session handlers utilize async context managers.</li>
                <li>Add strict Pydantic validation on incoming webhook URLs.</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h5 className="font-bold text-emerald-400 uppercase text-[11px]">3. Concrete Refactoring Proposal</h5>
              <div className="p-3.5 rounded-xl bg-slate-900 border border-white/10 font-mono space-y-1">
                <div className="text-slate-400"># Refactor target: backend/app/core/config.py</div>
                <div className="text-cyan-300">- SECRET_KEY: str = "default_secret_key"</div>
                <div className="text-emerald-400">+ SECRET_KEY: SecretStr = Field(..., min_length=32)</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Repository Chat (RAG) */}
      {activeTab === "chat" && (
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            Ask Repository Questions (Retrieval-Augmented Generation)
          </h4>

          {/* Chat Messages Log */}
          <div className="h-64 overflow-y-auto p-4 rounded-2xl bg-slate-950/80 border border-white/10 space-y-3">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-2xl max-w-xl text-xs space-y-1 ${
                  msg.role === "user"
                    ? "ml-auto bg-cyan-500/20 text-cyan-200 border border-cyan-500/30"
                    : "mr-auto bg-white/5 text-slate-200 border border-white/10"
                }`}
              >
                <div className="font-semibold text-[10px] uppercase text-slate-400">
                  {msg.role === "user" ? "You" : "DevPilot RAG AI"}
                </div>
                <p className="leading-relaxed">{msg.content}</p>
                {msg.source && (
                  <div className="text-[10px] font-mono text-cyan-400 pt-1 flex items-center gap-1">
                    <Code2 className="w-3 h-3 text-slate-400" />
                    <span>Source: {msg.source}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Chat Input Form */}
          <form onSubmit={handleSendChat} className="flex gap-2">
            <input
              type="text"
              value={chatQuestion}
              onChange={(e) => setChatQuestion(e.target.value)}
              placeholder="e.g. How are database sessions managed in Clean Architecture?"
              className="flex-1 px-4 py-3 rounded-xl bg-slate-950/80 border border-white/10 text-white text-xs font-mono focus:border-cyan-400 focus:outline-none transition-colors"
            />
            <button
              type="submit"
              className="px-5 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-1.5"
            >
              <span>Ask</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
