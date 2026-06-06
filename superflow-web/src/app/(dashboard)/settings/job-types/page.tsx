"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import api, { getApiError } from "@/lib/api";
import type { JobType, JobTypeTemplate } from "@/types/appointments";
import { formatDuration } from "@/utils/appointments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, ChevronDown, ChevronRight, Plus, Trash2, Pencil, X } from "lucide-react";
import { toast } from "sonner";

type TemplateGroups = Record<string, JobTypeTemplate[]>;

export default function JobTypesSettingsPage() {
  const [templates, setTemplates] = useState<TemplateGroups>({});
  const [jobTypes, setJobTypes] = useState<JobType[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<Partial<JobType>>({});
  // Inline add per category — category name means "show add form for this category"
  const [addingToCategory, setAddingToCategory] = useState<string | null>(null);
  const [custom, setCustom] = useState({ name: "", category: "", duration_min: 60, color_hex: "#888780", description: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [templateRes, jobTypeRes, catRes] = await Promise.all([
        api.get<TemplateGroups>("/job-types/templates"),
        api.get<JobType[]>("/job-types"),
        api.get<string[]>("/job-types/categories"),
      ]);
      setTemplates(templateRes.data || {});
      setJobTypes(jobTypeRes.data || []);
      setCategories(catRes.data || []);
    } catch (err) {
      toast.error(getApiError(err).message);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const importedTemplateIds = useMemo(() => new Set(jobTypes.map((item) => item.template_id).filter(Boolean)), [jobTypes]);

  const importTemplates = async (ids: string[]) => {
    if (!ids.length) return;
    setSavingIds((prev) => new Set([...prev, ...ids]));
    try {
      const { data } = await api.post<JobType[]>("/job-types/import", { template_ids: ids });
      setJobTypes((prev) => [...prev, ...(data || [])]);
      toast.success("Job types imported");
    } catch (err) {
      toast.error(getApiError(err).message);
      await load();
    } finally {
      setSavingIds((prev) => { const next = new Set(prev); ids.forEach((id) => next.delete(id)); return next; });
    }
  };

  const patchJobType = async (id: string, patch: Partial<JobType>) => {
    const previous = jobTypes;
    setJobTypes((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
    try { const { data } = await api.patch<JobType>(`/job-types/${id}`, patch); setJobTypes((items) => items.map((item) => item.id === id ? data : item)); }
    catch (err) { setJobTypes(previous); toast.error(getApiError(err).message); }
  };

  const deleteJobType = async (id: string) => {
    try { await api.delete(`/job-types/${id}`); setJobTypes((items) => items.filter((item) => item.id !== id)); setConfirmDeleteId(null); }
    catch (err) { toast.error(getApiError(err).message); }
  };

  const addCustom = async (categoryOverride?: string) => {
    const payload = { ...custom, category: categoryOverride || custom.category || "Custom" };
    if (!payload.name.trim()) { toast.error("Name is required"); return; }
    try {
      const { data } = await api.post<JobType>("/job-types", payload);
      setJobTypes((prev) => [...prev, data]);
      setCustom({ name: "", category: "", duration_min: 60, color_hex: "#888780", description: "" });
      setAddingToCategory(null);
      const catRes = await api.get<string[]>("/job-types/categories");
      setCategories(catRes.data || []);
    } catch (err) { toast.error(getApiError(err).message); }
  };

  const openAddForCategory = (cat: string) => {
    setAddingToCategory(cat);
    setCustom({ name: "", category: cat, duration_min: 60, color_hex: "#888780", description: "" });
  };

  // Group job types by category — must be before any early returns (hooks rule)
  const grouped = useMemo(() => jobTypes.reduce((acc, jt) => {
    const cat = jt.category || jt.job_type_templates?.category || "Custom";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(jt);
    return acc;
  }, {} as Record<string, JobType[]>), [jobTypes]);

  // All categories: from templates + custom types
  const allCategories = useMemo(() => {
    const catSet = new Set([...Object.keys(templates), ...Object.keys(grouped)]);
    return [...catSet].sort();
  }, [templates, grouped]);

  if (loading) return <div className="space-y-4"><Skeleton className="h-6 w-48" /><Skeleton className="h-40 w-full" /></div>;

  return (
    <div className="space-y-6">
      {/* Template Library */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Template Library</h3>
        <div className="space-y-1">
          {Object.entries(templates).map(([category, items]) => {
            const open = !collapsed.has(category);
            const unimported = items.filter((item) => !importedTemplateIds.has(item.id));
            const importedCount = items.length - unimported.length;
            return (
              <div key={category} className="rounded-lg border border-border overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
                  onClick={() => setCollapsed((prev) => { const next = new Set(prev); next.has(category) ? next.delete(category) : next.add(category); return next; })}
                >
                  <span className="flex items-center gap-2">
                    {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                    {category}
                    <span className="text-xs text-muted-foreground">{importedCount}/{items.length} imported</span>
                  </span>
                  {unimported.length > 0 && (
                    <span
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      onClick={(e) => { e.stopPropagation(); importTemplates(unimported.map((item) => item.id)); }}
                    >
                      Import all
                    </span>
                  )}
                </button>
                {open && (
                  <div className="border-t border-border px-3 py-2 bg-muted/20">
                    <div className="flex flex-wrap gap-2">
                      {items.map((template) => {
                        const imported = importedTemplateIds.has(template.id);
                        return (
                          <div
                            key={template.id}
                            className={`inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs border transition-colors ${
                              imported ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950" : "border-border bg-card hover:border-blue-300 dark:hover:border-blue-700 cursor-pointer"
                            }`}
                            onClick={imported ? undefined : () => importTemplates([template.id])}
                          >
                            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: template.color_hex }} />
                            <span className="font-medium">{template.name}</span>
                            <span className="text-muted-foreground">{formatDuration(template.default_duration_min)}</span>
                            {imported ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : savingIds.has(template.id) ? <span className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Your Job Types — grouped by category, each with its own + button */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Your Job Types ({jobTypes.length})</h3>
          <Button size="sm" variant="outline" onClick={() => openAddForCategory("")}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        </div>

        {jobTypes.length === 0 && !addingToCategory && allCategories.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-8 border border-dashed border-border rounded-lg">
            No job types yet. Import from templates above or add a custom type.
          </div>
        )}

        {allCategories.map((cat) => (
          <div key={cat} className="mb-4">
            {/* Category header with + button */}
            <div className="flex items-center gap-2 mb-1.5 px-1">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{cat}</h4>
              <button
                className="inline-flex items-center justify-center h-5 w-5 rounded-md border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                onClick={() => openAddForCategory(cat)}
                title={`Add to ${cat}`}
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>

            {/* Inline add form for this category */}
            {addingToCategory === cat && (
              <div className="mb-2 rounded-lg border border-dashed border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/20 p-3 space-y-2">
                <div className="grid grid-cols-[1fr_80px_48px] gap-2 items-center">
                  <Input placeholder="Name" className="h-8 text-sm" value={custom.name} onChange={(e) => setCustom((p) => ({ ...p, name: e.target.value }))} autoFocus />
                  <Input type="number" min={1} className="h-8 text-sm" placeholder="Min" value={custom.duration_min} onChange={(e) => setCustom((p) => ({ ...p, duration_min: Number(e.target.value) }))} />
                  <input type="color" className="h-8 w-10 rounded cursor-pointer" value={custom.color_hex} onChange={(e) => setCustom((p) => ({ ...p, color_hex: e.target.value }))} />
                </div>
                <Textarea placeholder="Description (optional)" className="text-sm min-h-[36px]" value={custom.description} onChange={(e) => setCustom((p) => ({ ...p, description: e.target.value }))} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => addCustom(cat)}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setAddingToCategory(null)}>Cancel</Button>
                </div>
              </div>
            )}

            {/* Job type rows */}
            <div className="space-y-0.5">
              {(grouped[cat] || []).map((jt) => {
                const editing = editingId === jt.id;
                const isDeleting = confirmDeleteId === jt.id;

                if (editing) {
                  return (
                    <div key={jt.id} className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/20 p-3 space-y-2">
                      <div className="grid grid-cols-[1fr_140px_80px_48px] gap-2 items-center">
                        <Input className="h-8 text-sm" value={edit.name || ""} onChange={(e) => setEdit((p) => ({ ...p, name: e.target.value }))} placeholder="Name" />
                        <select
                          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                          value={edit.category || cat}
                          onChange={(e) => setEdit((p) => ({ ...p, category: e.target.value }))}
                        >
                          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <Input type="number" min={1} className="h-8 text-sm" value={edit.duration_min || jt.duration_min} onChange={(e) => setEdit((p) => ({ ...p, duration_min: Number(e.target.value) }))} />
                        <input type="color" className="h-8 w-10 rounded cursor-pointer" value={edit.color_hex || jt.color_hex} onChange={(e) => setEdit((p) => ({ ...p, color_hex: e.target.value }))} />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => { patchJobType(jt.id, edit); setEditingId(null); }}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={jt.id}
                    className={`group flex items-center gap-3 rounded-lg px-3 py-2 border transition-colors ${
                      isDeleting ? "border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20" : "border-transparent hover:border-border hover:bg-muted/30"
                    }`}
                  >
                    <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: jt.color_hex }} />
                    <span className="font-medium text-sm flex-1 min-w-0 truncate">{jt.name}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{formatDuration(jt.duration_min)}</span>
                    <button
                      className={`h-5 w-8 rounded flex items-center justify-center text-[10px] font-semibold ${
                        jt.is_active !== false ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                      }`}
                      onClick={() => patchJobType(jt.id, { is_active: jt.is_active === false })}
                    >
                      {jt.is_active !== false ? "On" : "Off"}
                    </button>

                    {isDeleting ? (
                      <div className="flex gap-1">
                        <button className="text-xs text-red-600 dark:text-red-400 font-medium hover:underline" onClick={() => deleteJobType(jt.id)}>Delete</button>
                        <button className="text-xs text-muted-foreground hover:underline" onClick={() => setConfirmDeleteId(null)}>Keep</button>
                      </div>
                    ) : (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1 rounded hover:bg-muted" onClick={() => { setEditingId(jt.id); setEdit(jt); }} title="Edit"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
                        <button className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950" onClick={() => setConfirmDeleteId(jt.id)} title="Delete"><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Ungrouped "Add new" — when clicking the top-level Add button with no category */}
        {addingToCategory === "" && (
          <div className="mb-3 rounded-lg border border-dashed border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/20 p-3 space-y-2">
            <div className="grid grid-cols-[1fr_160px_80px_48px] gap-2 items-center">
              <Input placeholder="Name" className="h-8 text-sm" value={custom.name} onChange={(e) => setCustom((p) => ({ ...p, name: e.target.value }))} autoFocus />
              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                value={custom.category}
                onChange={(e) => setCustom((p) => ({ ...p, category: e.target.value }))}
              >
                <option value="">Category...</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <Input type="number" min={1} className="h-8 text-sm" value={custom.duration_min} onChange={(e) => setCustom((p) => ({ ...p, duration_min: Number(e.target.value) }))} />
              <input type="color" className="h-8 w-10 rounded cursor-pointer" value={custom.color_hex} onChange={(e) => setCustom((p) => ({ ...p, color_hex: e.target.value }))} />
            </div>
            <Textarea placeholder="Description (optional)" className="text-sm min-h-[36px]" value={custom.description} onChange={(e) => setCustom((p) => ({ ...p, description: e.target.value }))} />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => addCustom()}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setAddingToCategory(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}