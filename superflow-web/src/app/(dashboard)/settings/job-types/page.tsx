"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import api, { getApiError } from "@/lib/api";
import type { JobType, JobTypeTemplate } from "@/types/appointments";
import { formatDuration } from "@/utils/appointments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type TemplateGroups = Record<string, JobTypeTemplate[]>;

export default function JobTypesSettingsPage() {
  const [templates, setTemplates] = useState<TemplateGroups>({});
  const [jobTypes, setJobTypes] = useState<JobType[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<Partial<JobType>>({});
  const [customOpen, setCustomOpen] = useState(false);
  const [custom, setCustom] = useState({ name: "", category: "Custom", duration_min: 60, color_hex: "#888780", description: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [templateRes, jobTypeRes] = await Promise.all([api.get<TemplateGroups>("/job-types/templates"), api.get<JobType[]>("/job-types")]);
      setTemplates(templateRes.data || {});
      setJobTypes(jobTypeRes.data || []);
    } catch (err) {
      toast.error(getApiError(err).message);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const importedTemplateIds = useMemo(() => new Set(jobTypes.map((item) => item.template_id).filter(Boolean)), [jobTypes]);
  const categories = useMemo(() => Array.from(new Set([...Object.keys(templates), ...jobTypes.map((jt) => jt.category || jt.job_type_templates?.category || "Custom")])).sort(), [jobTypes, templates]);

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

  const addCustom = async () => {
    if (!custom.name.trim()) { toast.error("Name is required"); return; }
    try { const { data } = await api.post<JobType>("/job-types", custom); setJobTypes((prev) => [...prev, data]); setCustom({ name: "", category: "Custom", duration_min: 60, color_hex: "#888780", description: "" }); setCustomOpen(false); }
    catch (err) { toast.error(getApiError(err).message); }
  };

  if (loading) return <div className="space-y-6 p-6"><Skeleton className="h-8 w-64" /><Skeleton className="h-96 w-full" /></div>;

  return <div className="space-y-8 p-4 md:p-6"><div><h1 className="text-2xl font-bold">Job types</h1><p className="text-sm text-muted-foreground">Configure appointment job templates and custom work types.</p></div>
    <section className="rounded-2xl border border-border bg-card p-5"><h2 className="mb-4 text-lg font-semibold">Template library</h2><div className="space-y-4">{Object.entries(templates).map(([category, items]) => { const open = !collapsed.has(category); const unimported = items.filter((item) => !importedTemplateIds.has(item.id)); return <div key={category} className="rounded-xl border border-border"><div className="flex items-center justify-between gap-3 border-b border-border p-3"><button className="inline-flex items-center gap-2 font-semibold" onClick={() => setCollapsed((prev) => { const next = new Set(prev); next.has(category) ? next.delete(category) : next.add(category); return next; })}>{open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}{category}</button><Button size="sm" variant="outline" disabled={!unimported.length} onClick={() => importTemplates(unimported.map((item) => item.id))}>Import all</Button></div>{open && <div className="grid gap-3 p-3 md:grid-cols-3 xl:grid-cols-4">{items.map((template) => { const imported = importedTemplateIds.has(template.id); return <div key={template.id} className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: template.color_hex }} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{template.name}</p><p className="text-xs text-muted-foreground">{formatDuration(template.default_duration_min)}</p></div>{imported ? <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600"><CheckCircle2 className="h-3 w-3" />Imported</span> : <Button size="xs" variant="outline" disabled={savingIds.has(template.id)} onClick={() => importTemplates([template.id])}>Import</Button>}</div>; })}</div>}</div>; })}</div></section>
    <section className="rounded-2xl border border-border bg-card p-5"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Your job types</h2><Button size="sm" onClick={() => setCustomOpen((v) => !v)}><Plus className="h-4 w-4" /> Add custom type</Button></div>{customOpen && <div className="mb-4 grid gap-3 rounded-xl border border-border bg-muted/30 p-4 md:grid-cols-[1fr_180px_130px_90px] "><Input placeholder="Name" value={custom.name} onChange={(e) => setCustom((p) => ({ ...p, name: e.target.value }))} /><Input placeholder="Category" list="job-type-categories" value={custom.category} onChange={(e) => setCustom((p) => ({ ...p, category: e.target.value }))} /><Input type="number" min={1} value={custom.duration_min} onChange={(e) => setCustom((p) => ({ ...p, duration_min: Number(e.target.value) }))} /><Input type="color" value={custom.color_hex} onChange={(e) => setCustom((p) => ({ ...p, color_hex: e.target.value }))} /><Textarea className="md:col-span-3" placeholder="Description" value={custom.description} onChange={(e) => setCustom((p) => ({ ...p, description: e.target.value }))} /><Button onClick={addCustom}>Save</Button><datalist id="job-type-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist></div>}
      <Table><TableHeader><TableRow><TableHead>Color</TableHead><TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead>Duration</TableHead><TableHead>Active</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>{jobTypes.map((jt) => { const category = jt.category || jt.job_type_templates?.category || "Custom"; const editing = editingId === jt.id; return <TableRow key={jt.id}><TableCell>{editing ? <Input className="h-8 w-16 p-1" type="color" value={edit.color_hex || jt.color_hex} onChange={(e) => setEdit((p) => ({ ...p, color_hex: e.target.value }))} /> : <button className="h-4 w-4 rounded" style={{ backgroundColor: jt.color_hex }} onClick={() => { setEditingId(jt.id); setEdit(jt); }} />}</TableCell><TableCell>{editing ? <Input value={edit.name || ""} onChange={(e) => setEdit((p) => ({ ...p, name: e.target.value }))} /> : <button onClick={() => { setEditingId(jt.id); setEdit(jt); }} className="font-medium hover:underline">{jt.name}</button>}</TableCell><TableCell>{editing ? <Input value={edit.category || category} onChange={(e) => setEdit((p) => ({ ...p, category: e.target.value }))} /> : category}</TableCell><TableCell>{editing ? <Input type="number" min={1} value={edit.duration_min || jt.duration_min} onChange={(e) => setEdit((p) => ({ ...p, duration_min: Number(e.target.value) }))} /> : formatDuration(jt.duration_min)}</TableCell><TableCell><input type="checkbox" checked={jt.is_active !== false} onChange={(e) => patchJobType(jt.id, { is_active: e.target.checked })} /></TableCell><TableCell>{editing ? <div className="flex gap-2"><Button size="xs" onClick={() => { patchJobType(jt.id, edit); setEditingId(null); }}>Save</Button><Button size="xs" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button></div> : confirmDeleteId === jt.id ? <div className="flex gap-2"><Button size="xs" variant="destructive" onClick={() => deleteJobType(jt.id)}>Confirm</Button><Button size="xs" variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancel</Button></div> : <Button size="xs" variant="ghost" onClick={() => setConfirmDeleteId(jt.id)}><Trash2 className="h-4 w-4" /></Button>}</TableCell></TableRow>; })}</TableBody></Table></section>
  </div>;
}
