"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  TrendingUp,
  ShieldCheck,
  History,
  Bot,
  Settings,
  Store,
  ChevronDown,
  Cpu,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Products", href: "/products", icon: Package },
  { name: "Orders", href: "/orders", icon: ShoppingCart },
  { name: "Revenue", href: "/revenue", icon: TrendingUp },
  { name: "Approvals", href: "/approvals", icon: ShieldCheck, badge: "Live" },
  { name: "Audit Trail", href: "/audit", icon: History },
  { name: "Buyer Simulator", href: "/buyer", icon: Bot, badge: "Sandbox" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-dvh w-64 shrink-0 flex-col justify-between border-r border-slate-200/80 bg-white font-sans text-slate-900 antialiased z-40">
      {/* Top Section: Workspace Brand & Navigation */}
      <div className="flex flex-col overflow-y-auto">
        {/* Workspace Brand Header */}
        <div className="flex h-16 items-center border-b border-slate-100 px-4">
          <Link
            href="/"
            className="flex w-full items-center justify-between rounded-lg p-1.5 transition-colors hover:bg-slate-50 group"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-white shadow-xs">
                <Store className="h-4.5 w-4.5" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold tracking-tight text-slate-950 flex items-center gap-1.5">
                  CommerceOS
                  <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    PRO
                  </span>
                </div>
                <div className="text-[11px] font-medium text-slate-500">
                  Apex Athletics
                </div>
              </div>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
          </Link>
        </div>

        {/* Navigation Section */}
        <nav className="space-y-1 p-3">
          <div className="px-3 py-2 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            Store Intelligence
          </div>
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center justify-between rounded-lg px-3 py-2.5 text-xs font-medium transition-all ${
                  isActive
                    ? "bg-slate-900 text-white font-semibold shadow-xs"
                    : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 transition-colors ${
                      isActive
                        ? "text-white"
                        : "text-slate-400 group-hover:text-slate-700"
                    }`}
                  />
                  <span>{item.name}</span>
                </div>

                {item.badge && (
                  <Badge
                    variant="outline"
                    className={`h-4.5 px-2 text-[9px] font-semibold ${
                      isActive
                        ? "bg-white/20 text-white border-transparent"
                        : item.badge === "Live"
                        ? "bg-amber-50 text-amber-800 border-amber-200"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    {item.badge}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Groq AI Monitor & Settings */}
      <div className="border-t border-slate-100 p-3 space-y-2">
        <Link
          href="/settings"
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
            pathname === "/settings"
              ? "bg-slate-900 text-white font-semibold"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <Settings className="h-4 w-4 text-slate-400" />
          <span>Policies & Guardrails</span>
        </Link>

        {/* Engine Status Card */}
        <div className="rounded-lg bg-slate-50 border border-slate-200/70 p-2.5 space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              <Cpu className="h-3.5 w-3.5 text-slate-600" />
              <span>Groq LPU Engine</span>
            </div>
            <span className="font-mono text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              138ms
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            llama-3.3-70b-versatile
          </div>
        </div>
      </div>
    </aside>
  );
}