"use client";

import { useParams, useRouter } from "next/navigation";
import { useCrmVehicleDashboard } from "@/hooks/use-crm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, Wrench, DollarSign, Calendar, Gauge, ChevronRight } from "lucide-react";

function formatMoney(value: number | null | undefined) {
  return new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString() : '—';
}

export default function VehicleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const vehicleId = params.id as string;

  const { data, loading, error } = useCrmVehicleDashboard(vehicleId);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-muted" />
          <div className="h-32 rounded bg-muted" />
          <div className="h-64 rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          Error loading vehicle: {error || "Not found"}
        </div>
      </div>
    );
  }

  const { vehicle, customer, stats, serviceHistory } = data;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/crm")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {vehicle.year ? `${vehicle.year} ` : ""}
              {vehicle.make} {vehicle.model}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
              {vehicle.plate && (
                <span className="font-mono bg-muted px-2 py-0.5 rounded">{vehicle.plate}</span>
              )}
              {vehicle.vin && (
                <span className="font-mono text-xs">VIN: {vehicle.vin}</span>
              )}
              {vehicle.color && <span>{vehicle.color}</span>}
              {vehicle.vehicle_type && (
                <Badge variant="outline">{vehicle.vehicle_type}</Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Owner Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Owner
          </CardTitle>
        </CardHeader>
        <CardContent>
          {customer ? (
            <div
              className="flex items-center justify-between cursor-pointer hover:bg-muted/50 p-2 rounded-lg"
              onClick={() => router.push(`/crm/customers/${customer.id}`)}
            >
              <div>
                <div className="font-medium">{customer.name || "Unknown"}</div>
                <div className="text-sm text-muted-foreground">
                  {customer.phone || customer.email || "No contact info"}
                </div>
              </div>
              <Button variant="ghost" size="sm">View</Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-amber-600">
              <Badge variant="outline" className="border-amber-600 text-amber-600">
                Orphan Vehicle
              </Badge>
              <span className="text-sm">No owner assigned</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{stats.totalJobs}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{formatMoney(stats.totalRevenue)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last Service</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <span className="text-lg font-bold">
                {stats.lastServiceDate ? new Date(stats.lastServiceDate).toLocaleDateString() : "Never"}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Odometer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-muted-foreground" />
              <span className="text-lg font-bold">
                {stats.currentOdometer?.toLocaleString() || "—"} km
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service History */}
      <Card>
        <CardHeader>
          <CardTitle>Service History</CardTitle>
        </CardHeader>
        <CardContent>
          {serviceHistory.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No service history found</p>
          ) : (
            <div className="space-y-3">
              {serviceHistory.map((service: any) => {
                const canOpenJob = Boolean(service.job_id);
                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => canOpenJob && router.push(`/jobs/${service.job_id}`)}
                    className={`w-full rounded-lg border p-4 text-left transition ${canOpenJob ? "hover:bg-muted/60 cursor-pointer" : "cursor-default"}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">Job #{service.job_number || service.dms_ro_number || "—"}</span>
                          {service.status && <Badge variant="outline">{String(service.status).replace(/_/g, " ")}</Badge>}
                        </div>
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {service.summary || "No repair summary recorded"}
                        </p>
                        <div className="grid gap-2 text-sm sm:grid-cols-3">
                          <div>
                            <span className="text-muted-foreground">Date: </span>
                            <span className="font-medium">{formatDate(service.serviced_at)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Mileage: </span>
                            <span className="font-medium">{service.odometer_km ? `${Number(service.odometer_km).toLocaleString()} km` : "—"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Cost: </span>
                            <span className="font-medium">{typeof service.estimate_total === "number" ? formatMoney(service.estimate_total) : "—"}</span>
                          </div>
                        </div>
                      </div>
                      {canOpenJob && <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vehicle Details */}
      <Card>
        <CardHeader>
          <CardTitle>Vehicle Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <div className="text-sm text-muted-foreground">Make</div>
              <div className="font-medium">{vehicle.make || "—"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Model</div>
              <div className="font-medium">{vehicle.model || "—"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Year</div>
              <div className="font-medium">{vehicle.year || "—"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Type</div>
              <div className="font-medium">{vehicle.vehicle_type || "—"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Color</div>
              <div className="font-medium">{vehicle.color || "—"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Engine</div>
              <div className="font-medium">{vehicle.engine || "—"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">VIN</div>
              <div className="font-mono text-sm">{vehicle.vin || "—"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">DMS ID</div>
              <div className="font-medium">{vehicle.dms_vehicle_id || "—"}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}