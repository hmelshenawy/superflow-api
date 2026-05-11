"use client";

import { useState, useCallback } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Upload, MapPin, Play, Save, ArrowLeft, ArrowRight, CheckCircle, XCircle, SkipForward, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────

interface ParsedFile {
  headers: string[];
  rows: Record<string, string>[];
  preview: Record<string, string>[];
  totalRows: number;
}

interface ColumnMapping {
  source: string;
  target: string;
}

interface ImportResult {
  total: number;
  created: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

interface Template {
  id: string;
  name: string;
  mappings: ColumnMapping[];
  created_at: string;
}

const TARGET_FIELDS = [
  { value: "_ignore", label: "— Ignore —" },
  { value: "customer_name", label: "Customer Name" },
  { value: "customer_email", label: "Customer Email" },
  { value: "customer_phone", label: "Customer Phone" },
  { value: "vehicle_make", label: "Vehicle Make (optional)" },
  { value: "vehicle_model", label: "Vehicle Model / Description" },
  { value: "vehicle_plate", label: "Plate Number" },
  { value: "vehicle_vin", label: "Chassis/VIN" },
  { value: "job_number", label: "WIP/Job Number" },
  { value: "advisor_id", label: "Owner/Advisor (Code or Name)" },
  { value: "customer_concern", label: "Customer Concern" },
  { value: "promised_at", label: "Promised Time" },
  { value: "dms_ro_number", label: "DMS RO Number" },
];

// Smart auto-mapping: guess which column maps where
function autoMap(headers: string[]): ColumnMapping[] {
  const lower = headers.map((h) => h.toLowerCase().trim());
  return headers.map((header, i) => {
    const h = lower[i];
    let target = "_ignore";

    if (h.includes("customer") && h.includes("name")) target = "customer_name";
    else if (h.includes("name") && !h.includes("make") && !h.includes("model") && !h.includes("operator") && !h.includes("owner")) target = "customer_name";
    else if (h.includes("e-mail") || h.includes("email")) target = "customer_email";
    else if (h.includes("contact") || h.includes("phone")) target = "customer_phone";
    else if (h.includes("plate")) target = "vehicle_plate";
    else if (h.includes("chassis") || h.includes("vin")) target = "vehicle_vin";
    else if (h.includes("make") && h.includes("model")) target = "vehicle_model";
    else if (h.includes("model")) target = "vehicle_model";
    else if (h.includes("make")) target = "vehicle_make";
    else if (h.includes("wip") && !h.includes("created")) target = "job_number";
    else if (h.includes("owner") && !h.includes("created")) target = "advisor_id";
    else if (h.includes("operator") || h.includes("cr.operator")) target = "_ignore";
    else if (h.includes("created") && h.includes("by")) target = "_ignore";
    else if (h.includes("time") || h.includes("i/o")) target = "_ignore";

    return { source: header, target };
  });
}

type Step = "upload" | "mapping" | "result";

export default function BookingImportPage() {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [clearing, setClearing] = useState(false);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [mappingError, setMappingError] = useState<string | null>(null);
  const [resultError, setResultError] = useState<string | null>(null);

  // ─── Step 1: Upload & Parse ──────────────────────────

  const handleFileUpload = useCallback(async () => {
    if (!file) return;
    const ext = file.name.toLowerCase().split(".").pop();
    if (!["xlsx", "csv"].includes(ext || "")) {
      setParseError("Unsupported file type. Please upload .xlsx or .csv. Save old .xls files as .xlsx or .csv first.");
      return;
    }
    setParsing(true);
    setParseError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await api.post<ParsedFile>("/booking-import/parse", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setParsed(data);
      setMappings(autoMap(data.headers));
      setStep("mapping");
    } catch (err: any) {
      const message = err.response?.data?.message || "Failed to parse file";
      setParseError(Array.isArray(message) ? message.join(", ") : message);
      toast.error(message);
    } finally {
      setParsing(false);
    }
  }, [file]);

  // ─── Step 2: Column Mapping ───────────────────────────

  const updateMapping = (index: number, target: string) => {
    setMappings((prev) => prev.map((m, i) => (i === index ? { ...m, target } : m)));
  };

  const applyTemplate = async (templateId: string) => {
    if (!templateId) return;
    setSelectedTemplateId(templateId);
    setMappingError(null);
    try {
      const { data } = await api.get<Template>(`/booking-import/templates/${templateId}`);
      // Apply template mappings by matching source header names
      const templateMap = new Map((data.mappings as ColumnMapping[]).map((m) => [m.source, m.target]));
      setMappings((prev) =>
        prev.map((m) => {
          const mapped = templateMap.get(m.source);
          return mapped ? { ...m, target: mapped } : m;
        })
      );
      toast.success(`Applied template: ${data.name}`);
    } catch (err: any) {
      const message = err?.response?.data?.message || "Failed to load template";
      setMappingError(Array.isArray(message) ? message.join(", ") : message);
      toast.error(message);
    }
  };

  const saveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error("Enter a template name");
      return;
    }
    setSavingTemplate(true);
    setMappingError(null);
    try {
      await api.post("/booking-import/templates", {
        name: templateName.trim(),
        mappings: mappings.filter((m) => m.target !== "_ignore"),
      });
      toast.success("Template saved!");
      setTemplateName("");
      loadTemplates();
    } catch (err: any) {
      const message = err?.response?.data?.message || "Failed to save template";
      setMappingError(Array.isArray(message) ? message.join(", ") : message);
      toast.error(message);
    } finally {
      setSavingTemplate(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const { data } = await api.get<Template[]>("/booking-import/templates");
      setTemplates(data);
    } catch { /* ignore */ }
  };

  const deleteTemplate = async (templateId: string, templateName: string) => {
    if (!confirm(`Delete template "${templateName}"? This cannot be undone.`)) return;
    setDeletingTemplateId(templateId);
    setMappingError(null);
    try {
      await api.delete(`/booking-import/templates/${templateId}`);
      toast.success(`Template "${templateName}" deleted`);
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
      if (selectedTemplateId === templateId) setSelectedTemplateId("");
    } catch (err: any) {
      const message = err?.response?.data?.message || "Failed to delete template";
      setMappingError(Array.isArray(message) ? message.join(", ") : message);
      toast.error(message);
    } finally {
      setDeletingTemplateId(null);
    }
  };

  // ─── Step 3: Run Import ──────────────────────────────

  const runImport = async () => {
    if (!parsed) return;
    setImporting(true);
    setMappingError(null);
    setResultError(null);
    try {
      const { data } = await api.post<ImportResult>("/booking-import/run", {
        mappings: mappings.filter((m) => m.target !== "_ignore"),
        rows: parsed.rows,
      });
      setResult(data);
      setStep("result");
      if (data.created > 0) toast.success(`Imported ${data.created} bookings!`);
    } catch (err: any) {
      const message = err.response?.data?.message || "Import failed";
      setMappingError(Array.isArray(message) ? message.join(", ") : message);
      toast.error(message);
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setStep("upload");
    setFile(null);
    setParsed(null);
    setMappings([]);
    setResult(null);
    setParseError(null);
    setMappingError(null);
    setResultError(null);
  };

  const clearAllJobs = async () => {
    if (!confirm("This will delete all jobs still in 'Booked' status only. Jobs that have progressed (checking, estimate, etc.) will NOT be affected. Continue?")) return;
    setClearing(true);
    setResultError(null);
    try {
      const { data } = await api.delete<{ deleted: number }>("/jobs");
      toast.success(`Cleared ${data.deleted} booked jobs`);
    } catch (err: any) {
      const message = err.response?.data?.message || "Failed to clear jobs";
      setResultError(Array.isArray(message) ? message.join(", ") : message);
      toast.error(message);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Booking Import</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload your daily booking table and import it into PrioraFlow
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(step === "mapping" || step === "result") && (
            <Button variant="outline" onClick={reset} disabled={parsing || importing}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              New Import
            </Button>
          )}
          <Button variant="destructive" size="sm" onClick={clearAllJobs} disabled={clearing || parsing || importing}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            {clearing ? "Clearing…" : "Clear Booked Jobs"}
          </Button>
        </div>
      </div>

      {resultError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{resultError}</div>
      )}

      {/* Step indicators */}
      <div className="flex items-center gap-2 text-sm">
        {(["upload", "mapping", "result"] as Step[]).map((s, i) => {
          const labels = ["Upload", "Map Columns", "Result"];
          const icons = [Upload, MapPin, Play];
          const Icon = icons[i];
          const active = step === s;
          const done =
            (s === "upload" && step !== "upload") ||
            (s === "mapping" && step === "result");
          return (
            <div key={s} className="flex items-center gap-1">
              {i > 0 && <ArrowRight className="h-3 w-3 text-slate-300" />}
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded ${
                  active
                    ? "bg-blue-100 text-blue-700 font-medium"
                    : done
                    ? "bg-green-50 text-green-600"
                    : "text-muted-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {labels[i]}
              </div>
            </div>
          );
        })}
      </div>

      {/* Step 1: Upload */}
      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Booking File</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-2">
                Drop an Excel or CSV file here, or click to browse
              </p>
              <div className="mx-auto mb-4 flex max-w-sm items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-left text-xs text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Supported formats are .xlsx and .csv. If you have an old .xls file, open it in Excel and save it as .xlsx or .csv before uploading.
                </p>
              </div>
              <Input
                type="file"
                accept=".xlsx,.csv"
                onChange={(e) => {
                  const selected = e.target.files?.[0] || null;
                  setFile(selected);
                  setParseError(null);
                  if (selected) {
                    const ext = selected.name.toLowerCase().split(".").pop();
                    if (!["xlsx", "csv"].includes(ext || "")) {
                      setParseError("Unsupported file type. Please upload .xlsx or .csv. Save old .xls files as .xlsx or .csv first.");
                    }
                  }
                }}
                className="max-w-sm mx-auto"
              />
            </div>
            {parseError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{parseError}</div>
            )}
            {file && (
              <div className="flex items-center justify-between bg-muted rounded p-3">
                <span className="text-sm font-medium">{file.name}</span>
                <Button onClick={handleFileUpload} disabled={parsing || !!parseError}>
                  {parsing ? "Parsing…" : "Parse & Continue"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Column Mapping */}
      {step === "mapping" && parsed && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Map Columns</span>
              <Badge variant="secondary">{parsed.totalRows} rows</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mappingError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{mappingError}</div>
            )}
            {/* Template section */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Saved Templates
              </label>
              <Button
                variant="outline"
                size="sm"
                onClick={loadTemplates}
                disabled={savingTemplate || importing}
              >
                Load Templates
              </Button>
              {templates.length === 0 && (
                <p className="text-xs text-muted-foreground">No saved templates loaded yet.</p>
              )}
              {templates.length > 0 && (
                <div className="space-y-1.5 mt-2">
                  {templates.map((t) => (
                    <div
                      key={t.id}
                      className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 transition-colors ${
                        selectedTemplateId === t.id
                          ? "border-blue-300 bg-blue-50 dark:border-blue-800/40 dark:bg-blue-950/30"
                          : "border-border bg-card hover:bg-muted"
                      }`}
                    >
                      <button
                        type="button"
                        className="flex-1 text-left text-sm font-medium truncate"
                        onClick={() => applyTemplate(t.id)}
                        disabled={importing || savingTemplate}
                        title={`Apply template: ${t.name}`}
                      >
                        {t.name}
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-red-500"
                        onClick={() => deleteTemplate(t.id, t.name)}
                        disabled={deletingTemplateId === t.id || importing}
                        title="Delete template"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Mapping table */}
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/4">Source Column</TableHead>
                    <TableHead className="w-1/4">Maps To</TableHead>
                    {parsed.preview.length > 0 &&
                      parsed.preview.slice(0, 3).map((_, pi) => (
                        <TableHead key={pi} className="text-xs text-muted-foreground">
                          Preview {pi + 1}
                        </TableHead>
                      ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsed.headers.map((header, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{header}</TableCell>
                      <TableCell>
                        <Select
                          value={mappings[i]?.target || "_ignore"}
                          onValueChange={(v) => v && updateMapping(i, v)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TARGET_FIELDS.map((f) => (
                              <SelectItem key={f.value} value={f.value}>
                                {f.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      {parsed.preview.map((row, pi) => (
                        <TableCell key={pi} className="text-xs text-muted-foreground truncate max-w-[150px]">
                          {row[header] || "—"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Save template */}
            <div className="flex items-end gap-2 pt-2 border-t">
              <Input
                placeholder="Template name (e.g. Gargash-DXB)"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="max-w-xs"
              />
              <Button variant="outline" size="sm" onClick={saveTemplate} disabled={savingTemplate}>
                <Save className="mr-1 h-3.5 w-3.5" />
                {savingTemplate ? "Saving…" : "Save Template"}
              </Button>
            </div>

            {/* Import button */}
            <div className="flex justify-end pt-2">
              <Button onClick={runImport} disabled={importing || mappings.every((m) => m.target === "_ignore")} size="lg">
                <Play className="mr-2 h-4 w-4" />
                {importing ? "Importing…" : `Import ${parsed.totalRows} Rows`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Result */}
      {step === "result" && result && (
        <Card>
          <CardHeader>
            <CardTitle>Import Complete</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <CheckCircle className="mx-auto h-8 w-8 text-green-500 mb-2" />
                <div className="text-2xl font-bold text-green-700">{result.created}</div>
                <div className="text-sm text-green-600">Created</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <SkipForward className="mx-auto h-8 w-8 text-yellow-500 mb-2" />
                <div className="text-2xl font-bold text-yellow-700">{result.skipped}</div>
                <div className="text-sm text-yellow-600">Skipped (duplicates)</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <XCircle className="mx-auto h-8 w-8 text-red-500 mb-2" />
                <div className="text-2xl font-bold text-red-700">{result.errors.length}</div>
                <div className="text-sm text-red-600">Errors</div>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="border rounded-lg overflow-x-auto">
                <div className="bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
                  Errors
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.errors.map((err, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono">Row {err.row}</TableCell>
                        <TableCell className="text-red-600">{err.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={reset}>
                Import Another File
              </Button>
              <Button onClick={() => (window.location.href = "/jobs")}>
                View Jobs
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
