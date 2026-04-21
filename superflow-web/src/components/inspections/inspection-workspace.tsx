"use client";

import { useMemo, useState } from "react";
import api from "@/lib/api";
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
import { toast } from "sonner";

function optionsForInputType(inputType?: string) {
  switch (inputType) {
    case "pass_fail":
      return ["pass", "fail"];
    case "yes_no":
    case "toggle":
      return ["yes", "no"];
    case "ok_warn_fail":
    default:
      return ["ok", "warn", "fail"];
  }
}

export function InspectionWorkspace({
  inspection,
  onChanged,
}: {
  inspection: any;
  onChanged: () => void;
}) {
  const responsesMap = useMemo(() => {
    const map: Record<string, any> = {};
    for (const r of inspection?.inspection_responses ?? inspection?.responses ?? []) {
      map[r.item_id] = {
        value: r.value ?? "",
        urgency: r.urgency ?? "none",
        tech_notes: r.tech_notes ?? "",
        media_count: Number(r.media_count ?? 0),
      };
    }
    return map;
  }, [inspection]);

  const [responses, setResponses] = useState<Record<string, any>>(responsesMap);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const setItem = (itemId: string, patch: Record<string, any>) => {
    setResponses((prev) => ({
      ...prev,
      [itemId]: {
        value: "",
        urgency: "none",
        tech_notes: "",
        media_count: 0,
        ...prev[itemId],
        ...patch,
      },
    }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        responses: Object.entries(responses).map(([item_id, r]) => ({
          item_id,
          value: r.value || "",
          urgency: r.urgency || "none",
          tech_notes: r.tech_notes || "",
          media_count: Number(r.media_count ?? 0),
        })),
      };
      await api.put(`/inspections/${inspection.id}/responses`, payload);
      toast.success("Inspection saved");
      onChanged();
    } catch {
      toast.error("Failed to save inspection");
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      await save();
      await api.post(`/inspections/${inspection.id}/submit`, { advisor_note: "Submitted from advisor web app" });
      toast.success("Inspection submitted");
      onChanged();
    } catch {
      toast.error("Failed to submit inspection");
    } finally {
      setSubmitting(false);
    }
  };

  const sections = inspection?.inspection_templates?.inspection_sections ?? [];

  return (
    <div className="space-y-4">
      {sections.length === 0 ? (
        <div className="py-12 text-center text-slate-400">Inspection template has no items yet</div>
      ) : (
        sections.map((section: any) => (
          <Card key={section.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{section.icon ? `${section.icon} ` : ""}{section.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {section.inspection_items?.map((item: any) => {
                const value = responses[item.id] ?? { value: "", urgency: "none", tech_notes: "", media_count: 0 };
                return (
                  <div key={item.id} className="rounded-lg border p-4 space-y-3">
                    <div>
                      <p className="font-medium text-slate-900">{item.label}</p>
                      {item.help_text && <p className="text-sm text-slate-500">{item.help_text}</p>}
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Result</Label>
                        {item.input_type === "number" ? (
                          <Input
                            type="number"
                            value={value.value}
                            onChange={(e) => setItem(item.id, { value: e.target.value })}
                          />
                        ) : item.input_type === "text" ? (
                          <Input
                            value={value.value}
                            onChange={(e) => setItem(item.id, { value: e.target.value })}
                          />
                        ) : (
                          <Select value={value.value || undefined} onValueChange={(v) => setItem(item.id, { value: v ?? "" })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select result" />
                            </SelectTrigger>
                            <SelectContent>
                              {optionsForInputType(item.input_type).map((opt) => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Urgency</Label>
                        <Select value={value.urgency || "none"} onValueChange={(v) => setItem(item.id, { urgency: v ?? "none" })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {['none', 'low', 'medium', 'high', 'critical'].map((opt) => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Technician Notes</Label>
                      <Textarea
                        rows={2}
                        value={value.tech_notes}
                        onChange={(e) => setItem(item.id, { tech_notes: e.target.value })}
                        placeholder="Optional notes"
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={save} disabled={saving || submitting}>
          {saving ? "Saving…" : "Save Inspection"}
        </Button>
        <Button onClick={submit} disabled={saving || submitting}>
          {submitting ? "Submitting…" : "Submit Inspection"}
        </Button>
      </div>
    </div>
  );
}
