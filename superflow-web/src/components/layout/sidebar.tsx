"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { cn } from "@/lib/utils";
import {
  BadgeCheck,
  Building2,
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
  ScrollText,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

type NavItem = { href: string; label: string; icon: typeof LayoutGrid; requirePermission?: string; platformOnly?: boolean };

const NAV_ITEMS: NavItem[] = [
  { href: "/insights", label: "Insights", icon: BarChart3, requirePermission: "insights:dashboard" },
  { href: "/jobs", label: "Workshop Board", icon: LayoutGrid },
  { href: "/deferred", label: "Deferred Work", icon: Clock3, requirePermission: "deferred:read" },
  { href: "/admin/users-roles", label: "Users & Roles", icon: Users, requirePermission: "admin:users" },
  { href: "/admin/roles", label: "Roles & Permissions", icon: Shield, requirePermission: "admin:roles" },
  { href: "/admin/labour-rates", label: "Labour Rates", icon: Wrench, requirePermission: "admin:labour-rates" },
  { href: "/admin/templates", label: "Inspection Templates", icon: ClipboardList, requirePermission: "admin:templates" },
  { href: "/admin/booking-import", label: "Booking Import", icon: Upload, requirePermission: "import:parse" },
  { href: "/admin/audit", label: "Audit Log", icon: ScrollText, requirePermission: "admin:audit", platformOnly: true },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/admin/workshops", label: "Workshops", icon: Building2, requirePermission: "workshops:read" },
];

function isPlatformAdmin(user: { role?: { name?: string | null } | null } | null): boolean {
  return user?.role?.name?.toLowerCase() === "platform_admin";
}

function isAdmin(user: { role?: { name?: string | null } | null; role_id?: string | null } | null): boolean {
  if (!user) return false;
  const roleName = user.role?.name?.toLowerCase();
  if (roleName === "admin" || roleName === "administrator" || roleName === "super_admin" || roleName === "platform_admin" || roleName === "workshop_admin") return true;
  const roleId = user.role_id;
  if (roleId === "admin" || roleId === "super_admin") return true;
  return false;
}

function getUserPermissions(user: { role?: { name?: string | null; permissions?: string[] | string | null } | null } | null): Set<string> {
  if (!user) return new Set();
  if (isAdmin(user)) return new Set(["*"]);
  const perms = user.role?.permissions;
  if (!perms) return new Set();
  if (Array.isArray(perms)) return new Set(perms);
  try { return new Set(JSON.parse(String(perms))); } catch { return new Set(); }
}

function canSeeNavItem(item: NavItem, user: { role?: { name?: string | null; permissions?: string[] | string | null } | null; role_id?: string | null } | null): boolean {
  if (item.platformOnly && !isPlatformAdmin(user)) return false;
  if (!item.requirePermission) return true;
  if (isAdmin(user)) return true;
  return getUserPermissions(user).has(item.requirePermission);
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, workshops, currentWorkshopId, selectWorkshop } = useAuthStore();
  const [collapsed, setCollapsed] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const admin = isAdmin(user);

  // Initialize from localStorage after hydration
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved !== null) {
      setCollapsed(saved === "true");
    }
    setMounted(true);
  }, []);

  // Auto-collapse when resizing below 768px (md breakpoint)
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < 768) {
        setCollapsed(true);
        localStorage.setItem("sidebar-collapsed", "true");
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  }, []);

  const filteredItems = NAV_ITEMS.filter((item) => canSeeNavItem(item, user));

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
      <div className={cn("border-b border-border px-3 py-3 dark:border-slate-800", isCollapsed && "px-2")}>
        <div className={cn("flex items-center", isCollapsed ? "justify-center" : "gap-2.5")}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-100 dark:ring-white/10">
            <Image src="/prioraflow-icon.png" alt="PrioraFlow" width={512} height={512} className="h-8 w-8 object-contain" priority />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 leading-tight">
              <h2 className="truncate text-[15px] font-bold tracking-tight text-foreground dark:text-white">PrioraFlow</h2>
              <p className="truncate text-[11px] font-medium text-muted-foreground dark:text-slate-400">Clarity in every step</p>
            </div>
          )}
        </div>
      </div>

      {/* Workshop selector - shown when user has workshops */}
      {!isCollapsed && workshops && workshops.length > 0 && (
        <div className="mx-2 mb-1">
          <select
            value={currentWorkshopId || ""}
            onChange={(e) => { selectWorkshop(e.target.value); }}
            className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            {!currentWorkshopId && <option value="" disabled>Select workshop...</option>}
            {workshops.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
      )}
      {isCollapsed && workshops && workshops.length > 0 && (
        <div className="flex justify-center py-1">
          <Building2 className="h-3.5 w-3.5 text-slate-400" />
        </div>
      )}

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
                  ? "bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className={cn("border-t border-border dark:border-slate-800 p-3", isCollapsed && "p-2")}>
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-foreground dark:bg-slate-800 dark:text-white">
              {user?.name?.charAt(0) || "U"}
            </div>
            <button
              onClick={logout}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-3 dark:border-slate-800 dark:bg-slate-900/80">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground dark:text-white">
                  {user?.name || "User"}
                </p>
                <p className="truncate text-[11px] text-muted-foreground dark:text-slate-400">{user?.email || "No email"}</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                <BadgeCheck className="h-3 w-3" />
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between rounded-lg bg-muted dark:bg-slate-950/80 px-2 py-1.5 text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <Shield className="h-3 w-3" /> {admin ? "Admin" : "Internal"}
              </span>
              <button
                onClick={logout}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 font-medium text-muted-foreground hover:bg-background hover:text-foreground dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
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
        className="hidden md:flex items-center justify-center border-t border-border py-2.5 text-muted-foreground transition hover:bg-muted hover:text-foreground dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      <div className="hidden md:flex items-center justify-center border-t border-border py-2.5 dark:border-slate-800">
        <ThemeToggle />
      </div>
    </>
  );

  return (
    <>
      {/* Mobile header bar */}
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background px-3 py-2 md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-border dark:bg-slate-100">
            <Image src="/prioraflow-icon.png" alt="PrioraFlow" width={512} height={512} className="h-6 w-6 object-contain" priority />
          </div>
          <span className="text-sm font-bold text-foreground">PrioraFlow</span>
        </div>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" role="presentation" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex h-full w-64 flex-col border-r border-border bg-background text-foreground shadow-xl dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-border px-4 py-3 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-border dark:bg-slate-100 dark:ring-white/10">
                  <Image src="/prioraflow-icon.png" alt="PrioraFlow" width={512} height={512} className="h-8 w-8 object-contain" priority />
                </div>
                <div className="leading-tight">
                  <h2 className="text-[15px] font-bold tracking-tight text-foreground dark:text-white">PrioraFlow</h2>
                  <p className="text-[11px] font-medium text-muted-foreground dark:text-slate-400">Clarity in every step</p>
                </div>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
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
                        ? "bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-border p-3 dark:border-slate-800">
              <div className="rounded-xl border border-border bg-card p-3 dark:border-slate-800 dark:bg-slate-900/80">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground dark:text-white">{user?.name || "User"}</p>
                    <p className="truncate text-[11px] text-muted-foreground dark:text-slate-400">{user?.email || "No email"}</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between rounded-lg bg-muted px-2 py-1.5 text-[11px] text-muted-foreground dark:bg-slate-950/80 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1.5"><Shield className="h-3 w-3" /> {admin ? "Admin" : "Internal"}</span>
                  <button
                    onClick={logout}
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 font-medium text-muted-foreground hover:bg-background hover:text-foreground dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                  >
                    <LogOut className="h-3 w-3" /> Sign out
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop sidebar — starts collapsed, user can toggle */}
      <aside
        className={cn(
          "hidden h-screen shrink-0 flex-col border-r border-border bg-background text-foreground transition-all duration-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 md:flex",
          collapsed ? "w-[60px]" : "w-56"
        )}
      >
        {navContent(collapsed)}
      </aside>
    </>
  );
}
