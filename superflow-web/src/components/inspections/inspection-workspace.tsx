"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import api, { getApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
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
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MinusCircle,
  Paperclip,
  Trash2,
  Upload,
  X,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ── helpers ── */

function optionsForInputType(inputType?: string) {
  switch (inputType) {
    case "pass_fail":
      return ["pass", "fail"];
    case "yes_no":
    case "toggle":
      return ["yes", "no"];
    case "fuel_level":
      return ["E", "1/4", "1/2", "3/4", "F"];
    case "ok_warn_fail":
    default:
      return ["ok", "warn", "fail"];
  }
}

function isInformationalInputType(inputType?: string) {
  return ["number", "text", "photo", "odometer", "fuel_level"].includes(inputType || "");
}

type TrafficLight = "green" | "amber" | "red" | "none";

function resultToTrafficLight(value: string, inputType?: string): TrafficLight {
  if (!value || isInformationalInputType(inputType)) return "none";
  const v = value.toLowerCase();
  if (["ok", "pass", "yes", "good"].includes(v)) return "green";
  if (["warn", "warning", "medium", "maybe"].includes(v)) return "amber";
  if (["fail", "no", "bad", "critical", "high"].includes(v)) return "red";
  return "none";
}

const LIGHT_STYLES: Record<TrafficLight, { bg: string; border: string; dot: string; icon: typeof CheckCircle2 }> = {
  green: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-300 dark:border-emerald-700",
    dot: "bg-emerald-500",
    icon: CheckCircle2,
  },
  amber: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-300 dark:border-amber-700",
    dot: "bg-amber-500",
    icon: AlertTriangle,
  },
  red: {
    bg: "bg-rose-50 dark:bg-rose-950/40",
    border: "border-rose-300 dark:border-rose-700",
    dot: "bg-rose-500",
    icon: XCircle,
  },
  none: {
    bg: "bg-muted",
    border: "border-border",
    dot: "bg-slate-400 dark:bg-slate-500",
    icon: MinusCircle,
  },
};

const URGENCY_STYLES: Record<string, { chip: string; label: string }> = {
  none: { chip: "bg-muted text-muted-foreground", label: "None" },
  low: { chip: "bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-200", label: "Low" },
  medium: { chip: "bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200", label: "Medium" },
  high: { chip: "bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200", label: "High" },
  critical: { chip: "bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200", label: "Critical" },
};

/* ── media file type ── */
interface MediaFile {
  id: string;
  original_filename?: string;
  file_type?: string;
  url?: string;
  thumbnail_url?: string;
}

/* ── component ── */

export function InspectionWorkspace({
  inspection,
  onChanged,
}: {
  inspection: any;
  onChanged: () => void;
}) {
  const isLocked = ["submitted", "reviewed", "approved"].includes(inspection?.status);
  const responsesMap = useMemo(() => {
    const map: Record<string, any> = {};
    for (const r of inspection?.inspection_responses ?? inspection?.responses ?? []) {
      map[r.item_id] = {
        value: r.value ?? "",
        urgency: r.urgency ?? "none",
        tech_notes: r.tech_notes ?? "",
        media_count: Number(r.media_count ?? 0),
        media_files: (r.media_files ?? []) as MediaFile[],
        response_id: r.id,
      };
    }
    return map;
  }, [inspection]);

  const [responses, setResponses] = useState<Record<string, any>>(responsesMap);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const loadedMediaIds = useRef<Set<string>>(new Set());

  const setItem = (itemId: string, patch: Record<string, any>) => {
    setResponses((prev) => ({
      ...prev,
      [itemId]: {
        value: "",
        urgency: "none",
        tech_notes: "",
        media_count: 0,
        media_files: [],
        response_id: null,
        ...prev[itemId],
        ...patch,
      },
    }));
  };

  // Derive a stable list of media IDs from responses for the effect dependency
  const mediaIdList = useMemo(() => {
    return Object.values(responses)
      .flatMap((r: any) => (r.media_files ?? []).map((m: MediaFile) => m.id))
      .sort()
      .join(",");
  }, [responses]);

  useEffect(() => {
    let cancelled = false;

    const allMedia = Object.values(responses).flatMap((r: any) => r.media_files ?? []) as MediaFile[];
    const photos = allMedia.filter((m) => m.file_type !== "video" && !loadedMediaIds.current.has(m.id));
    if (photos.length === 0) return;

    // Mark as loading immediately to prevent duplicates
    for (const m of photos) loadedMediaIds.current.add(m.id);

    (async () => {
      const next: Record<string, string> = {};
      for (const mf of photos) {
        try {
          const res = await api.get(`/media/${mf.id}/download`, { responseType: "blob" });
          const url = URL.createObjectURL(res.data);
          next[mf.id] = url;
        } catch (err) {
          console.error("Preview load error:", mf.id, err);
          loadedMediaIds.current.delete(mf.id);
        }
      }
      if (!cancelled && Object.keys(next).length > 0) {
        setPreviewUrls((prev) => ({ ...prev, ...next }));
      }
    })();

    return () => { cancelled = true; };
  }, [mediaIdList]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        responses: Object.entries(responses).map(([item_id, r]) => ({
          item_id,
          value: r.value || "",
          urgency: r.urgency || "none",
          tech_notes: r.tech_notes || "",
          media_count: Number(r.media_files?.length ?? r.media_count ?? 0),
        })),
      };
      await api.put(`/inspections/${inspection.id}/responses`, payload);
      toast.success("Inspection saved");
      onChanged();
    } catch (err: any) {
      const { message } = getApiError(err);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    if (isLocked) {
      toast.error("Inspection is already submitted and locked");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        responses: Object.entries(responses).map(([item_id, r]) => ({
          item_id,
          value: r.value || "",
          urgency: r.urgency || "none",
          tech_notes: r.tech_notes || "",
          media_count: Number(r.media_files?.length ?? r.media_count ?? 0),
        })),
      };
      await api.put(`/inspections/${inspection.id}/responses`, payload);
      await api.post(`/inspections/${inspection.id}/submit`, {
        advisor_note: "Submitted from advisor web app",
      });
      toast.success("Inspection submitted");
      onChanged();
    } catch (err: any) {
      const { message } = getApiError(err);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  /* ── media upload ── */
  const handleFileSelect = async (itemId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploadingFor(itemId);

    try {
      const uploadedMedia: MediaFile[] = [];
      let latestResponseId: string | null = responses[itemId]?.response_id ?? null;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("job_id", inspection.job_id);
        formData.append("inspection_id", inspection.id);
        formData.append("item_id", itemId);
        formData.append("file_type", file.type.startsWith("video") ? "video" : "photo");
        formData.append("filename", file.name);
        formData.append("mime_type", file.type);

        const { data } = await api.post("/media/upload-direct", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        uploadedMedia.push(data);
        latestResponseId = data?.inspection_response_id ?? latestResponseId;
      }

      setItem(itemId, {
        response_id: latestResponseId,
        media_files: [
          ...(responses[itemId]?.media_files ?? []),
          ...uploadedMedia.filter((media) => !(responses[itemId]?.media_files ?? []).some((existing: MediaFile) => existing.id === media.id)),
        ],
        media_count: (responses[itemId]?.media_files ?? []).length + uploadedMedia.length,
      });

      toast.success(`${files.length} file${files.length > 1 ? "s" : ""} uploaded`);
    } catch (err: any) {
      console.error('Upload error:', getApiError(err));
      toast.error(`Upload failed: ${getApiError(err).message}`);
    } finally {
      setUploadingFor(null);
      const inputEl = fileInputRefs.current[itemId];
      if (inputEl) inputEl.value = "";
    }
  };

  const removeMedia = async (mediaId: string, itemId: string) => {
    try {
      await api.delete(`/media/${mediaId}`);
      setItem(itemId, {
        media_files: (responses[itemId]?.media_files ?? []).filter(
          (m: MediaFile) => m.id !== mediaId
        ),
        media_count: Math.max(0, (responses[itemId]?.media_count ?? 1) - 1),
      });
      setPreviewUrls((prev) => {
        const next = { ...prev };
        if (next[mediaId]) URL.revokeObjectURL(next[mediaId]);
        delete next[mediaId];
        return next;
      });
      toast.success("Media removed");
    } catch (err: any) {
      console.error('Remove media error:', getApiError(err));
      toast.error(`Failed to remove: ${getApiError(err).message}`);
    }
  };

  const sections =
    inspection?.inspection_templates?.inspection_sections ?? [];

  /* ── summary counts ── */
  const summary = useMemo(() => {
    let green = 0, amber = 0, red = 0, unset = 0;
    for (const section of sections) {
      for (const item of section.inspection_items ?? []) {
        const v = responses[item.id]?.value;
        if (isInformationalInputType(item.input_type)) continue;
        const light = resultToTrafficLight(v || "", item.input_type);
        if (!v) unset++;
        else if (light === "green") green++;
        else if (light === "amber") amber++;
        else if (light === "red") red++;
        else unset++;
      }
    }
    return { green, amber, red, unset };
  }, [responses, sections]);

  return (
    <div className="space-y-4">
      {/* ── summary bar ── */}
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Overview
        </span>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-200">
            <CheckCircle2 className="h-3 w-3" /> {summary.green}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:text-amber-200">
            <AlertTriangle className="h-3 w-3" /> {summary.amber}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 dark:bg-rose-900/50 px-2 py-0.5 text-[11px] font-semibold text-rose-800 dark:text-rose-200">
            <XCircle className="h-3 w-3" /> {summary.red}
          </span>
          {summary.unset > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              <MinusCircle className="h-3 w-3" /> {summary.unset}
            </span>
          )}
        </div>
      </div>

      {sections.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          Inspection template has no items yet
        </div>
      ) : (
        sections.map((section: any) => (
          <div
            key={section.id}
            className="rounded-[18px] border border-border bg-card"
          >
            <div className="border-b border-border px-4 py-3">
              <h3 className="text-[13px] font-semibold text-foreground">
                {section.icon ? `${section.icon} ` : ""}
                {section.name}
              </h3>
            </div>

            <div className="divide-y divide-slate-100">
              {section.inspection_items?.map((item: any) => {
                const value = responses[item.id] ?? {
                  value: "",
                  urgency: "none",
                  tech_notes: "",
                  media_count: 0,
                  media_files: [],
                  response_id: null,
                };
                const light = resultToTrafficLight(value.value, item.input_type);
                const style = LIGHT_STYLES[light];
                const LightIcon = style.icon;
                const mediaFiles: MediaFile[] = value.media_files ?? [];

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "px-4 py-3 transition-colors",
                      style.bg,
                      light !== "none" && style.border.replace("border-", "border-l-2 border-l-").split(" ").find(s => s.startsWith("border-l-")) ? `${style.bg}` : ""
                    )}
                    style={light !== "none" ? { borderLeftWidth: 3, borderLeftStyle: "solid", borderLeftColor: light === "green" ? "#10b981" : light === "amber" ? "#f59e0b" : "#f43f5e" } : undefined}
                  >
                    {/* ── item header ── */}
                    <div className="flex items-start gap-2.5">
                      <LightIcon
                        className={cn(
                          "mt-0.5 h-4 w-4 shrink-0",
                          light === "green" && "text-emerald-500",
                          light === "amber" && "text-amber-500",
                          light === "red" && "text-rose-500",
                          light === "none" && "text-muted-foreground/60"
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-foreground">
                          {item.label}
                        </p>
                        {item.help_text && (
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {item.help_text}
                          </p>
                        )}
                      </div>
                      {value.urgency && value.urgency !== "none" && (
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                            URGENCY_STYLES[value.urgency]?.chip ??
                              "bg-muted text-muted-foreground"
                          )}
                        >
                          {URGENCY_STYLES[value.urgency]?.label ?? value.urgency}
                        </span>
                      )}
                    </div>

                    {/* ── controls row ── */}
                    <div className="mt-2 flex flex-wrap items-end gap-2.5 pl-6">
                      {/* result */}
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Result
                        </Label>
                        {item.input_type === "number" || item.input_type === "odometer" ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              className="h-8 w-28 rounded-lg border-border text-[13px]"
                              placeholder={item.input_type === "odometer" ? "Mileage" : undefined}
                              value={value.value}
                              onChange={(e) =>
                                setItem(item.id, { value: e.target.value })
                              }
                            />
                            {(item.unit || item.input_type === "odometer") && (
                              <span className="text-[11px] font-medium text-muted-foreground">
                                {item.unit || "km"}
                              </span>
                            )}
                          </div>
                        ) : item.input_type === "text" ? (
                          <Input
                            className="h-8 w-40 rounded-lg border-border text-[13px]"
                            value={value.value}
                            onChange={(e) =>
                              setItem(item.id, { value: e.target.value })
                            }
                          />
                        ) : (
                          <Select
                            value={value.value || undefined}
                            onValueChange={(v) =>
                              setItem(item.id, { value: v ?? "" })
                            }
                          >
                            <SelectTrigger className="h-8 w-28 rounded-lg border-border text-[13px]" aria-label="Result">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {optionsForInputType(item.input_type).map(
                                (opt) => (
                                  <SelectItem key={opt} value={opt}>
                                    <span className="flex items-center gap-1.5">
                                      <span
                                        className={cn(
                                          "h-2 w-2 rounded-full",
                                          resultToTrafficLight(opt, item.input_type) === "green"
                                            ? "bg-emerald-500"
                                            : resultToTrafficLight(opt, item.input_type) ===
                                              "amber"
                                            ? "bg-amber-500"
                                            : resultToTrafficLight(opt, item.input_type) ===
                                              "red"
                                            ? "bg-rose-500"
                                            : "bg-muted-foreground"
                                        )}
                                      />
                                      {opt.charAt(0).toUpperCase() +
                                        opt.slice(1)}
                                    </span>
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      {/* urgency */}
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Urgency
                        </Label>
                        <Select
                          value={value.urgency || "none"}
                          onValueChange={(v) =>
                            setItem(item.id, { urgency: v ?? "none" })
                          }
                        >
                          <SelectTrigger className="h-8 w-24 rounded-lg border-border text-[13px]" aria-label="Urgency">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[
                              "none",
                              "low",
                              "medium",
                              "high",
                              "critical",
                            ].map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                <span className="flex items-center gap-1.5">
                                  <span
                                    className={cn(
                                      "h-2 w-2 rounded-full",
                                      URGENCY_STYLES[opt]
                                        ? URGENCY_STYLES[opt].chip.split(" ")[0]
                                        : "bg-muted"
                                    )}
                                  />
                                  {URGENCY_STYLES[opt]?.label ?? opt}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* media upload */}
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Media
                        </Label>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            aria-label="Add media"
                            onClick={() =>
                              fileInputRefs.current[item.id]?.click()
                            }
                            disabled={uploadingFor === item.id}
                            className={cn(
                              "inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-[13px] font-medium text-foreground/80 transition hover:bg-muted",
                              uploadingFor === item.id &&
                                "pointer-events-none opacity-60"
                            )}
                          >
                            {uploadingFor === item.id ? (
                              <Upload className="h-3.5 w-3.5 animate-pulse" />
                            ) : (
                              <Camera className="h-3.5 w-3.5" />
                            )}
                            {mediaFiles.length > 0
                              ? `${mediaFiles.length}`
                              : "Add"}
                          </button>
                          <input
                            ref={(el) => {
                              fileInputRefs.current[item.id] = el;
                            }}
                            type="file"
                            accept="image/*,video/*"
                            multiple
                            className="hidden"
                            onChange={(e) =>
                              handleFileSelect(item.id, e.target.files)
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* ── media thumbnails ── */}
                    {mediaFiles.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5 pl-6">
                        {mediaFiles.map((mf: MediaFile) => (
                          <div
                            key={mf.id}
                            className="group relative h-12 w-12 overflow-hidden rounded-lg border border-border bg-muted"
                          >
                            {mf.file_type === "video" ? (
                              <div className="flex h-full w-full items-center justify-center bg-muted">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                              </div>
                            ) : previewUrls[mf.id] ? (
                              <img
                                src={previewUrls[mf.id]}
                                alt={mf.original_filename ?? "media"}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-muted">
                                <Camera className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => removeMedia(mf.id, item.id)}
                              aria-label="Remove media"
                              className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-white opacity-0 group-hover:opacity-100 transition"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ── tech notes ── */}
                    <div className="mt-2 pl-6">
                      <Textarea
                        rows={1}
                        aria-label="Technician notes"
                        className="rounded-lg border-border text-[13px] placeholder:text-muted-foreground/60"
                        value={value.tech_notes}
                        onChange={(e) =>
                          setItem(item.id, { tech_notes: e.target.value })
                        }
                        placeholder="Notes…"
                        disabled={isLocked}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      <div className="space-y-3">
        {isLocked && (
          <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
            This inspection is already submitted and locked.
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={save}
            disabled={saving || submitting || isLocked}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button
            className="h-9 rounded-lg"
            onClick={submit}
            disabled={saving || submitting || isLocked}
          >
            {submitting ? "Submitting…" : "Submit"}
          </Button>
        </div>
      </div>
    </div>
  );
}