"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useAuthStore } from "@/stores/auth";
import { cn } from "@/lib/utils";
import { hasAnyPermission, isPlatformAdmin } from "@/lib/permissions";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Lock,
  Menu,
  Settings,
  Moon,
  Sun,
  X,
  ScrollText,
  BarChart3,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { usePlanStore, NAV_FEATURE_MAP } from "@/hooks/use-plan-features";
import { PRODUCT_NAV, PRODUCT_LABELS, getEnabledModules, getWorkshopProductMode, hasProductModule, type NavItem } from "@/lib/product-modes";
import type { ProductMode } from "@/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SHARED_ADMIN_NAV: NavItem[] = [
  { href: "/admin/workshops", label: "Locations", icon: Building2, requirePermission: "workshops:read" },
  { href: "/admin/usage", label: "Usage", icon: BarChart3, requirePermission: "admin:billing", platformOnly: true },
  { href: "/admin/audit", label: "Audit Log", icon: ScrollText, requirePermission: "admin:audit", platformOnly: true },
];

function canSeeNavItem(item: NavItem, user: { role?: { name?: string | null; permissions?: string[] | string | null } | null; role_id?: string | null } | null): boolean {
  if (item.platformOnly && !isPlatformAdmin(user)) return false;
  if (!item.requirePermission) return true;
  return hasAnyPermission(user, [item.requirePermission]);
}

type SectionDef = {
  label?: string;
  type?: "primary";
  hrefs: string[];
};

const NAV_SECTIONS: Record<ProductMode, SectionDef[]> = {
  WORKSHOP: [
    { type: "primary", hrefs: ["/dashboard", "/jobs"] },
    { label: "Operations", hrefs: ["/appointments", "/technicians", "/parts"] },
    { label: "Customers", hrefs: ["/crm", "/invoices"] },
    { label: "Insights", hrefs: ["/insights"] },
    { label: "Administration", hrefs: ["/admin/workshops", "/admin/usage", "/admin/audit", "/settings"] },
  ],
  CONNECT: [
    { type: "primary", hrefs: ["/dashboard", "/jobs"] },
    { label: "Operations", hrefs: ["/blockers"] },
    { label: "Insights", hrefs: ["/insights"] },
    { label: "Administration", hrefs: ["/admin/booking-import", "/admin/workshops", "/admin/usage", "/admin/audit", "/settings"] },
  ],
};

function buildSections(items: NavItem[], mode: ProductMode) {
  const sections = NAV_SECTIONS[mode];
  return sections
    .map((section) => {
      const sectionItems = section.hrefs
        .map((href) => items.find((item) => item.href === href))
        .filter(Boolean) as NavItem[];
      return { ...section, items: sectionItems };
    })
    .filter((section) => section.items.length > 0);
}

function ThemeMenuItem() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  const isDark = theme === "dark";
  return (
    <DropdownMenuItem onClick={() => setTheme(isDark ? "light" : "dark")}>
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span>{isDark ? "Light mode" : "Dark mode"}</span>
    </DropdownMenuItem>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, workshops, currentWorkshopId, selectWorkshop } = useAuthStore();
  const { fetchSubscription, hasFeature } = usePlanStore();
  const [collapsed, setCollapsed] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentWorkshop = workshops.find((item) => item.id === currentWorkshopId) ?? (workshops.length === 1 ? workshops[0] : null);
  const productMode = getWorkshopProductMode(currentWorkshop);
  const productLabel = PRODUCT_LABELS[productMode];

  // Initialize from localStorage after hydration
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved !== null) {
      setCollapsed(saved === "true");
    }
    setMounted(true);
  }, []);

  // Fetch subscription on mount for feature gating
  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

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

  const filteredItems = [...PRODUCT_NAV[productMode], ...SHARED_ADMIN_NAV].filter((item) => {
    const roleName = user?.role?.name || "";
    if (item.roles && !item.roles.includes(roleName)) return false;
    return canSeeNavItem(item, user) && hasProductModule(currentWorkshop, item.module);
  });

  const navSections = buildSections(filteredItems, productMode);

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

  const renderNavItem = (item: NavItem, isCollapsed: boolean, isPrimary: boolean = false) => {
    const Icon = item.icon;
    const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
    const featureKey = NAV_FEATURE_MAP[item.href];
    const locked = (featureKey ? !hasFeature(featureKey) : false) || !hasProductModule(currentWorkshop, item.module);
    return (
      <Link
        key={`${item.href}--${item.label}`}
        href={item.href}
        title={isCollapsed ? (locked ? `${item.label} (Locked)` : item.label) : undefined}
        className={cn(
          "flex items-center gap-2 rounded-xl text-sm font-medium transition",
          isCollapsed ? "justify-center px-2 py-2.5" : "px-2.5",
          isPrimary ? "py-3" : "py-2.5",
          locked
            ? "text-muted-foreground/50 hover:bg-muted/50 dark:text-slate-600"
            : active
              ? "bg-cyan-50 text-cyan-700 border-l-2 border-cyan-600 dark:bg-cyan-950/30 dark:text-cyan-400"
              : "text-muted-foreground hover:bg-slate-100 hover:text-foreground dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {!isCollapsed && <span>{item.label}</span>}
        {locked && <Lock className="h-3 w-3 shrink-0 ml-auto text-muted-foreground/50" />}
      </Link>
    );
  };

  const renderNavSections = (isCollapsed: boolean) => (
    <>
      {navSections.map((section, sectionIdx) => {
        const isPrimary = section.type === "primary";
        return (
          <div
            key={section.label || `primary-${sectionIdx}`}
            className={cn(
              "space-y-1",
              !isPrimary && "mt-6"
            )}
          >
            {section.label && !isCollapsed && (
              <div className="px-2.5 pb-2 pt-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
                  {section.label}
                </span>
              </div>
            )}
            {section.items.map((item) => renderNavItem(item, isCollapsed, isPrimary))}
            {isPrimary && (
              <div className="mx-2 my-4 h-px bg-border dark:bg-slate-800" />
            )}
          </div>
        );
      })}
    </>
  );

  const renderUserDropdown = (isCollapsed: boolean) => (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm font-medium text-foreground transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
          isCollapsed && "justify-center px-1 py-2"
        )}
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-foreground dark:bg-slate-800 dark:text-white">
          {user?.name?.charAt(0) || "U"}
        </div>
        {!isCollapsed && (
          <span className="truncate">{user?.name || "User"}</span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-0.5">
              <span className="text-sm font-medium">{user?.name || "User"}</span>
              <span className="text-xs text-muted-foreground">{user?.email || "No email"}</span>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <ThemeMenuItem />
          <Link href="/settings" className="outline-none">
            <DropdownMenuItem>
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
          </Link>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={logout} variant="destructive">
            <LogOut className="h-4 w-4" />
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const navContent = (isCollapsed: boolean) => (
    <>
      {/* Header with collapse button */}
      <div className={cn("border-b border-border px-3 py-3 dark:border-slate-800", isCollapsed && "px-2")}>
        <div className="flex items-center justify-between gap-2">
          <div className={cn("flex items-center", isCollapsed ? "justify-center w-full" : "gap-2.5")}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-100 dark:ring-white/10">
              <Image src="/prioraflow-icon.png" alt="PrioraFlow" width={512} height={512} className="h-8 w-8 object-contain" priority />
            </div>
            {!isCollapsed && (
              <div className="min-w-0 leading-tight">
                <h2 className="truncate text-[15px] font-bold tracking-tight text-foreground dark:text-white">{productLabel}</h2>
                <p className="truncate text-[11px] font-medium text-muted-foreground dark:text-slate-400">{getEnabledModules(currentWorkshop).length} modules enabled</p>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <button
              onClick={toggleCollapsed}
              className="hidden shrink-0 rounded-md p-1 text-muted-foreground transition hover:bg-slate-100 hover:text-foreground dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white md:block"
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
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

      {/* Expand button for collapsed sidebar */}
      {isCollapsed && (
        <button
          onClick={toggleCollapsed}
          className="hidden md:flex items-center justify-center py-2 text-muted-foreground transition hover:bg-slate-100 hover:text-foreground dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          aria-label="Expand sidebar"
          title="Expand sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      <nav className={cn("flex-1 overflow-y-auto px-2 py-3 scrollbar-hide", isCollapsed && "px-1.5")}>
        {renderNavSections(isCollapsed)}
      </nav>

      {/* Compact footer with user dropdown */}
      <div className={cn("border-t border-border dark:border-slate-800 p-2", isCollapsed && "p-1.5")}>
        {renderUserDropdown(isCollapsed)}
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
                  <h2 className="text-[15px] font-bold tracking-tight text-foreground dark:text-white">{productLabel}</h2>
                  <p className="text-[11px] font-medium text-muted-foreground dark:text-slate-400">{currentWorkshop?.name || "Workspace"}</p>
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
            <nav className="flex-1 overflow-y-auto px-2 py-3 scrollbar-hide">
              {renderNavSections(false)}
            </nav>
            <div className="border-t border-border p-2 dark:border-slate-800">
              {renderUserDropdown(false)}
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
