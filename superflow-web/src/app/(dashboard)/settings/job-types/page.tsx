"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import api, { getApiError } from "@/lib/api";
import type { JobType, JobTypeTemplate } from "@/types/appointments";
import { formatDuration } from "@/utils/appointments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, ChevronDown, ChevronRight, Clock3, Layers3, LibraryBig, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

type TemplateGroups = Record<string, JobTypeTemplate[]>;
type JobTypeDraft = { name: string; category: string; duration_min: number; color_hex: string; description: string };

const emptyDraft: JobTypeDraft = { name: "", category: "Custom", duration_min: 60, color_hex: "#888780", description: "" };

function categoryFor(jobType: JobType) {
  return jobType.category || jobType.job_type_templates?.category || "Custom";
}

function completionText(imported: number, total: number) {
  if (!total) return "No templates yet";
  if (!imported) return `${total} ready to add`;
  if (imported === total) return "All templates added";
  return `${imported} added, ${total - imported} left`;
}

function durationBadge(minutes: number) {
  return (
    <span className="inline-flex min-w-[4.5rem] items-center justify-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-muted-foreground">
      <Clock3 className="h-3 w-3" />
      {formatDuration(minutes)}
    </span>
  );
}

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
  const [custom, setCustom] = useState<JobTypeDraft>(emptyDraft);
  const [activeTab, setActiveTab] = useState("library");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [templateRes, jobTypeRes] = await Promise.all([api.get<TemplateGroups>("/job-types/templates"), api.get<JobType[]>("/job-types")]);
      setTemplates(templateRes.data || {});
      setJobTypes(jobTypeRes.data || []);
    } catch (err) {
      toast.error(getApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const importedTemplateIds = useMemo(() => new Set(jobTypes.map((item) => item.template_id).filter(Boolean)), [jobTypes]);
  const categories = useMemo(
    () => Array.from(new Set([...Object.keys(templates), ...jobTypes.map(categoryFor)])).sort(),
    [jobTypes, templates],
  );
  const totalTemplates = useMemo(() => Object.values(templates).reduce((sum, items) => sum + items.length, 0), [templates]);
  const importedTemplateCount = useMemo(
    () => Object.values(templates).flat().filter((item) => importedTemplateIds.has(item.id)).length,
    [importedTemplateIds, templates],
  );
  const remainingTemplateCount = Math.max(0, totalTemplates - importedTemplateCount);
  const activeJobTypeCount = jobTypes.filter((item) => item.is_active !== false).length;
  const jobTypesByCategory = useMemo(() => {
    return jobTypes.reduce<Record<string, JobType[]>>((groups, item) => {
      const category = categoryFor(item);
      groups[category] = [...(groups[category] || []), item];
      return groups;
    }, {});
  }, [jobTypes]);

  const importTemplates = async (ids: string[]) => {
    if (!ids.length) return;
    setSavingIds((prev) => new Set([...prev, ...ids]));
    try {
      const { data } = await api.post<JobType[]>("/job-types/import", { template_ids: ids });
      setJobTypes((prev) => [...prev, ...(data || [])]);
      toast.success(ids.length === 1 ? "Job type imported" : `${ids.length} job types imported`);
    } catch (err) {
      toast.error(getApiError(err).message);
      await load();
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    }
  };

  const patchJobType = async (id: string, patch: Partial<JobType>) => {
    const previous = jobTypes;
    setJobTypes((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
    try {
      const { data } = await api.patch<JobType>(`/job-types/${id}`, patch);
      setJobTypes((items) => items.map((item) => item.id === id ? data : item));
    } catch (err) {
      setJobTypes(previous);
      toast.error(getApiError(err).message);
    }
  };

  const deleteJobType = async (id: string) => {
    try {
      await api.delete(`/job-types/${id}`);
      setJobTypes((items) => items.filter((item) => item.id !== id));
      setConfirmDeleteId(null);
    } catch (err) {
      toast.error(getApiError(err).message);
    }
  };

  const addCustom = async () => {
    if (!custom.name.trim()) {
      toast.error("Name is required");
      return;
    }
    try {
      const { data } = await api.post<JobType>("/job-types", custom);
      setJobTypes((prev) => [...prev, data]);
      setCustom(emptyDraft);
      setCustomOpen(false);
      setActiveTab("mine");
      toast.success("Custom job type added");
    } catch (err) {
      toast.error(getApiError(err).message);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Job types</h1>
          <p className="text-sm text-muted-foreground">Build the appointment menu your advisors pick from when booking work.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[34rem]">
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Template library</p>
            <p className="mt-1 text-lg font-semibold">{completionText(importedTemplateCount, totalTemplates)}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Your schedule menu</p>
            <p className="mt-1 text-lg font-semibold">{activeJobTypeCount} active</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Groups available</p>
            <p className="mt-1 text-lg font-semibold">{categories.length} categories</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="h-auto w-full flex-wrap justify-start sm:w-fit">
            <TabsTrigger value="library" className="min-h-7 flex-1 sm:flex-none">
              <LibraryBig className="h-4 w-4" />
              Library
              <Badge variant="secondary">{remainingTemplateCount ? `${remainingTemplateCount} to add` : "Ready"}</Badge>
            </TabsTrigger>
            <TabsTrigger value="mine" className="min-h-7 flex-1 sm:flex-none">
              <Layers3 className="h-4 w-4" />
              Your types
              <Badge variant="secondary">{jobTypes.length}</Badge>
            </TabsTrigger>
          </TabsList>
          <Button type="button" onClick={() => { setCustomOpen(true); setActiveTab("mine"); }}>
            <Plus className="h-4 w-4" />
            Add custom type
          </Button>
        </div>

        <TabsContent value="library" className="space-y-4">
          <section className="rounded-lg border border-border bg-card p-4 md:p-5">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Template library</h2>
                <p className="text-sm text-muted-foreground">Import complete category sets or pick the job types you actually book.</p>
              </div>
              <Button
                type="button"
                disabled={!remainingTemplateCount}
                onClick={() => importTemplates(Object.values(templates).flat().filter((item) => !importedTemplateIds.has(item.id)).map((item) => item.id))}
              >
                <Sparkles className="h-4 w-4" />
                Import all remaining
              </Button>
            </div>

            <div className="space-y-4">
              {Object.entries(templates).map(([category, items]) => {
                const open = !collapsed.has(category);
                const unimported = items.filter((item) => !importedTemplateIds.has(item.id));
                const importedCount = items.length - unimported.length;
                const percent = items.length ? Math.round((importedCount / items.length) * 100) : 0;

                return (
                  <div key={category} className="overflow-hidden rounded-lg border border-border">
                    <div className="border-b border-border bg-muted/30 p-3">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 text-left font-semibold"
                          onClick={() => setCollapsed((prev) => {
                            const next = new Set(prev);
                            next.has(category) ? next.delete(category) : next.add(category);
                            return next;
                          })}
                        >
                          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          {category}
                        </button>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <span className="text-xs font-medium text-muted-foreground">{completionText(importedCount, items.length)}</span>
                          <Button
                            type="button"
                            size="sm"
                            disabled={!unimported.length}
                            onClick={() => importTemplates(unimported.map((item) => item.id))}
                          >
                            Import {unimported.length ? `${unimported.length} remaining` : "complete"}
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-background">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
                      </div>
                    </div>

                    {open && (
                      <div className="grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3">
                        {items.map((template) => {
                          const imported = importedTemplateIds.has(template.id);
                          return (
                            <div key={template.id} className="flex min-h-24 flex-col justify-between gap-3 rounded-lg border border-border bg-background p-3">
                              <div className="flex items-start gap-3">
                                <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: template.color_hex }} />
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-medium">{template.name}</p>
                                    {durationBadge(template.default_duration_min)}
                                  </div>
                                  {template.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{template.description}</p>}
                                </div>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                {imported ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Added to your menu
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">Adds to {category}</span>
                                )}
                                <Button type="button" size="sm" variant={imported ? "outline" : "default"} disabled={imported || savingIds.has(template.id)} onClick={() => importTemplates([template.id])}>
                                  {imported ? "Imported" : "Import"}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="mine" className="space-y-4">
          <section className="rounded-lg border border-border bg-card p-4 md:p-5">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Your job types</h2>
                <p className="text-sm text-muted-foreground">Edit duration, color, status, and the group each type belongs to.</p>
              </div>
              <Button type="button" onClick={() => setCustomOpen((value) => !value)} variant={customOpen ? "outline" : "default"}>
                <Plus className="h-4 w-4" />
                {customOpen ? "Close form" : "Add custom type"}
              </Button>
            </div>

            {customOpen && (
              <div className="mb-4 grid gap-3 rounded-lg border border-border bg-muted/30 p-4 md:grid-cols-[1fr_180px_130px_88px_auto]">
                <Input placeholder="Name" value={custom.name} onChange={(e) => setCustom((p) => ({ ...p, name: e.target.value }))} />
                <Input placeholder="Group" list="job-type-categories" value={custom.category} onChange={(e) => setCustom((p) => ({ ...p, category: e.target.value }))} />
                <Input type="number" min={1} value={custom.duration_min} onChange={(e) => setCustom((p) => ({ ...p, duration_min: Number(e.target.value) }))} />
                <Input className="p-1" type="color" value={custom.color_hex} onChange={(e) => setCustom((p) => ({ ...p, color_hex: e.target.value }))} />
                <Button type="button" onClick={addCustom}>Save type</Button>
                <Textarea className="md:col-span-5" placeholder="Description" value={custom.description} onChange={(e) => setCustom((p) => ({ ...p, description: e.target.value }))} />
                <datalist id="job-type-categories">{categories.map((category) => <option key={category} value={category} />)}</datalist>
              </div>
            )}

            {!jobTypes.length ? (
              <div className="grid gap-4 rounded-lg border border-dashed border-border bg-muted/20 p-6 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <LibraryBig className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold">Start your appointment menu</h3>
                  <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                    Import a category from the library for a quick setup, or add a custom type and attach it to any group.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
                  <Button type="button" onClick={() => setActiveTab("library")}>Browse templates</Button>
                  <Button type="button" variant="outline" onClick={() => setCustomOpen(true)}>Create custom type</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {categories.filter((category) => jobTypesByCategory[category]?.length).map((category) => (
                  <div key={category} className="rounded-lg border border-border">
                    <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/30 p-3">
                      <h3 className="font-semibold">{category}</h3>
                      <Badge variant="outline">{jobTypesByCategory[category].length} types</Badge>
                    </div>
                    <div className="grid gap-3 p-3 lg:grid-cols-2">
                      {jobTypesByCategory[category].map((jobType) => {
                        const editing = editingId === jobType.id;
                        return (
                          <div key={jobType.id} className="rounded-lg border border-border bg-background p-3">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  {editing ? (
                                    <Input value={edit.name || ""} onChange={(e) => setEdit((p) => ({ ...p, name: e.target.value }))} />
                                  ) : (
                                    <button type="button" onClick={() => { setEditingId(jobType.id); setEdit(jobType); }} className="text-left font-medium hover:underline">
                                      {jobType.name}
                                    </button>
                                  )}
                                  {!editing && durationBadge(jobType.duration_min)}
                                  {!editing && jobType.is_active === false && <Badge variant="outline">Inactive</Badge>}
                                </div>
                                {editing ? (
                                  <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_110px_70px]">
                                    <Input list="job-type-categories" value={edit.category || category} onChange={(e) => setEdit((p) => ({ ...p, category: e.target.value }))} />
                                    <Input type="number" min={1} value={edit.duration_min || jobType.duration_min} onChange={(e) => setEdit((p) => ({ ...p, duration_min: Number(e.target.value) }))} />
                                    <Input className="p-1" type="color" value={edit.color_hex || jobType.color_hex} onChange={(e) => setEdit((p) => ({ ...p, color_hex: e.target.value }))} />
                                  </div>
                                ) : (
                                  <p className="mt-1 text-xs text-muted-foreground">{jobType.description || "No description added."}</p>
                                )}
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <span className="h-5 w-5 rounded-md border border-border" style={{ backgroundColor: jobType.color_hex }} />
                                <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                                  <input type="checkbox" checked={jobType.is_active !== false} onChange={(e) => patchJobType(jobType.id, { is_active: e.target.checked })} />
                                  Active
                                </label>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap justify-end gap-2">
                              {editing ? (
                                <>
                                  <Button type="button" size="sm" onClick={() => { patchJobType(jobType.id, edit); setEditingId(null); }}>Save</Button>
                                  <Button type="button" size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                                </>
                              ) : confirmDeleteId === jobType.id ? (
                                <>
                                  <Button type="button" size="sm" variant="destructive" onClick={() => deleteJobType(jobType.id)}>Confirm delete</Button>
                                  <Button type="button" size="sm" variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
                                </>
                              ) : (
                                <>
                                  <Button type="button" size="sm" variant="outline" onClick={() => { setEditingId(jobType.id); setEdit(jobType); }}>Edit</Button>
                                  <Button type="button" size="icon-sm" variant="ghost" aria-label={`Delete ${jobType.name}`} onClick={() => setConfirmDeleteId(jobType.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
