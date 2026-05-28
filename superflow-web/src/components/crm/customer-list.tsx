"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useCrmCustomers } from "@/hooks/use-crm";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Plus, Phone, Mail, Car, Calendar } from "lucide-react";

const LEAD_SOURCES = ["walk-in", "referral", "online", "dms", "other"];
const TAG_COLORS: Record<string, string> = {
  VIP: "bg-amber-100 text-amber-800",
  fleet: "bg-blue-100 text-blue-800",
  corporate: "bg-purple-100 text-purple-800",
  comeback: "bg-green-100 text-green-800",
  new: "bg-sky-100 text-sky-800",
};

export function CustomerList() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [leadSourceFilter, setLeadSourceFilter] = useState<string>("");
  const [page, setPage] = useState(1);

  const params = useMemo(
    () => ({
      search: search || undefined,
      lead_source: leadSourceFilter || undefined,
      page,
      limit: 20,
    }),
    [search, leadSourceFilter, page]
  );

  const { data, loading, error } = useCrmCustomers(params);

  if (error) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
        Error loading customers: {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-8"
            />
          </div>
          <Select
            value={leadSourceFilter}
            onValueChange={(v) => {
              setLeadSourceFilter(v === "all" ? "" : v ?? "");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Lead Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {LEAD_SOURCES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => router.push("/crm/customers/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Vehicles</TableHead>
              <TableHead>Jobs</TableHead>
              <TableHead>Last Visit</TableHead>
              <TableHead>Tags</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : !data?.items?.length ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No customers found
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((customer: any) => (
                <TableRow
                  key={customer.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/crm/customers/${customer.id}`)}
                >
                  <TableCell className="font-medium">{customer.name || "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      {customer.phone && (
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {customer.phone}
                        </span>
                      )}
                      {customer.email && (
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {customer.email}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1">
                      <Car className="h-3.5 w-3.5 text-muted-foreground" />
                      {customer.vehicle_count ?? 0}
                    </span>
                  </TableCell>
                  <TableCell>{customer.job_count ?? 0}</TableCell>
                  <TableCell>
                    {customer.last_visit ? (
                      <span className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        {new Date(customer.last_visit).toLocaleDateString()}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(customer.tags) &&
                        customer.tags.slice(0, 3).map((tag: string) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className={`text-xs ${TAG_COLORS[tag] || ""}`}
                          >
                            {tag}
                          </Badge>
                        ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {data && data.total > 20 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Showing {data.items.length} of {data.total} customers
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page * 20 >= data.total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}