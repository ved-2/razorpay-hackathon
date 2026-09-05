"use client";

import { useAuth } from "@/features/auth/auth-context";

export function Topbar() {
  const { merchant, user, isAuthenticated, logout } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b px-6">
      <div className="flex items-center gap-3">
        <p className="text-sm font-medium text-foreground">
          {merchant?.name ?? "CommerceOS Control Center"}
        </p>
        {isAuthenticated && (
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
            Live
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 text-sm">
        {isAuthenticated ? (
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">{user?.email}</span>
            <button
              onClick={logout}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Sign out
            </button>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            {merchant?.name ?? "Demo Store"}
          </div>
        )}
      </div>
    </header>
  );
}