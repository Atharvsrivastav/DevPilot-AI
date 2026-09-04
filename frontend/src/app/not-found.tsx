import Link from "next/link";
import { Sparkles, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-6 px-4">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md bg-white/5 text-slate-300 border border-white/10 font-mono">
        <Sparkles className="w-3.5 h-3.5" />
        <span>404 - Page Not Found</span>
      </div>
      <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight">
        Lost in Code Base?
      </h1>
      <p className="text-slate-400 text-sm max-w-md">
        The requested page or analysis route could not be found. Return to the main dashboard to continue analysis.
      </p>
      <Link
        href="/dashboard"
        className="px-5 py-2.5 rounded-md bg-slate-100 hover:bg-white text-slate-950 text-xs font-semibold transition-colors inline-flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Dashboard</span>
      </Link>
    </div>
  );
}
