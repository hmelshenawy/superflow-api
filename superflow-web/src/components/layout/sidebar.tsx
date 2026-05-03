"use client";

import { useCallback, useEffect, useState } from "react";
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
  Menu,
  Settings,
  Shield,
  Users,
  Wrench,
  BarChart3,
  Upload,
  X,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV_ITEMS: { href: string; label: string; icon: typeof LayoutGrid; adminOnly?: boolean }[] = [
  { href: "/insights", label: "Insights", icon: BarChart3 },
  { href: "/jobs", label: "Workshop Board", icon: LayoutGrid },
  { href: "/deferred", label: "Deferred Work", icon: Clock3 },
  { href: "/admin/users-roles", label: "Users & Roles", icon: Users, adminOnly: true },
  { href: "/admin/labour-rates", label: "Labour Rates", icon: Wrench, adminOnly: true },
  { href: "/admin/templates", label: "Inspection Templates", icon: ClipboardList, adminOnly: true },
  { href: "/admin/booking-import", label: "Booking Import", icon: Upload, adminOnly: true },
  { href: "/settings", label: "Settings", icon: Settings },
];

function isAdmin(user: { role?: { name?: string | null } | null; role_id?: string | null } | null): boolean {
  if (!user) return false;
  const roleName = user.role?.name?.toLowerCase();
  if (roleName === "admin" || roleName === "administrator" || roleName === "super_admin") return true;
  const roleId = user.role_id;
  if (roleId === "admin" || roleId === "super_admin") return true;
  return false;
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("sidebar-collapsed") === "true";
  });
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const admin = isAdmin(user);

  useEffect(() => { setMounted(true); }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  }, []);

  const filteredItems = NAV_ITEMS.filter((item) => !item.adminOnly || admin);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const navContent = (isCollapsed: boolean) => (
    <>
      <div className={cn("border-b border-slate-800 px-4 py-4", isCollapsed && "px-2")}>
        <div className={cn("flex items-center gap-2.5", isCollapsed && "justify-center gap-0")}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600/15 ring-1 ring-blue-500/30">
            <Wrench className="h-4.5 w-4.5 text-blue-400" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <p className="text-[11px] text-slate-500">Clarity in every step</p>
              <h2 className="text-base font-semibold tracking-tight text-white">PrioraFlow</h2>
            </div>
          )}
        </div>
      </div>

      <nav className={cn("flex-1 space-y-1 px-2 py-3", isCollapsed && "px-1.5")}>
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-2 rounded-xl py-2 text-[13px] font-medium transition",
                isCollapsed ? "justify-center px-2" : "px-2.5",
                active
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-400 hover:bg-slate-900 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className={cn("border-t border-slate-800 p-3", isCollapsed && "p-2")}>
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-[11px] font-bold text-white">
              {user?.name?.charAt(0) || "U"}
            </div>
            <button
              onClick={logout}
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              aria-label="Sign out"
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
                <Shield className="h-3 w-3" /> {admin ? "Admin" : "Internal"}
              </span>
              <button
                onClick={logout}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="h-3 w-3" /> Sign out
              </button>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={toggleCollapsed}
        className="hidden lg:flex items-center justify-center border-t border-slate-800 py-2.5 text-slate-400 transition hover:bg-slate-900 hover:text-white"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      <div className="hidden lg:flex items-center justify-center border-t border-slate-800 py-2.5">
        <ThemeToggle />
      </div>
    </>
  );

  return (
    <>
      {/* Mobile header bar */}
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background px-3 py-2 lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600/15 ring-1 ring-blue-500/30">
            <Wrench className="h-3.5 w-3.5 text-blue-400" />
          </div>
          <span className="text-sm font-semibold text-foreground">PrioraFlow</span>
        </div>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" role="presentation" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex h-full w-64 flex-col bg-slate-950 text-slate-100 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600/15 ring-1 ring-blue-500/30">
                  <Wrench className="h-4.5 w-4.5 text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-slate-500">Clarity in every step</p>
                  <h2 className="text-base font-semibold tracking-tight text-white">PrioraFlow</h2>
                </div>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 px-2 py-3">
              {filteredItems.map((item) => {
                const Icon = item.icon;
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-2.5 py-2 text-[13px] font-medium transition",
                      active
                        ? "bg-white text-slate-950 shadow-sm"
                        : "text-slate-400 hover:bg-slate-900 hover:text-white"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-slate-800 p-3">
              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{user?.name || "User"}</p>
                    <p className="truncate text-[11px] text-slate-400">{user?.email || "No email"}</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between rounded-lg bg-slate-950/80 px-2 py-1.5 text-[11px] text-slate-400">
                  <span className="inline-flex items-center gap-1.5"><Shield className="h-3 w-3" /> {admin ? "Admin" : "Internal"}</span>
                  <button
                    onClick={logout}
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
                  >
                    <LogOut className="h-3 w-3" /> Sign out
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden h-screen shrink-0 flex-col border-r border-slate-800 bg-slate-950 text-slate-100 transition-all duration-200 lg:flex",
          collapsed ? "w-16" : "w-52 xl:w-48"
        )}
      >
        {navContent(collapsed)}
      </aside>
    </>
  );
}