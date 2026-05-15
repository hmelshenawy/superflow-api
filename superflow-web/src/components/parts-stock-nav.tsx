"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";
import { BarChart3, Package, ArrowLeftRight, AlertTriangle, Warehouse, Truck, ScrollText, Sliders } from "lucide-react";

type Tab = { href: string; label: string; icon: typeof Package; requirePermission: string };

const TABS: Tab[] = [
  { href: "/parts", label: "Parts", icon: Package, requirePermission: "parts:read" },
  { href: "/suppliers", label: "Suppliers", icon: Truck, requirePermission: "suppliers:read" },
  { href: "/inventory/warehouses", label: "Warehouses", icon: Warehouse, requirePermission: "warehouses:read" },
  { href: "/purchase-orders", label: "Purchase Orders", icon: ScrollText, requirePermission: "purchase_orders:read" },
  { href: "/inventory/adjustments", label: "Adjustments", icon: Sliders, requirePermission: "stock:adjust" },
  { href: "/inventory/transfers", label: "Transfers", icon: ArrowLeftRight, requirePermission: "stock:transfer" },
  { href: "/inventory/low-stock", label: "Low Stock", icon: AlertTriangle, requirePermission: "stock:analytics" },
  { href: "/parts/analytics", label: "Analytics", icon: BarChart3, requirePermission: "stock:analytics" },
];

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

function canSeeTab(tab: Tab, user: { role?: { name?: string | null; permissions?: string[] | string | null } | null; role_id?: string | null } | null): boolean {
  if (!tab.requirePermission) return true;
  if (isAdmin(user)) return true;
  return getUserPermissions(user).has(tab.requirePermission);
}

export function PartsStockNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();

  const visibleTabs = TABS.filter((tab) => canSeeTab(tab, user));

  function isActive(href: string) {
    if (href === "/parts") return pathname === "/parts" || pathname.startsWith("/parts/");
    return pathname.startsWith(href);
  }

  return (
    <nav className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-muted/50 p-1 scrollbar-hide">
      {visibleTabs.map((tab) => {
        const Icon = tab.icon;
        const active = isActive(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}