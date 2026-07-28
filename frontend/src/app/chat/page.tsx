"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Send, Sparkles, Code2, Copy, Check, Terminal } from "lucide-react";

export default function ChatPage() {
  const [question, setQuestion] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [messages, setMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string; codeSnippet?: string; source?: string }>
  >([
    {
      role: "assistant",
      content:
        "Welcome to DevPilot AI Chat (RAG)! Ask me any technical question about repository structure, security vulnerabilities, or clean architecture abstractions.",
      source: "backend/app/main.py",
    },
  ]);

  const handleSend = (qText?: string) => {
    const query = qText || question;
    if (!query.trim()) return;

    setMessages((prev) => [...prev, { role: "user", content: query }]);
    if (!qText) setQuestion("");

    // Simulate RAG AI streaming response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "The repository implements Clean Architecture principles. Domain entities are isolated from database frameworks, while FastAPI controllers handle REST routing.",
          codeSnippet: `class AnalyzeRepositoryUseCase:\n    def __init__(self, repo: IAnalysisRepository):\n        self._repo = repo`,
          source: "backend/app/use_cases/analyze_repository.py",
        },
      ]);
    }, 600);
  };

  const copyCode = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  const suggestions = [
    "How is Clean Architecture enforced in the backend?",
    "Show me the JWT token generation utility function.",
    "Explain the security scanner rule engine logic.",
    "Where is pgvector database connection configured?",
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 max-w-5xl mx-auto py-8 px-4 sm:px-6 flex flex-col h-[calc(100vh-6rem)]"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
            <Sparkles className="w-4 h-4" />
            <span>PydanticAI RAG Q&A Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight linear-gradient-text">
            Repository Intelligence AI Chat
          </h1>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 font-sans">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-3xl max-w-2xl space-y-3 ${
              msg.role === "user"
                ? "ml-auto bg-cyan-500/20 text-cyan-100 border border-cyan-500/30"
                : "mr-auto glass-panel border border-white/10 text-slate-200"
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="font-bold uppercase tracking-wider">{msg.role === "user" ? "You" : "DevPilot RAG Agent"}</span>
              {msg.source && <span className="text-cyan-400">Source: {msg.source}</span>}
            </div>

            <p className="text-xs sm:text-sm leading-relaxed">{msg.content}</p>

            {msg.codeSnippet && (
              <div className="p-3.5 rounded-2xl bg-slate-950 font-mono text-xs text-cyan-300 border border-white/10 relative group">
                <button
                  onClick={() => copyCode(msg.codeSnippet!, idx)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                >
                  {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <pre>{msg.codeSnippet}</pre>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Suggested Prompts Pills */}
      <div className="flex flex-wrap gap-2 pt-2">
        {suggestions.map((s, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(s)}
            className="text-[11px] font-mono px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
          >
            💡 {s}
          </button>
        ))}
      </div>

      {/* Input Field Form */}
      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-3">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask any question about the codebase structure or security findings..."
          className="flex-1 px-4 py-3.5 rounded-2xl bg-slate-950/80 border border-white/15 text-white text-xs sm:text-sm font-mono focus:border-cyan-400 focus:outline-none transition-colors glass-panel"
        />
        <button
          type="submit"
          className="px-6 py-3.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2"
        >
          <span>Send</span>
          <Send className="w-4 h-4" />
        </button>
      </form>
    </motion.div>
  );
}
