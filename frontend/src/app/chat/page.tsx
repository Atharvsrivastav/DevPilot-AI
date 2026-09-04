"use client";

import React, { Suspense, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Send, Sparkles, Copy, Check } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { useRepo, repoKey } from "@/lib/useRepo";
import {
  LoadingSkeleton,
  ErrorBlock,
  EmptyBlock,
} from "@/components/StateBlocks";

interface ChatSource {
  file_path: string;
  content: string;
  relevance_score?: number;
}

interface ChatResponse {
  question: string;
  answer: string;
  ai_generated: boolean;
  sources: ChatSource[];
}

interface Msg {
  role: "user" | "assistant";
  content: string;
  aiGenerated?: boolean;
  sources?: ChatSource[];
}

const SUGGESTIONS = [
  "What are the top security risks in this repository?",
  "How is the codebase structured?",
  "Where should I focus refactoring effort?",
  "Summarize the documentation gaps.",
];

function ChatInner() {
  const repo = useRepo();
  const [question, setQuestion] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [sending, setSending] = useState(false);
  const [needsAnalysis, setNeedsAnalysis] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const key = repo ? repoKey(repo) : "";

  useEffect(() => {
    setMessages([]); // clear previous repo's conversation immediately
    setNeedsAnalysis(false);
    setError(null);
    setQuestion("");
    setSending(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const handleSend = async (qText?: string) => {
    const queryText = (qText || question).trim();
    if (!queryText || sending || !repo) return;

    setMessages((prev) => [...prev, { role: "user", content: queryText }]);
    if (!qText) setQuestion("");
    setSending(true);
    setError(null);

    try {
      const data = await apiFetch<ChatResponse>(`/api/v1/chat/query`, {
        method: "POST",
        body: JSON.stringify({
          repository_id: `${repo.owner}/${repo.repo}`,
          question: queryText,
        }),
      });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer,
          aiGenerated: data.ai_generated,
          sources: data.sources || [],
        },
      ]);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setNeedsAnalysis(true); // repo never analyzed — empty state, no canned answer
      } else {
        setError(e instanceof ApiError ? e.message : "Failed to send message.");
      }
    } finally {
      setSending(false);
    }
  };

  const copyCode = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

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
          {repo && (
            <p className="text-xs font-mono text-slate-400">
              {repo.owner}/{repo.repo}
            </p>
          )}
        </div>
      </div>

      {!repo ? (
        <EmptyBlock
          title="No repository selected"
          hint="Pick a repository from the dashboard (owner/repo in the URL) to start asking questions about its analysis."
        />
      ) : (
        <>
          {needsAnalysis && (
            <EmptyBlock
              title={`'${repo.owner}/${repo.repo}' hasn't been analyzed yet`}
              hint="Analyze this repository first — chat answers are grounded in a completed analysis."
            />
          )}
          {error && <ErrorBlock message={error} />}

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 font-sans">
            {messages.length === 0 && !needsAnalysis ? (
              <div className="p-8 text-center glass-panel rounded-lg space-y-2">
                <p className="text-sm font-bold text-white">
                  Ask about {repo.owner}/{repo.repo}
                </p>
                <p className="text-xs text-slate-400">
                  Answers are grounded in this repository&apos;s stored
                  analysis, with sources cited below each answer.
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg max-w-2xl space-y-3 ${
                    msg.role === "user"
                      ? "ml-auto bg-cyan-500/20 text-cyan-100 border border-cyan-500/30"
                      : "mr-auto glass-panel border border-white/10 text-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 gap-2 flex-wrap">
                    <span className="font-bold uppercase tracking-wider">
                      {msg.role === "user" ? "You" : "DevPilot RAG Agent"}
                    </span>
                    {msg.role === "assistant" &&
                      typeof msg.aiGenerated === "boolean" && (
                        <span
                          className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${
                            msg.aiGenerated
                              ? "bg-amber-500/10 text-amber-300 border-amber-500/25"
                              : "bg-slate-500/10 text-slate-300 border-slate-500/25"
                          }`}
                        >
                          {msg.aiGenerated
                            ? "AI-generated"
                            : "Deterministic summary"}
                        </span>
                      )}
                  </div>

                  <p className="text-xs sm:text-sm leading-relaxed">
                    {msg.content}
                  </p>

                  {msg.sources && msg.sources.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
                        Sources cited ({msg.sources.length})
                      </div>
                      {msg.sources.map((s, sIdx) => (
                        <div
                          key={sIdx}
                          className="p-3.5 rounded-md bg-slate-950 font-mono text-xs text-cyan-300 border border-white/10 relative group space-y-1.5"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              copyCode(s.content, idx * 100 + sIdx)
                            }
                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                          >
                            {copiedIndex === idx * 100 + sIdx ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <div className="text-[11px] text-slate-400 pr-8">
                            {s.file_path}
                          </div>
                          <pre className="whitespace-pre-wrap text-[11px] pr-8">
                            {s.content}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
            {sending && (
              <div className="mr-auto max-w-2xl">
                <LoadingSkeleton lines={2} label="Waiting for answer" />
              </div>
            )}
          </div>

          {/* Suggested Prompts Pills */}
          <div className="flex flex-wrap gap-2 pt-2">
            {SUGGESTIONS.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(s)}
                disabled={sending}
                className="text-[11px] font-mono px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors disabled:opacity-50"
              >
                💡 {s}
              </button>
            ))}
          </div>

          {/* Input Field Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-3"
          >
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask any question about the codebase structure or security findings..."
              className="flex-1 px-4 py-3.5 rounded-md bg-slate-950/80 border border-white/15 text-white text-xs sm:text-sm font-mono focus:border-cyan-400 focus:outline-none transition-colors glass-panel"
            />
            <button
              type="submit"
              disabled={sending || !question.trim()}
              className="px-6 py-3.5 rounded-md bg-slate-100 hover:bg-white text-slate-950 font-semibold text-xs transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <span>{sending ? "Sending..." : "Send"}</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
        </>
      )}
    </motion.div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<LoadingSkeleton lines={3} label="Loading chat" />}>
      <ChatInner />
    </Suspense>
  );
}
