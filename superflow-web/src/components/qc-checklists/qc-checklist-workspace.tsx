"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import api, { getApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  Camera,
  Upload,
  X,
  ShieldCheck,
  RotateCcw,
  Save,
  Send,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { QcChecklist, QcChecklistItem, QcChecklistResponse } from "@/types";

/* ── helpers ── */

function optionsForInputType(inputType?: string | null) {
  switch (inputType) {
    case "pass_fail": return ["pass", "fail"];
    case "yes_no": return ["yes", "no"];
    case "ok_fail": return ["ok", "fail"];
    default: return [];
  }
}

type TrafficLight = "green" | "red" | "none";

function resultToTrafficLight(value: string | null | undefined): TrafficLight {
  if (!value) return "none";
  const v = value.toLowerCase();
  if (["ok", "pass", "yes", "good"].includes(v)) return "green";
  if (["fail", "no", "bad"].includes(v)) return "red";
  return "none";
}

const LIGHT_STYLES: Record<TrafficLight, { bg: string; border: string; dot: string; icon: typeof CheckCircle2 }> = {
  green: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-300 dark:border-emerald-700",
    dot: "bg-emerald-500",
    icon: CheckCircle2,
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

/* ── media file type ── */
interface MediaFileRef {
  id: string;
  original_filename?: string;
  file_type?: string;
  url?: string;
}

/* ── component ── */

export function QcChecklistWorkspace({
  checklist,
  onChanged,
}: {
  checklist: QcChecklist;
  onChanged: () => void;
}) {
  const isLocked = ["submitted", "approved"].includes(checklist?.status || "");
  const overallResult = checklist?.overall_result;

  const template = checklist?.qc_checklist_templates;
  const sections = template?.qc_checklist_sections ?? [];

  const responsesMap = useMemo(() => {
    const map: Record<string, any> = {};
    for (const r of (checklist?.qc_checklist_responses ?? []) as QcChecklistResponse[]) {
      map[r.item_id!] = {
        value: r.value ?? "",
        notes: r.notes ?? "",
        media_count: Number(r.media_count ?? 0),
        media_files: (r as any).media_files ?? [],
        response_id: r.id,
      };
    }
    return map;
  }, [checklist]);

  const [responses, setResponses] = useState<Record<string, any>>(responsesMap);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const setItem = (itemId: string, patch: Record<string, any>) => {
    setResponses((prev) => ({
      ...prev,
      [itemId]: {
        value: "",
        notes: "",
        media_count: 0,
        media_files: [],
        response_id: null,
        ...prev[itemId],
        ...patch,
      },
    }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        responses: Object.entries(responses).map(([item_id, r]: [string, any]) => ({
          item_id,
          value: r.value || "",
          notes: r.notes || "",
          media_count: Number(r.media_files?.length ?? r.media_count ?? 0),
        })),
      };
      await api.put(`/qc-checklists/${checklist.id}/responses`, payload);
      toast.success("QC checklist saved");
      onChanged();
    } catch (err: any) {
      toast.error(getApiError(err).message);
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    if (isLocked) {
      toast.error("QC checklist is already submitted and locked");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        responses: Object.entries(responses).map(([item_id, r]: [string, any]) => ({
          item_id,
          value: r.value || "",
          notes: r.notes || "",
          media_count: Number(r.media_files?.length ?? r.media_count ?? 0),
        })),
      };
      await api.put(`/qc-checklists/${checklist.id}/responses`, payload);
      await api.post(`/qc-checklists/${checklist.id}/submit`, { notes: "" });
      toast.success("QC checklist submitted");
      onChanged();
    } catch (err: any) {
      toast.error(getApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  };

  /* ── media upload ── */
  const handleFileSelect = async (itemId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingFor(itemId);
    try {
      const uploaded: MediaFileRef[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("job_id", checklist.job_id || "");
        formData.append("qc_checklist_response_id", responses[itemId]?.response_id || "");
        formData.append("file_type", file.type.startsWith("video") ? "video" : "photo");
        const { data } = await api.post("/media/upload-direct", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        uploaded.push(data);
      }
      setItem(itemId, {
        media_files: [...(responses[itemId]?.media_files ?? []), ...uploaded],
        media_count: (responses[itemId]?.media_files ?? []).length + uploaded.length,
      });
      toast.success(`${files.length} file${files.length > 1 ? "s" : ""} uploaded`);
    } catch (err: any) {
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
        media_files: (responses[itemId]?.media_files ?? []).filter((m: MediaFileRef) => m.id !== mediaId),
        media_count: Math.max(0, (responses[itemId]?.media_count ?? 1) - 1),
      });
      toast.success("Media removed");
    } catch (err: any) {
      toast.error(getApiError(err).message);
    }
  };

  const viewMedia = async (mediaId: string) => {
    try {
      const res = await api.get(`/media/${mediaId}/download`, { responseType: "blob" });
      const blobUrl = URL.createObjectURL(res.data);
      window.open(blobUrl, "_blank");
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (err: any) {
      toast.error(`Failed to open: ${getApiError(err).message}`);
    }
  };

  /* ── render ── */
  return (
    <div className="space-y-6">
      {/* Overall result banner */}
      {overallResult && (
        <div className={cn(
          "rounded-xl border p-4 text-center font-semibold",
          overallResult === "pass" ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200" :
          overallResult === "fail" ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-200" :
          "border-border bg-muted text-muted-foreground"
        )}>
          <ShieldCheck className="mr-2 inline-block h-5 w-5" />
          QC Result: {overallResult === "pass" ? "PASSED" : overallResult === "fail" ? "FAILED" : "N/A"}
        </div>
      )}

      {/* Sections */}
      {sections
        .filter((s) => s.is_active !== false)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((section) => {
          const items = section.qc_checklist_items
            .filter((i) => i.is_active !== false)
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

          return (
            <div key={section.id} className="rounded-2xl border border-border bg-card shadow-sm">
              <div className="border-b border-border px-4 py-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  {section.icon && <span className="mr-2">{section.icon}</span>}
                  {section.name || "Section"}
                </h3>
              </div>
              <div className="divide-y divide-border">
                {items.map((item) => {
                  const resp = responses[item.id] || {};
                  const traffic = resultToTrafficLight(resp.value);
                  const light = LIGHT_STYLES[traffic];
                  const LightIcon = light.icon;
                  const options = optionsForInputType(item.input_type);
                  const isPhoto = item.input_type === "photo";
                  const isText = item.input_type === "text";
                  const showNoteRequired = item.requires_note_on_fail && resp.value?.toLowerCase() === "fail";

                  return (
                    <div key={item.id} className={cn("px-4 py-3", light.bg)}>
                      <div className="flex items-start gap-3">
                        {/* Traffic light dot */}
                        <div className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", light.dot)} />

                        <div className="min-w-0 flex-1">
                          {/* Label */}
                          <p className="text-sm font-medium text-foreground">{item.label}</p>
                          {item.help_text && (
                            <p className="mt-0.5 text-xs text-muted-foreground">{item.help_text}</p>
                          )}

                          {/* Input controls */}
                          {!isLocked && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {isPhoto ? (
                                <>
                                  <input
                                    ref={(el) => { fileInputRefs.current[item.id] = el; }}
                                    type="file"
                                    accept="image/*,video/*"
                                    className="hidden"
                                    onChange={(e) => handleFileSelect(item.id, e.target.files)}
                                  />
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="rounded-xl text-xs"
                                    onClick={() => fileInputRefs.current[item.id]?.click()}
                                    disabled={uploadingFor === item.id}
                                  >
                                    <Camera className="mr-1 h-3.5 w-3.5" />
                                    {uploadingFor === item.id ? "Uploading..." : "Add Photo"}
                                  </Button>
                                </>
                              ) : isText ? (
                                <Textarea
                                  className="mt-1 rounded-xl text-sm"
                                  rows={2}
                                  placeholder="Enter notes..."
                                  value={resp.value || ""}
                                  onChange={(e) => setItem(item.id, { value: e.target.value })}
                                />
                              ) : (
                                options.map((opt) => {
                                  const optTraffic = resultToTrafficLight(opt);
                                  const optLight = LIGHT_STYLES[optTraffic];
                                  const OptIcon = optLight.icon;
                                  return (
                                    <button
                                      key={opt}
                                      type="button"
                                      className={cn(
                                        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition",
                                        resp.value === opt
                                          ? `${optLight.bg} ${optLight.border} text-foreground shadow-sm`
                                          : "border-border bg-background text-muted-foreground hover:bg-muted"
                                      )}
                                      onClick={() => setItem(item.id, { value: opt })}
                                    >
                                      <OptIcon className="h-3.5 w-3.5" />
                                      {opt}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          )}

                          {/* Locked display */}
                          {isLocked && !isPhoto && !isText && resp.value && (
                            <div className={cn("mt-2 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-medium capitalize", light.bg, light.border)}>
                              <LightIcon className="h-3.5 w-3.5" />
                              {resp.value}
                            </div>
                          )}

                          {/* Note field */}
                          {(!isLocked || resp.notes) && (
                            <div className="mt-2">
                              <Textarea
                                className="rounded-xl text-xs"
                                rows={2}
                                placeholder={showNoteRequired ? "Note required for failed item" : "Notes..."}
                                value={resp.notes || ""}
                                onChange={(e) => setItem(item.id, { notes: e.target.value })}
                                disabled={isLocked}
                              />
                            </div>
                          )}

                          {/* Media thumbnails */}
                          {resp.media_files?.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {resp.media_files.map((mf: MediaFileRef) => (
                                <div key={mf.id} className="group relative h-16 w-16 overflow-hidden rounded-lg border border-border cursor-pointer" onClick={() => viewMedia(mf.id)}>
                                  {mf.url ? (
                                    <img src={mf.url} alt={mf.original_filename || "media"} className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                                      <Camera className="h-4 w-4" />
                                    </div>
                                  )}
                                  {/* Hover overlay with view + delete */}
                                  <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/40 opacity-0 group-hover:opacity-100 transition">
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); viewMedia(mf.id); }}
                                      className="rounded-full bg-card p-1 text-foreground shadow hover:bg-muted"
                                      aria-label="Open file"
                                      title="Open file"
                                    >
                                      <Eye className="h-3 w-3" />
                                    </button>
                                    {!isLocked && (
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); removeMedia(mf.id, item.id); }}
                                        className="rounded-full bg-card p-1 text-red-600 shadow hover:bg-red-50"
                                        aria-label="Remove media"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        {!isLocked ? (
          <>
            <Button onClick={save} disabled={saving || submitting} className="rounded-xl bg-slate-950 px-4 text-white hover:bg-slate-800">
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button onClick={submit} disabled={saving || submitting} className="rounded-xl bg-emerald-600 px-4 text-white hover:bg-emerald-700">
              <Send className="mr-2 h-4 w-4" />
              {submitting ? "Submitting..." : "Submit QC Checklist"}
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            This QC checklist is locked. Re-open it to continue editing.
          </p>
        )}
      </div>
    </div>
  );
}