"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { cn } from "@/lib/utils";
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  LayoutGrid,
  LogOut,
  Settings,
  Shield,
  Users,
  Wrench,
  BarChart3,
  Upload,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/insights", label: "Insights", icon: BarChart3 },
  { href: "/jobs", label: "Workshop Board", icon: LayoutGrid },
  { href: "/deferred", label: "Deferred Work", icon: Clock3 },
  { href: "/admin/users-roles", label: "Users & Roles", icon: Users },
  { href: "/admin/labour-rates", label: "Labour Rates", icon: Wrench },
  { href: "/admin/templates", label: "Inspection Templates", icon: ClipboardList },
  { href: "/admin/booking-import", label: "Booking Import", icon: Upload },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "hidden h-screen shrink-0 flex-col border-r border-slate-800 bg-slate-950 text-slate-100 transition-all duration-200 lg:flex",
        collapsed ? "w-16" : "w-52 xl:w-48"
      )}
    >
      <div className={cn("border-b border-slate-800 px-4 py-4", collapsed && "px-2")}>
        <div className={cn("flex items-center gap-2.5", collapsed && "justify-center gap-0")}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600/15 ring-1 ring-blue-500/30">
            <Wrench className="h-4.5 w-4.5 text-blue-400" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-[11px] text-slate-500">Clarity in every step</p>
              <h2 className="text-base font-semibold tracking-tight text-white">PrioraFlow</h2>
            </div>
          )}
        </div>
      </div>

      <nav className={cn("flex-1 space-y-1 px-2 py-3", collapsed && "px-1.5")}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-2 rounded-xl py-2 text-[13px] font-medium transition",
                collapsed ? "justify-center px-2" : "px-2.5",
                active
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-400 hover:bg-slate-900 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className={cn("border-t border-slate-800 p-3", collapsed && "p-2")}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-[11px] font-bold text-white">
              {user?.name?.charAt(0) || "U"}
            </div>
            <button
              onClick={logout}
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {user?.name || "User"}
                </p>
                <p className="truncate text-[11px] text-slate-400">{user?.email || "No email"}</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                <BadgeCheck className="h-3 w-3" />
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between rounded-lg bg-slate-950/80 px-2 py-1.5 text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <Shield className="h-3 w-3" /> Internal
              </span>
              <button
                onClick={logout}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
                title="Sign out"
              >
                <LogOut className="h-3 w-3" /> Sign out
              </button>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className={cn(
          "flex items-center justify-center border-t border-slate-800 py-2.5 text-slate-400 transition hover:bg-slate-900 hover:text-white",
        )}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </aside>
  );
}