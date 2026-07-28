"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  LayoutDashboard,
  ShieldCheck,
  Cpu,
  GitPullRequest,
  Sparkles,
  MessageSquare,
  History as HistoryIcon,
  Settings,
  FolderGit2,
  FileText,
  Moon,
  Sun,
  X,
  ArrowRight,
} from "lucide-react";
import { useTheme } from "./ThemeContext";

interface CommandItem {
  id: string;
  title: string;
  category: "Pages" | "Analysis Tools" | "Preferences";
  icon: any;
  action: () => void;
  shortcut?: string;
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  // Cmd+K / Ctrl+K Event Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navigate = (path: string) => {
    router.push(path);
    setIsOpen(false);
    setQuery("");
  };

  const commands: CommandItem[] = [
    { id: "p1", title: "Landing Home", category: "Pages", icon: Sparkles, action: () => navigate("/") },
    { id: "p2", title: "Dashboard Overview", category: "Pages", icon: LayoutDashboard, action: () => navigate("/dashboard") },
    { id: "p3", title: "Repository Analysis Report", category: "Pages", icon: FileText, action: () => navigate("/analysis") },
    { id: "p4", title: "Repository Inspection", category: "Pages", icon: FolderGit2, action: () => navigate("/repository") },
    { id: "t1", title: "Security Scanner", category: "Analysis Tools", icon: ShieldCheck, action: () => navigate("/security"), shortcut: "CRITICAL" },
    { id: "t2", title: "Code Quality & Smells", category: "Analysis Tools", icon: Cpu, action: () => navigate("/quality") },
    { id: "t3", title: "Architecture DAG Graph", category: "Analysis Tools", icon: GitPullRequest, action: () => navigate("/architecture") },
    { id: "t4", title: "AI Code Reviewer", category: "Analysis Tools", icon: Sparkles, action: () => navigate("/analysis") },
    { id: "t5", title: "Repository Chat (RAG)", category: "Analysis Tools", icon: MessageSquare, action: () => navigate("/chat") },
    { id: "h1", title: "Audit Log History", category: "Pages", icon: HistoryIcon, action: () => navigate("/history") },
    { id: "s1", title: "Workspace Settings", category: "Preferences", icon: Settings, action: () => navigate("/settings") },
    {
      id: "s2",
      title: `Toggle Theme (Current: ${theme})`,
      category: "Preferences",
      icon: theme === "dark" ? Sun : Moon,
      action: () => {
        toggleTheme();
        setIsOpen(false);
      },
    },
  ];

  const filteredCommands = commands.filter((cmd) =>
    cmd.title.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleArrowKeys = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === "Enter" && filteredCommands[selectedIndex]) {
      e.preventDefault();
      filteredCommands[selectedIndex].action();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-950/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="w-full max-w-xl rounded-2xl bg-[#0b0f19] border border-white/10 shadow-2xl overflow-hidden glass-panel"
          >
            {/* Search Input Bar */}
            <div className="flex items-center px-4 py-3 border-b border-white/10 gap-3">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleArrowKeys}
                placeholder="Search commands, tools, or jump to page... (Cmd+K)"
                className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none font-mono"
              />
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Results List */}
            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              {filteredCommands.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 font-mono">
                  No matching commands found for "{query}"
                </div>
              ) : (
                filteredCommands.map((cmd, idx) => {
                  const IconComp = cmd.icon;
                  const isSelected = idx === selectedIndex;
                  return (
                    <div
                      key={cmd.id}
                      onClick={cmd.action}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer text-xs font-semibold transition-all ${
                        isSelected
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                          : "text-slate-300 hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <IconComp className={`w-4 h-4 ${isSelected ? "text-cyan-400" : "text-slate-400"}`} />
                        <span>{cmd.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white/5 text-slate-500 border border-white/5">
                          {cmd.category}
                        </span>
                        {isSelected && <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-2 border-t border-white/10 bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <div className="flex gap-3">
                <span>↑↓ Navigate</span>
                <span>↵ Select</span>
                <span>ESC Dismiss</span>
              </div>
              <div>Raycast Engine</div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
