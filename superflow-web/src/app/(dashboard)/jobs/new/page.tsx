"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import type { Customer, Vehicle, PaginatedResponse, Job } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

export default function NewJobPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [customerId, setCustomerId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [customerConcern, setCustomerConcern] = useState("");
  const [odometerIn, setOdometerIn] = useState("");
  const [promisedAt, setPromisedAt] = useState("");
  const [dmsRoNumber, setDmsRoNumber] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [customersRes, vehiclesRes] = await Promise.all([
          api.get<PaginatedResponse<Customer>>("/customers", { params: { page: 1, limit: 100 } }),
          api.get<PaginatedResponse<Vehicle>>("/vehicles", { params: { page: 1, limit: 100 } }),
        ]);
        setCustomers(customersRes.data.data ?? customersRes.data.items ?? []);
        setVehicles(vehiclesRes.data.data ?? vehiclesRes.data.items ?? []);
      } catch {
        toast.error("Failed to load customers or vehicles");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredVehicles = useMemo(() => {
    if (!customerId) return vehicles;
    return vehicles.filter((v) => v.customer_id === customerId);
  }, [vehicles, customerId]);

  useEffect(() => {
    if (vehicleId && !filteredVehicles.some((v) => v.id === vehicleId)) {
      setVehicleId("");
    }
  }, [filteredVehicles, vehicleId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !vehicleId) {
      toast.error("Customer and vehicle are required");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        customer_id: customerId,
        vehicle_id: vehicleId,
        customer_concern: customerConcern || undefined,
        odometer_in: odometerIn ? Number(odometerIn) : undefined,
        promised_at: promisedAt ? new Date(promisedAt).toISOString() : undefined,
        dms_ro_number: dmsRoNumber || undefined,
      };
      const { data } = await api.post<Job>("/jobs", payload);
      toast.success("Job created");
      router.push(`/jobs/${data.id}`);
    } catch {
      toast.error("Failed to create job");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/jobs")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Job</h1>
          <p className="text-sm text-slate-500">Create a new workshop job card</p>
        </div>
      </div>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Job Details</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-slate-400">Loading…</div>
          ) : (
            <form className="space-y-5" onSubmit={submit}>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="customer">Customer</Label>
                  <Select value={customerId} onValueChange={(v) => setCustomerId(v ?? "") }>
                    <SelectTrigger id="customer">
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name || customer.email || customer.phone || customer.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vehicle">Vehicle</Label>
                  <Select value={vehicleId} onValueChange={(v) => setVehicleId(v ?? "") }>
                    <SelectTrigger id="vehicle">
                      <SelectValue placeholder="Select vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredVehicles.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {`${vehicle.year || ""} ${vehicle.make || ""} ${vehicle.model || ""} ${vehicle.plate ? `(${vehicle.plate})` : ""}`.trim() || vehicle.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="concern">Customer Concern</Label>
                <Textarea
                  id="concern"
                  value={customerConcern}
                  onChange={(e) => setCustomerConcern(e.target.value)}
                  placeholder="Describe the issue or requested work"
                  rows={4}
                />
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="odometer">Odometer In (km)</Label>
                  <Input
                    id="odometer"
                    type="number"
                    min="0"
                    value={odometerIn}
                    onChange={(e) => setOdometerIn(e.target.value)}
                    placeholder="45000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="promisedAt">Promised Time</Label>
                  <Input
                    id="promisedAt"
                    type="datetime-local"
                    value={promisedAt}
                    onChange={(e) => setPromisedAt(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dmsRo">DMS RO Number</Label>
                  <Input
                    id="dmsRo"
                    value={dmsRoNumber}
                    onChange={(e) => setDmsRoNumber(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => router.push("/jobs")}>Cancel</Button>
                <Button type="submit" disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Creating…" : "Create Job"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
