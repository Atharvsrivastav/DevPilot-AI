"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  GitBranch,
} from "lucide-react";
import { useTheme } from "./ThemeContext";
import { CommandPalette, OPEN_PALETTE_EVENT } from "./CommandPalette";
import { useRepo, withRepo } from "@/lib/useRepo";

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const repo = useRepo();

  const navItems = [
    { href: "/", label: "Home", icon: Sparkles },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/analysis", label: "Report", icon: FileText },
    { href: "/repository", label: "Repository", icon: FolderGit2 },
    { href: "/security", label: "Security", icon: ShieldCheck },
    { href: "/quality", label: "Quality", icon: Cpu },
    { href: "/architecture", label: "Architecture", icon: GitPullRequest },
    { href: "/chat", label: "Chat", icon: MessageSquare },
    { href: "/history", label: "History", icon: HistoryIcon },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const openPalette = () => {
    window.dispatchEvent(new CustomEvent(OPEN_PALETTE_EVENT));
  };

  const pageLabel =
    pathname === "/" ? "Home" : pathname.split("/").filter(Boolean).join(" / ");

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans">
      <CommandPalette />

      {/* Sidebar — desktop */}
      <aside
        aria-label="Primary navigation"
        className={`hidden md:flex flex-col border-r border-white/10 bg-[#0d1015] sticky top-0 h-screen transition-all duration-200 z-40 ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        <div className="h-14 px-3 flex items-center justify-between border-b border-white/10">
          <Link href="/" className="flex items-center gap-2 rounded-md min-w-0">
            <div className="w-7 h-7 rounded-md bg-white/10 flex items-center justify-center flex-shrink-0">
              <Cpu className="w-4 h-4 text-slate-200" />
            </div>
            {!collapsed && (
              <span className="text-sm font-semibold text-white truncate">
                DevPilot
              </span>
            )}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            className="p-1.5 rounded-md hover:bg-white/10 text-slate-500 hover:text-white transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {!collapsed && (
          <div className="px-3 py-2.5 border-b border-white/10">
            <div className="px-2.5 py-2 rounded-md bg-white/[0.03] border border-white/5 flex items-center gap-2 text-xs font-mono text-slate-400 min-w-0">
              <GitBranch className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
              <span className="truncate">
                {repo ? `${repo.owner}/${repo.repo}` : "No repository selected"}
              </span>
            </div>
          </div>
        )}

        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={withRepo(item.href, repo)}
                aria-current={isActive ? "page" : undefined}
                title={collapsed ? item.label : undefined}
                className={`flex items-center px-2.5 py-2 rounded-md text-[13px] transition-colors group ${
                  isActive
                    ? "bg-white/10 text-white font-medium"
                    : "text-slate-400 hover:text-slate-100 hover:bg-white/5"
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0 text-slate-500 group-hover:text-slate-300" />
                {!collapsed && <span className="ml-2.5">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-2 border-t border-white/10">
          <button
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={collapsed ? "Toggle theme" : undefined}
            className="w-full flex items-center px-2.5 py-2 rounded-md text-[13px] text-slate-400 hover:text-slate-100 hover:bg-white/5 transition-colors"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-slate-500" />
            ) : (
              <Moon className="w-4 h-4 text-slate-500" />
            )}
            {!collapsed && (
              <span className="ml-2.5">{theme === "dark" ? "Light" : "Dark"}</span>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile bar */}
      <div className="md:hidden sticky top-0 z-40 h-14 border-b border-white/10 bg-[#0d1015] px-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 rounded-md">
          <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center">
            <Cpu className="w-3.5 h-3.5 text-slate-200" />
          </div>
          <span className="font-semibold text-sm text-white">DevPilot</span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          className="p-2 rounded-md hover:bg-white/10 text-slate-300"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="relative bg-[#0d1015] border-b border-white/10 px-3 py-2 space-y-0.5 max-h-[calc(100vh-3.5rem)] overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={withRepo(item.href, repo)}
                  onClick={() => setMobileOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] ${
                    isActive
                      ? "bg-white/10 text-white font-medium"
                      : "text-slate-400 hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-4 h-4 text-slate-500" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-white/10 px-4 sm:px-6 flex items-center justify-between bg-[#0a0c10]/90 backdrop-blur sticky top-0 z-30">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 min-w-0 text-xs font-mono">
            <span className="text-slate-500 uppercase tracking-wider hidden sm:inline">
              DevPilot
            </span>
            <span className="text-slate-700 hidden sm:inline" aria-hidden="true">/</span>
            <span className="text-slate-200 truncate capitalize">{pageLabel}</span>
            {repo && (
              <>
                <span className="text-slate-700" aria-hidden="true">/</span>
                <span className="text-slate-400 truncate">
                  {repo.owner}/{repo.repo}
                </span>
              </>
            )}
          </nav>
          <button
            onClick={openPalette}
            aria-label="Open command palette (Control K)"
            className="px-2.5 py-1.5 rounded-md hover:bg-white/10 border border-white/10 text-slate-500 hover:text-slate-200 text-xs font-mono flex items-center gap-2 transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Search...</span>
            <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-400">
              ⌘K
            </kbd>
          </button>
        </header>

        <main id="main-content" className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
