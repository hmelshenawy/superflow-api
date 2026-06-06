"use client";

import Link from "next/link";
import { LayoutGrid, List, Plus, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { BOARD_COLUMNS, STATUS_META } from "@/lib/jobs-data";
import type { JobStatus } from "@/types";

type DashboardView = "overall" | "advisor" | "workshop";

interface WorkshopToolbarProps {
  dashboardView: DashboardView;
  overallView: "board" | "list";
  search: string;
  status: string;
  totalEstimate: number;
  loading: boolean;
  showArchived: boolean;
  onDashboardViewChange: (view: DashboardView) => void;
  onOverallViewChange: (view: "board" | "list") => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onRefresh: () => void;
  onToggleArchived: () => void;
}

export function WorkshopToolbar({
  dashboardView,
  overallView,
  search,
  status,
  totalEstimate,
  loading,
  showArchived,
  onDashboardViewChange,
  onOverallViewChange,
  onSearchChange,
  onStatusChange,
  onRefresh,
  onToggleArchived,
}: WorkshopToolbarProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-1 flex-col gap-2 lg:flex-row lg:items-center">
          <div className="inline-flex w-fit rounded-lg border border-border bg-muted p-0.5">
            {(["overall", "advisor", "workshop"] as const).map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => onDashboardViewChange(view)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[13px] font-medium capitalize transition",
                  dashboardView === view ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {view}
              </button>
            ))}
          </div>

          {dashboardView === "overall" && (
            <div className="inline-flex w-fit rounded-lg border border-border bg-muted p-0.5">
              <button
                type="button"
                onClick={() => onOverallViewChange("board")}
                className={cn("inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition", overallView === "board" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Board
              </button>
              <button
                type="button"
                onClick={() => onOverallViewChange("list")}
                className={cn("inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition", overallView === "list" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
              >
                <List className="h-3.5 w-3.5" /> List
              </button>
            </div>
          )}

          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search jobs, customers, vehicles..."
              aria-label="Search jobs"
              className="h-9 rounded-lg border-border bg-card pl-8 text-[13px]"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </div>

          <Select value={status} onValueChange={(value) => onStatusChange(value ?? "all")}>
            <SelectTrigger className="h-9 w-full rounded-lg border-border text-[13px] md:w-44">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {BOARD_COLUMNS.map((value: JobStatus) => (
                <SelectItem key={value} value={value}>{STATUS_META[value].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-lg border border-border bg-muted px-2 py-1.5 text-[13px] text-muted-foreground">
            Value <span className="font-semibold text-foreground">{totalEstimate.toFixed(0)}</span>
          </div>
          <Button variant="outline" className="h-9 rounded-lg text-[13px]" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", loading && "animate-spin")} /> Refresh
          </Button>
          <Button variant={showArchived ? "default" : "outline"} className="h-9 rounded-lg text-[13px]" onClick={onToggleArchived} disabled={loading}>
            {showArchived ? "Showing Archive" : "Archive"}
          </Button>
          <Link href="/jobs/new">
            <Button className="h-9 rounded-lg bg-slate-950 px-3 text-[13px] text-white hover:bg-slate-800">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> New job
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
