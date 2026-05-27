"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import api, { getApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";
import { LockedFeatureOverlay } from "@/components/locked-feature-overlay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  AlertTriangle,
  BarChart3,
  DollarSign,
  Loader2,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { PartsStockNav } from "@/components/parts-stock-nav";

// ─── Permission helpers ──────────────────────────────────
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

function hasPermission(user: Parameters<typeof getUserPermissions>[0], perm: string): boolean {
  const perms = getUserPermissions(user);
  return perms.has("*") || perms.has(perm);
}

// ─── Types ───────────────────────────────────────────────
interface PartSearchResult {
  id: string;
  name: string;
  part_number: string | null;
  category: string | null;
}

interface DemandDataPoint {
  month: string;
  total: number;
}

interface FastMovingPart {
  id: string;
  name: string;
  part_number: string | null;
  category: string | null;
  total_consumed: number;
  selling_price: number | null;
}

interface DeadStockPart {
  id: string;
  name: string;
  part_number: string | null;
  category: string | null;
  warehouse: string | null;
  quantity_on_hand: number;
  available_quantity: number;
  selling_price: number | null;
}

interface ProfitByCategory {
  revenue: number;
  cost: number;
  profit: number;
  count: number;
}

interface ProfitData {
  by_category: Record<string, ProfitByCategory>;
  totals: {
    revenue: number;
    cost: number;
    profit: number;
  };
}

// ─── Helpers ─────────────────────────────────────────────
function fmtAED(n: number) {
  return "AED " + n.toLocaleString("en-AE", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtPct(n: number) {
  if (!isFinite(n)) return "—";
  return n.toFixed(1) + "%";
}

// ─── Component ────────────────────────────────────────────
export default function PartsAnalyticsPage() {
  const { user } = useAuthStore();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();

  // Permission gate
  if (!hasPermission(user, "stock:analytics")) {
    return (
      <LockedFeatureOverlay
        featureKey="stock:analytics"
        title="Parts Analytics Locked"
        description="You need the stock:analytics permission to access this page."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PartsStockNav />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Parts & Stock
          </p>
          <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-foreground">
            Parts Analytics
          </h1>
        </div>
      </div>

      <Tabs defaultValue="demand">
        <TabsList>
          <TabsTrigger value="demand">Demand History</TabsTrigger>
          <TabsTrigger value="fast-moving">Fast Moving</TabsTrigger>
          <TabsTrigger value="dead-stock">Dead Stock</TabsTrigger>
          <TabsTrigger value="profit">Profit Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="demand" className="mt-4">
          <DemandHistoryTab isDark={isDark} />
        </TabsContent>
        <TabsContent value="fast-moving" className="mt-4">
          <FastMovingTab isDark={isDark} />
        </TabsContent>
        <TabsContent value="dead-stock" className="mt-4">
          <DeadStockTab isDark={isDark} onRowClick={(id) => router.push(`/parts/${id}`)} />
        </TabsContent>
        <TabsContent value="profit" className="mt-4">
          <ProfitTab isDark={isDark} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Tab 1: Demand History ────────────────────────────────
function DemandHistoryTab({ isDark }: { isDark: boolean }) {
  const [partSearch, setPartSearch] = useState("");
  const [searchResults, setSearchResults] = useState<PartSearchResult[]>([]);
  const [selectedPart, setSelectedPart] = useState<PartSearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [demandData, setDemandData] = useState<DemandDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search for parts
  useEffect(() => {
    if (partSearch.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await api.get<PartSearchResult[]>("/parts/search", { params: { q: partSearch } });
        const results = Array.isArray(data) ? data : (data as any).data ?? [];
        setSearchResults(results);
        setShowDropdown(results.length > 0);
      } catch (err) {
        // Silently ignore search errors
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [partSearch]);

  const fetchDemand = useCallback(async () => {
    if (!selectedPart) return;
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const qs = Object.keys(params).length ? "?" + new URLSearchParams(params).toString() : "";
      const { data } = await api.get<DemandDataPoint[]>(`/parts/analytics/demand/${selectedPart.id}${qs}`);
      setDemandData(Array.isArray(data) ? data : (data as any).data ?? []);
    } catch (err: unknown) {
      const { message } = getApiError(err);
      setError(typeof message === "string" ? message : "Failed to load demand data");
      toast.error(typeof message === "string" ? message : "Failed to load demand data");
    } finally {
      setLoading(false);
    }
  }, [selectedPart, dateFrom, dateTo]);

  useEffect(() => {
    fetchDemand();
  }, [fetchDemand]);

  return (
    <div className="space-y-4">
      {/* Part search + date filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search part by name or number..."
            value={selectedPart ? `${selectedPart.name} (${selectedPart.part_number ?? "—"})` : partSearch}
            onChange={(e) => {
              if (selectedPart) {
                setSelectedPart(null);
                setDemandData([]);
              }
              setPartSearch(e.target.value);
            }}
            className="pl-9"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
          {showDropdown && searchResults.length > 0 && !selectedPart && (
            <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg max-h-60 overflow-y-auto">
              {searchResults.map((part) => (
                <button
                  key={part.id}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                  onClick={() => {
                    setSelectedPart(part);
                    setPartSearch("");
                    setShowDropdown(false);
                  }}
                >
                  <span className="font-medium text-foreground">{part.name}</span>
                  {part.part_number && (
                    <span className="text-muted-foreground">({part.part_number})</span>
                  )}
                  {part.category && (
                    <Badge variant="secondary" className="ml-auto text-[10px]">{part.category}</Badge>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">From</label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[160px]" />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">To</label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[160px]" />
          </div>
          <div className="flex items-end">
            <Button variant="outline" size="sm" onClick={fetchDemand} disabled={loading || !selectedPart}>
              <RefreshCw className={cn("mr-1 h-3.5 w-3.5", loading && "animate-spin")} /> Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Chart area */}
      {!selectedPart ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-border bg-card text-sm text-muted-foreground">
          <div className="text-center">
            <Package className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2">Select a part to view its demand history</p>
          </div>
        </div>
      ) : loading && demandData.length === 0 ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-border bg-card">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error && demandData.length === 0 ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-border bg-card text-sm text-destructive">
          <AlertTriangle className="mr-2 h-4 w-4" /> {error}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Monthly Consumption for <span className="text-foreground">{selectedPart.name}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={demandData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#334155" : "#e2e8f0"} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: isDark ? "#94a3b8" : "#334155" }}
                    tickFormatter={(v) => v.slice(5)}
                  />
                  <YAxis tick={{ fontSize: 11, fill: isDark ? "#94a3b8" : "#334155" }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: isDark ? "#1e293b" : "#fff", border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`, borderRadius: 8, color: isDark ? "#e2e8f0" : "#0f172a" }}
                    formatter={(value: any) => [value, "Units Consumed"]}
                    labelFormatter={(label) => `Month: ${label}`}
                  />
                  <Bar dataKey="total" name="Consumed" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Tab 2: Fast Moving Parts ─────────────────────────────
function FastMovingTab({ isDark }: { isDark: boolean }) {
  const [days, setDays] = useState(30);
  const [parts, setParts] = useState<FastMovingPart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFastMoving = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<FastMovingPart[]>("/parts/analytics/fast-moving", { params: { limit: 20, days } });
      setParts(Array.isArray(data) ? data : (data as any).data ?? []);
    } catch (err: unknown) {
      const { message } = getApiError(err);
      setError(typeof message === "string" ? message : "Failed to load fast-moving parts");
      toast.error(typeof message === "string" ? message : "Failed to load fast-moving parts");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchFastMoving();
  }, [fetchFastMoving]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Period:</label>
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={fetchFastMoving} disabled={loading}>
          <RefreshCw className={cn("mr-1 h-3.5 w-3.5", loading && "animate-spin")} /> Refresh
        </Button>
      </div>

      {loading && parts.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading...
        </div>
      ) : error && parts.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
          <Button variant="outline" size="sm" className="ml-auto" onClick={fetchFastMoving} disabled={loading}>
            Retry
          </Button>
        </div>
      ) : parts.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-border bg-card text-sm text-muted-foreground">
          No fast-moving parts found for the selected period.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Part Name</TableHead>
                <TableHead>Part Number</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Total Consumed</TableHead>
                <TableHead className="text-right">Selling Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Refreshing...
                  </TableCell>
                </TableRow>
              ) : (
                parts.map((part) => (
                  <TableRow key={part.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{part.name}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">{part.part_number || "—"}</TableCell>
                    <TableCell>
                      {part.category ? <Badge variant="secondary">{part.category}</Badge> : "—"}
                    </TableCell>
                    <TableCell className="text-right font-semibold">{part.total_consumed}</TableCell>
                    <TableCell className="text-right">{part.selling_price != null ? fmtAED(part.selling_price) : "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ─── Tab 3: Dead Stock ────────────────────────────────────
function DeadStockTab({ isDark, onRowClick }: { isDark: boolean; onRowClick: (id: string) => void }) {
  const [parts, setParts] = useState<DeadStockPart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeadStock = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<DeadStockPart[]>("/parts/analytics/dead-stock", { params: { months: 6 } });
      setParts(Array.isArray(data) ? data : (data as any).data ?? []);
    } catch (err: unknown) {
      const { message } = getApiError(err);
      setError(typeof message === "string" ? message : "Failed to load dead stock data");
      toast.error(typeof message === "string" ? message : "Failed to load dead stock data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeadStock();
  }, [fetchDeadStock]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Parts with stock &gt; 0 but no consumption in the last 6 months
        </p>
        <Button variant="outline" size="sm" onClick={fetchDeadStock} disabled={loading}>
          <RefreshCw className={cn("mr-1 h-3.5 w-3.5", loading && "animate-spin")} /> Refresh
        </Button>
      </div>

      {loading && parts.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading...
        </div>
      ) : error && parts.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
          <Button variant="outline" size="sm" className="ml-auto" onClick={fetchDeadStock} disabled={loading}>
            Retry
          </Button>
        </div>
      ) : parts.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-border bg-card text-sm text-muted-foreground">
          No dead stock found. All parts with inventory have recent consumption.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Part Name</TableHead>
                <TableHead>Part Number</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead className="text-right">On Hand</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="text-right">Selling Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Refreshing...
                  </TableCell>
                </TableRow>
              ) : (
                parts.map((part) => (
                  <TableRow
                    key={part.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onRowClick(part.id)}
                  >
                    <TableCell className="font-medium">{part.name}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">{part.part_number || "—"}</TableCell>
                    <TableCell>
                      {part.category ? <Badge variant="secondary">{part.category}</Badge> : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{part.warehouse || "—"}</TableCell>
                    <TableCell className="text-right font-semibold">{part.quantity_on_hand}</TableCell>
                    <TableCell className="text-right">{part.available_quantity}</TableCell>
                    <TableCell className="text-right">{part.selling_price != null ? fmtAED(part.selling_price) : "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ─── Tab 4: Profit Analysis ───────────────────────────────
function ProfitTab({ isDark }: { isDark: boolean }) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [profitData, setProfitData] = useState<ProfitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const qs = Object.keys(params).length ? "?" + new URLSearchParams(params).toString() : "";
      const { data } = await api.get<ProfitData>(`/parts/analytics/profit${qs}`);
      setProfitData(data);
    } catch (err: unknown) {
      const { message } = getApiError(err);
      setError(typeof message === "string" ? message : "Failed to load profit data");
      toast.error(typeof message === "string" ? message : "Failed to load profit data");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchProfit();
  }, [fetchProfit]);

  const categories = profitData?.by_category ? Object.entries(profitData.by_category) : [];
  const totals = profitData?.totals;

  return (
    <div className="space-y-4">
      {/* Date filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">From</label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[180px]" />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">To</label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[180px]" />
        </div>
        <Button variant="outline" size="sm" onClick={fetchProfit} disabled={loading}>
          <RefreshCw className={cn("mr-1 h-3.5 w-3.5", loading && "animate-spin")} /> Refresh
        </Button>
      </div>

      {loading && !profitData ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading...
        </div>
      ) : error && !profitData ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
          <Button variant="outline" size="sm" className="ml-auto" onClick={fetchProfit} disabled={loading}>
            Retry
          </Button>
        </div>
      ) : profitData && totals ? (
        <>
          {/* Summary cards */}
          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Total Revenue</p>
                  <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="mt-1 text-2xl font-bold text-foreground">{fmtAED(totals.revenue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Total Cost</p>
                  <DollarSign className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <p className="mt-1 text-2xl font-bold text-foreground">{fmtAED(totals.cost)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Total Profit</p>
                  <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <p className={cn("mt-1 text-2xl font-bold", totals.profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                  {fmtAED(totals.profit)}
                </p>
                {totals.revenue > 0 && (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Margin: {fmtPct((totals.profit / totals.revenue) * 100)}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Category breakdown table */}
          {categories.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead className="text-right">Margin %</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Refreshing...
                      </TableCell>
                    </TableRow>
                  ) : (
                    categories.map(([category, data]) => {
                      const margin = data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0;
                      return (
                        <TableRow key={category} className="hover:bg-muted/50">
                          <TableCell className="font-medium">
                            <Badge variant="secondary">{category}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{fmtAED(data.revenue)}</TableCell>
                          <TableCell className="text-right">{fmtAED(data.cost)}</TableCell>
                          <TableCell className={cn("text-right font-semibold", data.profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                            {fmtAED(data.profit)}
                          </TableCell>
                          <TableCell className="text-right">{fmtPct(margin)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{data.count}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-border bg-card text-sm text-muted-foreground">
              No profit data available for the selected period.
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}