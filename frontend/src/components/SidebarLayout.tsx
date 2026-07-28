"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Cpu,
  LayoutDashboard,
  ShieldCheck,
  GitPullRequest,
  Sparkles,
  MessageSquare,
  History as HistoryIcon,
  Settings,
  FolderGit2,
  FileText,
  Search,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Plus,
  GitBranch,
} from "lucide-react";
import { useTheme } from "./ThemeContext";
import { CommandPalette } from "./CommandPalette";

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { href: "/", label: "Landing Home", icon: Sparkles },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/analysis", label: "Analysis Report", icon: FileText },
    { href: "/repository", label: "Repo Inspector", icon: FolderGit2 },
    { href: "/security", label: "Security Scanner", icon: ShieldCheck, badge: "3" },
    { href: "/quality", label: "Code Quality", icon: Cpu },
    { href: "/architecture", label: "Architecture Graph", icon: GitPullRequest },
    { href: "/chat", label: "AI Chat (RAG)", icon: MessageSquare },
    { href: "/history", label: "Audit History", icon: HistoryIcon },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col md:flex-row font-sans">
      {/* Command Palette Modal */}
      <CommandPalette />

      {/* Sidebar for Desktop */}
      <aside
        className={`hidden md:flex flex-col border-r border-white/10 bg-[#070c18]/90 backdrop-blur-xl sticky top-0 h-screen transition-all duration-300 z-40 ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-white/10">
          <Link href="/" className="flex items-center gap-2.5 font-black text-sm tracking-tight text-white">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shadow-inner flex-shrink-0">
              <Cpu className="w-4.5 h-4.5 text-cyan-400" />
            </div>
            {!collapsed && (
              <span className="linear-gradient-text text-base">
                DevPilot <span className="text-cyan-400 font-mono">AI</span>
              </span>
            )}
          </Link>

          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Toggle sidebar"
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Repository Switcher */}
        {!collapsed && (
          <div className="p-3 border-b border-white/10">
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs font-mono text-slate-300">
              <div className="flex items-center gap-2 overflow-hidden">
                <GitBranch className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                <span className="truncate font-semibold text-white">DevPilot-AI</span>
              </div>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">main</span>
            </div>
          </div>
        )}

        {/* Navigation List */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                  isActive
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-lg shadow-cyan-500/10"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-cyan-400" : "group-hover:text-slate-200"}`} />
                  {!collapsed && <span>{item.label}</span>}
                </div>
                {!collapsed && item.badge && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-3 border-t border-white/10 space-y-2">
          {/* Theme Switcher Button */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
            {!collapsed && <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Header Bar */}
      <div className="md:hidden sticky top-0 z-40 h-16 border-b border-white/10 bg-[#070c18]/90 backdrop-blur-md px-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-black text-sm text-white">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <span>DevPilot AI</span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-xl bg-white/5 text-slate-300 hover:text-white"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-b border-white/10 bg-[#070c18] px-4 py-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold ${
                  isActive
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                    : "text-slate-300 hover:bg-white/5"
                }`}
              >
                <Icon className="w-4 h-4 text-cyan-400" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Main Content Body */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-16 border-b border-white/10 px-4 sm:px-6 flex items-center justify-between bg-[#030712]/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">DevPilot</span>
            <span className="text-slate-600">/</span>
            <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              {pathname === "/" ? "Home" : pathname.replace("/", "")}
            </span>
          </div>

          {/* Quick Search & Command Palette Trigger */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const event = new KeyboardEvent("keydown", { key: "k", metaKey: true });
                window.dispatchEvent(event);
              }}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white text-xs font-mono flex items-center gap-2 transition-all"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Search commands...</span>
              <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-sans">⌘K</kbd>
            </button>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
