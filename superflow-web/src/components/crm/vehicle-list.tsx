"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useCrmVehicles } from "@/hooks/use-crm";
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
import { Search, Car, User } from "lucide-react";

export function VehicleList() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const params = useMemo(
    () => ({
      search: search || undefined,
      page,
      limit: 20,
    }),
    [search, page]
  );

  const { data, loading, error } = useCrmVehicles(params);

  if (error) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
        Error loading vehicles: {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by plate, VIN, make, model..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-8"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vehicle</TableHead>
              <TableHead>Plate</TableHead>
              <TableHead>VIN</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Jobs</TableHead>
              <TableHead>Status</TableHead>
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
                  No vehicles found
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((vehicle: any) => (
                <TableRow
                  key={vehicle.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/crm/vehicles/${vehicle.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {vehicle.year ? `${vehicle.year} ` : ""}
                        {vehicle.make} {vehicle.model}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">{vehicle.plate || "—"}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {vehicle.vin ? vehicle.vin.slice(-8) : "—"}
                  </TableCell>
                  <TableCell>
                    {vehicle.is_orphan ? (
                      <Badge variant="outline" className="text-amber-600 border-amber-600">
                        No Owner
                      </Badge>
                    ) : (
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        {vehicle.customer_name || "—"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{vehicle.job_count ?? 0}</TableCell>
                  <TableCell>
                    {vehicle.is_orphan ? (
                      <Badge variant="outline" className="text-amber-600 border-amber-600">
                        Orphan
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Active
                      </Badge>
                    )}
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
            Showing {data.items.length} of {data.total} vehicles
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