"use client";

import Link from "next/link";
import { useAuth } from "@/features/auth/auth-context";
import { ShieldCheck, Zap, User, LogOut } from "lucide-react";

export function Topbar() {
  const { merchant, user, isAuthenticated, logout, loginAsDemo } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/80 px-6 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold tracking-tight text-slate-900">
            {merchant?.name ?? "Apex Athletics"}
          </p>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Gateway
          </span>
        </div>

        <div className="hidden md:flex items-center gap-1.5 text-[11px] font-medium text-slate-500 bg-slate-100/70 border border-slate-200 px-2.5 py-0.5 rounded-full">
          <Zap className="h-3 w-3 text-slate-600" />
          <span>Autonomous Loop Active</span>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs">
        {isAuthenticated ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200/70 px-2.5 py-1 text-slate-700">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white font-bold text-[10px]">
                {user?.name?.[0] || "U"}
              </div>
              <span className="font-semibold text-slate-900">{user?.name || user?.email}</span>
              <span className="text-[10px] font-mono text-slate-500 bg-white border border-slate-200 px-1.5 py-0.2 rounded font-medium">
                {user?.role || "OWNER"}
              </span>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-rose-600 transition-colors p-1.5 rounded-lg hover:bg-rose-50 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={loginAsDemo}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Zap className="h-3 w-3" />
              Sign In (Demo)
            </button>
            <Link
              href="/login"
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Login
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}