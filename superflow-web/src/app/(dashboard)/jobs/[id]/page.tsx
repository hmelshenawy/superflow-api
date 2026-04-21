"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import type { Job } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EstimateBuilder } from "@/components/estimates/estimate-builder";
import { SendApprovalButton } from "@/components/estimates/send-approval-button";
import { InspectionWorkspace } from "@/components/inspections/inspection-workspace";
import { MediaUploader } from "@/components/media/media-uploader";
import {
  ArrowLeft,
  Car,
  User,
  Wrench,
  Clock,
  FileText,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  waiting_parts: "Waiting Parts",
  completed: "Completed",
  closed: "Closed",
  invoiced: "Invoiced",
};

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [inspectionDetail, setInspectionDetail] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingInspection, setStartingInspection] = useState(false);

  const refreshJob = async () => {
    const { data } = await api.get<Job>(`/jobs/${id}`);
    setJob(data);
    if (data.inspection?.id) {
      const inspectionRes = await api.get(`/inspections/${data.inspection.id}`);
      setInspectionDetail(inspectionRes.data);
    } else {
      setInspectionDetail(null);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        await refreshJob();
      } catch {
        toast.error("Failed to load job");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div className="py-20 text-center text-slate-400">Loading…</div>;
  if (!job) return <div className="py-20 text-center text-red-500">Job not found</div>;

  const startInspection = async () => {
    if (!job) return;
    setStartingInspection(true);
    try {
      const templateRes = await api.get<any[]>("/inspection-templates", {
        params: { vehicleType: job.vehicle?.vehicle_type || undefined },
      });
      const templates = templateRes.data || [];
      const template = templates.find((t: any) => t.is_default) || templates[0];
      if (!template) {
        toast.error("No inspection template available");
        return;
      }
      await api.post("/inspections", { jobId: job.id, templateId: template.id });
      await refreshJob();
      toast.success("Inspection started");
    } catch {
      toast.error("Failed to start inspection");
    } finally {
      setStartingInspection(false);
    }
  };

  const vehicleStr = job.vehicle
    ? `${job.vehicle.year || ""} ${job.vehicle.make || ""} ${job.vehicle.model || ""} ${job.vehicle.plate ? `(${job.vehicle.plate})` : ""}`.trim()
    : "—";
  const totalEstimate = (job.estimate_lines ?? []).reduce(
    (sum, l) => sum + Number(l.line_total ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/jobs")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {job.job_number || "New Job"}
            </h1>
            <p className="text-sm text-slate-500">Created {new Date(job.created_at).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm">{STATUS_LABELS[job.status] || job.status}</Badge>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview"><FileText className="mr-2 h-4 w-4" />Overview</TabsTrigger>
          <TabsTrigger value="estimate"><Wrench className="mr-2 h-4 w-4" />Estimate</TabsTrigger>
          <TabsTrigger value="inspection"><ClipboardIcon className="mr-2 h-4 w-4" />Inspection</TabsTrigger>
          <TabsTrigger value="media"><ImageIcon className="mr-2 h-4 w-4" />Media</TabsTrigger>
        </TabsList>

        {/* ── Overview ─────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Customer */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <User className="h-4 w-4 text-slate-500" />
                <CardTitle className="text-sm font-medium">Customer</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{job.customer?.name || "—"}</p>
                <p className="text-sm text-slate-500">{job.customer?.phone || job.customer?.email || ""}</p>
              </CardContent>
            </Card>

            {/* Vehicle */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <Car className="h-4 w-4 text-slate-500" />
                <CardTitle className="text-sm font-medium">Vehicle</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{vehicleStr}</p>
                {job.vehicle?.vin && <p className="text-xs text-slate-400">VIN: {job.vehicle.vin}</p>}
                {job.odometer_in && <p className="text-sm text-slate-500">Odometer: {job.odometer_in.toLocaleString()} km</p>}
              </CardContent>
            </Card>

            {/* Assignment */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <Clock className="h-4 w-4 text-slate-500" />
                <CardTitle className="text-sm font-medium">Assignment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p><span className="text-slate-500">Advisor:</span> {job.advisor?.name || "—"}</p>
                <p><span className="text-slate-500">Technician:</span> {job.technician?.name || "—"}</p>
                <p><span className="text-slate-500">Promised:</span> {job.promised_at ? new Date(job.promised_at).toLocaleString() : "—"}</p>
              </CardContent>
            </Card>
          </div>

          {/* Concern */}
          {job.customer_concern && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Customer Concern</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{job.customer_concern}</p>
              </CardContent>
            </Card>
          )}

          {job.internal_notes && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Internal Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-slate-600">{job.internal_notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Estimate ─────────────────────────────────────── */}
        <TabsContent value="estimate" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Estimate Lines</h2>
              <p className="text-sm text-slate-500">
                Total: <span className="font-semibold text-slate-900">AED {totalEstimate.toFixed(2)}</span>
              </p>
            </div>
            <SendApprovalButton jobId={job.id} />
          </div>
          <EstimateBuilder jobId={job.id} lines={job.estimate_lines ?? []} onUpdate={refreshJob} />
        </TabsContent>

        {/* ── Inspection ─────────────────────────────────────── */}
        <TabsContent value="inspection" className="space-y-4">
          {inspectionDetail ? (
            <InspectionWorkspace inspection={inspectionDetail} onChanged={refreshJob} />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
                <div>
                  <p className="font-medium text-slate-900">No inspection started yet</p>
                  <p className="text-sm text-slate-500">Start an inspection to record technician findings and submit them for review.</p>
                </div>
                <Button onClick={startInspection} disabled={startingInspection}>
                  {startingInspection ? "Starting…" : "Start Inspection"}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Media ─────────────────────────────────────────── */}
        <TabsContent value="media" className="space-y-4">
          <div className="flex justify-end">
            <MediaUploader jobId={job.id} onUploaded={refreshJob} />
          </div>
          {job.media_files && job.media_files.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {job.media_files.map((f) => (
                <div key={f.id} className="overflow-hidden rounded-lg border bg-slate-50">
                  <div className="flex h-32 items-center justify-center text-slate-400 text-3xl">
                    {f.file_type === "photo" ? "📷" : f.file_type === "video" ? "🎬" : "📄"}
                  </div>
                  <div className="border-t px-2 py-1 text-xs text-slate-500 truncate">
                    {f.original_filename || f.id}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-slate-400">No media files yet. Upload photos, videos, or documents for this job.</CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Simple icon fallbacks
function ClipboardIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" />
    </svg>
  );
}

function ImageIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  );
}