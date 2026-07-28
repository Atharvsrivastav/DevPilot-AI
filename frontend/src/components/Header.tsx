"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cpu, LayoutDashboard, Github, Menu, X, FileText } from "lucide-react";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#030712]/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 font-black text-lg tracking-tight text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-lg p-1"
        >
          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shadow-inner">
            <Cpu className="w-4.5 h-4.5 text-cyan-400" />
          </div>
          <span>
            DevPilot <span className="text-cyan-400 font-mono">AI</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
          <Link
            href="/dashboard"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
              pathname === "/dashboard"
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                : "hover:text-cyan-400 hover:bg-white/5"
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Link>
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:text-cyan-400 hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>API Docs</span>
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:text-cyan-400 hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub</span>
          </a>
        </nav>

        {/* Mobile Menu Toggle Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
          aria-expanded={mobileMenuOpen}
          className="md:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-white/10 bg-[#030712] px-4 py-4 space-y-2">
          <Link
            href="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-2 p-2.5 rounded-xl text-sm font-semibold ${
              pathname === "/dashboard"
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                : "text-slate-300 hover:bg-white/5"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noreferrer"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 p-2.5 rounded-xl text-sm font-semibold text-slate-300 hover:bg-white/5"
          >
            <FileText className="w-4 h-4" />
            <span>API Docs</span>
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 p-2.5 rounded-xl text-sm font-semibold text-slate-300 hover:bg-white/5"
          >
            <Github className="w-4 h-4" />
            <span>GitHub Repository</span>
          </a>
        </div>
      )}
    </header>
  );
}
