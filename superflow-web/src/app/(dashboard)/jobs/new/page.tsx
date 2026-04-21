"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import type { Job } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

export default function NewJobPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  // Customer fields
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  // Vehicle fields
  const [vehicleMake, setVehicleMake] = useState("Mercedes-Benz");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleYear, setVehicleYear] = useState(String(new Date().getFullYear()));
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [vehicleVin, setVehicleVin] = useState("");

  // Job fields
  const [customerConcern, setCustomerConcern] = useState("");
  const [odometerIn, setOdometerIn] = useState("");
  const [promisedAt, setPromisedAt] = useState("");
  const [dmsRoNumber, setDmsRoNumber] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (!vehicleMake.trim() || !vehicleModel.trim()) {
      toast.error("Vehicle make and model are required");
      return;
    }

    setSaving(true);
    try {
      // 1. Create customer
      const customerRes = await api.post("/customers", {
        name: customerName.trim(),
        phone: customerPhone.trim() || undefined,
        email: customerEmail.trim() || undefined,
      });

      const customerId = customerRes.data.id;

      // 2. Create vehicle
      const vehicleRes = await api.post("/vehicles", {
        customer_id: customerId,
        make: vehicleMake.trim(),
        model: vehicleModel.trim(),
        year: vehicleYear ? Number(vehicleYear) : undefined,
        plate: vehiclePlate.trim() || undefined,
        vin: vehicleVin.trim() || undefined,
      });

      const vehicleId = vehicleRes.data.id;

      // 3. Create job
      const payload: Record<string, unknown> = {
        customer_id: customerId,
        vehicle_id: vehicleId,
        customer_concern: customerConcern.trim() || undefined,
        odometer_in: odometerIn ? Number(odometerIn) : undefined,
        promised_at: promisedAt ? new Date(promisedAt).toISOString() : undefined,
        dms_ro_number: dmsRoNumber.trim() || undefined,
      };
      const { data } = await api.post<Job>("/jobs", payload);
      toast.success("Job created");
      router.push(`/jobs/${data.id}`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to create job";
      toast.error(typeof msg === "string" ? msg : "Failed to create job");
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
          <form className="space-y-6" onSubmit={submit}>
            {/* Customer */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-700">Customer</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1">
                  <Label htmlFor="customerName">Name *</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Mohammed Al Maktoum"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="customerPhone">Phone</Label>
                  <Input
                    id="customerPhone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+971 50 123 4567"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="customerEmail">Email</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="customer@email.com"
                  />
                </div>
              </div>
            </div>

            {/* Vehicle */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-700">Vehicle</h3>
              <div className="grid gap-4 md:grid-cols-5">
                <div className="space-y-1">
                  <Label htmlFor="vehicleMake">Make *</Label>
                  <Input
                    id="vehicleMake"
                    value={vehicleMake}
                    onChange={(e) => setVehicleMake(e.target.value)}
                    placeholder="Mercedes-Benz"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="vehicleModel">Model *</Label>
                  <Input
                    id="vehicleModel"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    placeholder="C200"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="vehicleYear">Year</Label>
                  <Input
                    id="vehicleYear"
                    type="number"
                    value={vehicleYear}
                    onChange={(e) => setVehicleYear(e.target.value)}
                    placeholder="2022"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="vehiclePlate">Plate</Label>
                  <Input
                    id="vehiclePlate"
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value)}
                    placeholder="DXB-A-12345"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="vehicleVin">VIN</Label>
                  <Input
                    id="vehicleVin"
                    value={vehicleVin}
                    onChange={(e) => setVehicleVin(e.target.value)}
                    placeholder="WDDGF4HB1EA123456"
                    maxLength={17}
                  />
                </div>
              </div>
            </div>

            {/* Job Info */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-700">Job Info</h3>
              <div className="space-y-2">
                <Label htmlFor="concern">Customer Concern</Label>
                <Textarea
                  id="concern"
                  value={customerConcern}
                  onChange={(e) => setCustomerConcern(e.target.value)}
                  placeholder="Describe the issue or requested work"
                  rows={3}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1">
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
                <div className="space-y-1">
                  <Label htmlFor="promisedAt">Promised Time</Label>
                  <Input
                    id="promisedAt"
                    type="datetime-local"
                    value={promisedAt}
                    onChange={(e) => setPromisedAt(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dmsRo">DMS RO Number</Label>
                  <Input
                    id="dmsRo"
                    value={dmsRoNumber}
                    onChange={(e) => setDmsRoNumber(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
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
        </CardContent>
      </Card>
    </div>
  );
}