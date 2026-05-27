import type { ProductMode, Workshop } from "@/types";
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  CalendarDays,
  ClipboardList,
  FileUp,
  Gauge,
  LayoutDashboard,
  LayoutGrid,
  ListChecks,
  Package,
  Receipt,
  Settings,
  SlidersHorizontal,
  Target,
  UserCheck,
  Users,
  Wrench,
} from "lucide-react";

export const MODULES = {
  APPOINTMENTS: "appointments",
  JOB_CARDS: "jobCards",
  CUSTOMERS: "customers",
  VEHICLES: "vehicles",
  STOCK: "stock",
  ESTIMATES: "estimates",
  INVOICING: "invoicing",
  TECHNICIAN_LOADING: "technicianLoading",
  WIP: "wip",
  OPERATIONAL_ANALYTICS: "operationalAnalytics",
  DMS_INTEGRATION: "dmsIntegration",
  BOOKING_IMPORT: "bookingImport",
  WORKSHOP_LOADING: "workshopLoading",
  CAPACITY_MANAGEMENT: "capacityManagement",
  PRIORITY_ENGINE: "priorityEngine",
  BOTTLENECK_DETECTION: "bottleneckDetection",
  NEXT_BEST_ACTION: "nextBestAction",
  ADVISOR_PERFORMANCE: "advisorPerformance",
  TECHNICIAN_PERFORMANCE: "technicianPerformance",
  BRANCH_PERFORMANCE: "branchPerformance",
  FINANCIAL_ANALYTICS: "financialAnalytics",
} as const;

export type ModuleKey = typeof MODULES[keyof typeof MODULES];

export const PRODUCT_LABELS: Record<ProductMode, string> = {
  WORKSHOP: "PrioraFlow Workshop",
  CONNECT: "PrioraFlow Connect",
};

export const PRODUCT_MODULES: Record<ProductMode, ModuleKey[]> = {
  WORKSHOP: [
    MODULES.APPOINTMENTS,
    MODULES.JOB_CARDS,
    MODULES.CUSTOMERS,
    MODULES.VEHICLES,
    MODULES.STOCK,
    MODULES.ESTIMATES,
    MODULES.INVOICING,
    MODULES.TECHNICIAN_LOADING,
    MODULES.WIP,
    MODULES.OPERATIONAL_ANALYTICS,
  ],
  CONNECT: [
    MODULES.DMS_INTEGRATION,
    MODULES.BOOKING_IMPORT,
    MODULES.WORKSHOP_LOADING,
    MODULES.CAPACITY_MANAGEMENT,
    MODULES.WIP,
    MODULES.PRIORITY_ENGINE,
    MODULES.BOTTLENECK_DETECTION,
    MODULES.NEXT_BEST_ACTION,
    MODULES.ADVISOR_PERFORMANCE,
    MODULES.TECHNICIAN_PERFORMANCE,
    MODULES.BRANCH_PERFORMANCE,
    MODULES.OPERATIONAL_ANALYTICS,
    MODULES.FINANCIAL_ANALYTICS,
  ],
};

export type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  module?: ModuleKey;
  requirePermission?: string;
  platformOnly?: boolean;
  roles?: string[];
};

export const PRODUCT_NAV: Record<ProductMode, NavItem[]> = {
  WORKSHOP: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, module: MODULES.OPERATIONAL_ANALYTICS },
    { href: "/jobs", label: "Appointments", icon: CalendarDays, module: MODULES.APPOINTMENTS },
    { href: "/jobs", label: "Job Cards", icon: LayoutGrid, module: MODULES.JOB_CARDS },
    { href: "/jobs", label: "Customers", icon: Users, module: MODULES.CUSTOMERS },
    { href: "/jobs", label: "Vehicles", icon: ClipboardList, module: MODULES.VEHICLES },
    { href: "/parts", label: "Parts / Stock", icon: Package, module: MODULES.STOCK, requirePermission: "parts:read" },
    { href: "/jobs", label: "Estimates", icon: ListChecks, module: MODULES.ESTIMATES, requirePermission: "estimates:read" },
    { href: "/settings", label: "Invoices", icon: Receipt, module: MODULES.INVOICING, requirePermission: "admin:billing" },
    { href: "/jobs", label: "Technicians", icon: Wrench, module: MODULES.TECHNICIAN_LOADING },
    { href: "/insights", label: "Reports / Analytics", icon: BarChart3, module: MODULES.OPERATIONAL_ANALYTICS, requirePermission: "insights:dashboard" },
    { href: "/settings", label: "Settings", icon: Settings },
  ],
  CONNECT: [
    { href: "/dashboard", label: "Command Center", icon: Gauge, module: MODULES.OPERATIONAL_ANALYTICS },
    { href: "/jobs", label: "WIP Board", icon: LayoutGrid, module: MODULES.WIP },
    { href: "/insights", label: "Capacity", icon: SlidersHorizontal, module: MODULES.CAPACITY_MANAGEMENT, requirePermission: "insights:dashboard" },
    { href: "/advisor", label: "Priority Queue", icon: Target, module: MODULES.PRIORITY_ENGINE, requirePermission: "priority:read" },
    { href: "/blockers", label: "Bottlenecks", icon: AlertTriangle, module: MODULES.BOTTLENECK_DETECTION, requirePermission: "blockers:read" },
    { href: "/advisor", label: "Advisors", icon: UserCheck, module: MODULES.ADVISOR_PERFORMANCE, requirePermission: "priority:read", roles: ["service_advisor", "manager", "workshop_manager", "general_manager", "admin", "workshop_admin"] },
    { href: "/insights", label: "Branch Analytics", icon: BarChart3, module: MODULES.BRANCH_PERFORMANCE, requirePermission: "insights:dashboard" },
    { href: "/admin/booking-import", label: "DMS Booking Import", icon: FileUp, module: MODULES.BOOKING_IMPORT },
    { href: "/insights", label: "Reports", icon: BarChart3, module: MODULES.OPERATIONAL_ANALYTICS, requirePermission: "insights:dashboard" },
    { href: "/settings", label: "Settings", icon: Settings },
  ],
};

export const ROUTE_MODULES: Array<{ prefix: string; module: ModuleKey; modes?: ProductMode[] }> = [
  { prefix: "/parts", module: MODULES.STOCK, modes: ["WORKSHOP"] },
  { prefix: "/inventory", module: MODULES.STOCK, modes: ["WORKSHOP"] },
  { prefix: "/purchase-orders", module: MODULES.STOCK, modes: ["WORKSHOP"] },
  { prefix: "/suppliers", module: MODULES.STOCK, modes: ["WORKSHOP"] },
  { prefix: "/advisor", module: MODULES.PRIORITY_ENGINE, modes: ["CONNECT"] },
  { prefix: "/blockers", module: MODULES.BOTTLENECK_DETECTION, modes: ["CONNECT"] },
  { prefix: "/admin/booking-import", module: MODULES.BOOKING_IMPORT, modes: ["CONNECT"] },
  { prefix: "/insights", module: MODULES.OPERATIONAL_ANALYTICS },
  { prefix: "/jobs", module: MODULES.WIP },
];

export function getWorkshopProductMode(workshop?: Workshop | null): ProductMode {
  return (workshop?.productMode || workshop?.product_mode) === "CONNECT" ? "CONNECT" : "WORKSHOP";
}

export function getEnabledModules(workshop?: Workshop | null): ModuleKey[] {
  const mode = getWorkshopProductMode(workshop);
  const raw = workshop?.enabledModules ?? workshop?.enabled_modules;
  if (Array.isArray(raw)) return raw as ModuleKey[];
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as ModuleKey[];
    } catch {
      return raw.split(",").map((item) => item.trim()).filter(Boolean) as ModuleKey[];
    }
  }
  return PRODUCT_MODULES[mode];
}

export function hasProductModule(workshop: Workshop | null | undefined, moduleKey?: ModuleKey) {
  if (!moduleKey) return true;
  const mode = getWorkshopProductMode(workshop);
  return PRODUCT_MODULES[mode].includes(moduleKey) && getEnabledModules(workshop).includes(moduleKey);
}

export function getRouteRestriction(pathname: string, workshop?: Workshop | null) {
  const mode = getWorkshopProductMode(workshop);
  const route = ROUTE_MODULES.find((item) => pathname === item.prefix || pathname.startsWith(`${item.prefix}/`));
  if (!route) return null;
  if (route.modes && !route.modes.includes(mode)) return { module: route.module, mode };
  if (!hasProductModule(workshop, route.module)) return { module: route.module, mode };
  return null;
}
