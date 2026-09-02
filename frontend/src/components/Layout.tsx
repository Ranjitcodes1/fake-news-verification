import { Link, NavLink, Outlet } from "react-router-dom";
import { ShieldCheck, User, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Background3D from "./Background3D";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/analyze", label: "Verify" },
  { to: "/dashboard", label: "Analytics" },
  { to: "/history", label: "History" },
  { to: "/about", label: "Methodology" },
];

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="relative min-h-screen bg-[#0c0e14] text-slate-100 selection:bg-emerald-600 selection:text-white flex flex-col font-sans">
      {/* 3D Background Visualization */}
      <Background3D />

      {/* Editorial Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0c0e14]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm transition group-hover:bg-emerald-500">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-white">VERITAS</span>
                <span className="rounded bg-emerald-950/80 px-2 py-0.5 font-mono text-[9px] font-bold text-emerald-400 border border-emerald-800/60">
                  AI INTELLIGENCE
                </span>
              </div>
            </Link>

            <div className="hidden sm:flex items-center text-xs text-slate-400 font-mono">
              <span>Headline & Article Text Verifier</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {user ? (
              <div className="flex items-center gap-2">
                <span className="hidden font-mono text-xs text-slate-400 sm:inline">
                  {user.email.split("@")[0]}
                </span>
                <button
                  onClick={logout}
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-slate-900/80 px-2.5 text-xs font-semibold text-slate-300 shadow-sm transition hover:bg-rose-950/40 hover:text-rose-400 hover:border-rose-900/50"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <Link
                to="/auth"
                className="flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-500"
              >
                <User className="h-3.5 w-3.5" />
                <span>Account</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-[#0c0e14]/80 py-5 text-xs text-slate-500 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">VERITAS</span>
            <span className="text-slate-600">·</span>
            <span>Probabilistic News Verification & Source Intelligence</span>
          </div>
          <div className="flex items-center gap-4 font-mono text-[11px] text-slate-500">
            <span>Calibrated Credibility Assessment</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
