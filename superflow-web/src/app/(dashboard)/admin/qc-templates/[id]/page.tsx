"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import type { QcChecklistTemplate, QcChecklistSection, QcChecklistItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Save,
  Camera,
  StickyNote,
} from "lucide-react";
import { toast } from "sonner";

const QC_INPUT_TYPES = [
  { value: "pass_fail", label: "Pass / Fail" },
  { value: "yes_no", label: "Yes / No" },
  { value: "ok_fail", label: "OK / Fail" },
  { value: "photo", label: "Photo Only" },
  { value: "text", label: "Text" },
];

export default function QcTemplateEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [template, setTemplate] = useState<QcChecklistTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Edit state
  const [editingHeader, setEditingHeader] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Dialog state
  const [sectionDialog, setSectionDialog] = useState(false);
  const [itemDialog, setItemDialog] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string>("");
  const [editingItem, setEditingItem] = useState<QcChecklistItem | null>(null);

  // Section form
  const [sectionName, setSectionName] = useState("");
  const [sectionIcon, setSectionIcon] = useState("");

  // Item form
  const [itemLabel, setItemLabel] = useState("");
  const [itemInputType, setItemInputType] = useState("pass_fail");
  const [itemRequiresPhoto, setItemRequiresPhoto] = useState(false);
  const [itemRequiresNoteOnFail, setItemRequiresNoteOnFail] = useState(false);
  const [itemHelpText, setItemHelpText] = useState("");

  const fetchTemplate = useCallback(async () => {
    try {
      const { data } = await api.get<QcChecklistTemplate>(`/admin/qc-templates/${id}`);
      setTemplate(data);
      setEditName(data.name || "");
      setEditDescription(data.description || "");
      if (data.qc_checklist_sections) {
        setExpandedSections(new Set(data.qc_checklist_sections.map((s) => s.id)));
      }
    } catch {
      toast.error("Failed to load QC template");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTemplate();
  }, [fetchTemplate]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  // ─── Template header ─────────────────────────────────
  const saveHeader = async () => {
    setSaving(true);
    try {
      await api.patch(`/admin/qc-templates/${id}`, {
        name: editName,
        description: editDescription || null,
      });
      toast.success("QC template updated");
      setEditingHeader(false);
      fetchTemplate();
    } catch {
      toast.error("Failed to update QC template");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    if (!template) return;
    try {
      await api.patch(`/admin/qc-templates/${id}`, { is_active: !template.is_active });
      toast.success(template.is_active ? "Template disabled" : "Template enabled");
      fetchTemplate();
    } catch {
      toast.error("Failed to toggle");
    }
  };

  const toggleDefault = async () => {
    if (!template) return;
    try {
      await api.patch(`/admin/qc-templates/${id}`, { is_default: !template.is_default });
      toast.success(template.is_default ? "Removed default" : "Set as default");
      fetchTemplate();
    } catch {
      toast.error("Failed to toggle default");
    }
  };

  // ─── Sections ──────────────────────────────────────────
  const openAddSection = () => {
    setSectionName("");
    setSectionIcon("");
    setSectionDialog(true);
  };

  const saveSection = async () => {
    if (!sectionName.trim()) return;
    try {
      await api.post(`/admin/qc-templates/${id}/sections`, {
        name: sectionName,
        icon: sectionIcon || null,
      });
      toast.success("Section added");
      setSectionDialog(false);
      fetchTemplate();
    } catch {
      toast.error("Failed to add section");
    }
  };

  const renameSection = async (sectionId: string, newName: string) => {
    if (!newName.trim()) return;
    try {
      await api.patch(`/admin/qc-templates/sections/${sectionId}`, { name: newName });
      toast.success("Section renamed");
      fetchTemplate();
    } catch {
      toast.error("Failed to rename section");
    }
  };

  const deleteSection = async (sectionId: string) => {
    if (!confirm("Delete this section and all its items?")) return;
    try {
      await api.delete(`/admin/qc-templates/sections/${sectionId}`);
      toast.success("Section deleted");
      fetchTemplate();
    } catch {
      toast.error("Failed to delete section");
    }
  };

  const moveSection = async (sections: QcChecklistSection[], index: number, direction: "up" | "down") => {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= sections.length) return;
    const newOrder = [...sections];
    [newOrder[index], newOrder[swapIndex]] = [newOrder[swapIndex], newOrder[index]];
    try {
      await api.patch(`/admin/qc-templates/${id}/sections/reorder`, {
        sectionIds: newOrder.map((s) => s.id),
      });
      fetchTemplate();
    } catch {
      toast.error("Failed to reorder");
    }
  };

  // ─── Items ─────────────────────────────────────────────
  const openAddItem = (sectionId: string) => {
    setActiveSectionId(sectionId);
    setEditingItem(null);
    setItemLabel("");
    setItemInputType("pass_fail");
    setItemRequiresPhoto(false);
    setItemRequiresNoteOnFail(false);
    setItemHelpText("");
    setItemDialog(true);
  };

  const openEditItem = (item: QcChecklistItem) => {
    setEditingItem(item);
    setActiveSectionId(item.section_id);
    setItemLabel(item.label || "");
    setItemInputType(item.input_type || "pass_fail");
    setItemRequiresPhoto(item.requires_photo ?? false);
    setItemRequiresNoteOnFail(item.requires_note_on_fail ?? false);
    setItemHelpText(item.help_text || "");
    setItemDialog(true);
  };

  const saveItem = async () => {
    if (!itemLabel.trim()) return;
    try {
      if (editingItem) {
        await api.patch(`/admin/qc-templates/items/${editingItem.id}`, {
          label: itemLabel,
          input_type: itemInputType,
          requires_photo: itemRequiresPhoto,
          requires_note_on_fail: itemRequiresNoteOnFail,
          help_text: itemHelpText || null,
        });
        toast.success("Item updated");
      } else {
        await api.post(`/admin/qc-templates/${id}/items`, {
          section_id: activeSectionId,
          label: itemLabel,
          input_type: itemInputType,
          requires_photo: itemRequiresPhoto,
          requires_note_on_fail: itemRequiresNoteOnFail,
          help_text: itemHelpText || null,
        });
        toast.success("Item added");
      }
      setItemDialog(false);
      fetchTemplate();
    } catch {
      toast.error("Failed to save item");
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!confirm("Delete this item?")) return;
    try {
      await api.delete(`/admin/qc-templates/items/${itemId}`);
      toast.success("Item deleted");
      fetchTemplate();
    } catch {
      toast.error("Failed to delete item");
    }
  };

  const moveItem = async (section: QcChecklistSection, index: number, direction: "up" | "down") => {
    const items = section.qc_checklist_items;
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= items.length) return;
    const newOrder = [...items];
    [newOrder[index], newOrder[swapIndex]] = [newOrder[swapIndex], newOrder[index]];
    try {
      await api.patch(`/admin/qc-templates/sections/${section.id}/items/reorder`, {
        itemIds: newOrder.map((i) => i.id),
      });
      fetchTemplate();
    } catch {
      toast.error("Failed to reorder");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading QC template…
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        QC template not found
      </div>
    );
  }

  const sections = template.qc_checklist_sections?.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)) || [];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" aria-label="Back to templates" onClick={() => router.push("/admin/templates?tab=qc")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          {editingHeader ? (
            <div className="space-y-3">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Template name"
                className="text-lg font-bold"
              />
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Description (optional)"
                className="flex-1"
                rows={2}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={saveHeader} disabled={saving}>
                  <Save className="mr-1 h-3 w-3" /> Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingHeader(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{template.name}</h1>
              <Badge variant={template.is_active ? "default" : "secondary"}>
                {template.is_active ? "Active" : "Inactive"}
              </Badge>
              {template.is_default && <Badge variant="secondary">Default</Badge>}
              <span className="text-sm text-muted-foreground">
                {sections.length} sections · {sections.reduce((sum, s) => sum + (s.qc_checklist_items?.length ?? 0), 0)} items
              </span>
              <Button variant="ghost" size="icon" aria-label="Edit template header" onClick={() => setEditingHeader(true)}>
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={toggleActive}>
            {template.is_active ? "Disable" : "Enable"}
          </Button>
          <Button
            variant={template.is_default ? "outline" : "secondary"}
            size="sm"
            onClick={toggleDefault}
          >
            {template.is_default ? "Remove Default" : "Set Default"}
          </Button>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {sections.map((section, sIdx) => {
          const isExpanded = expandedSections.has(section.id);
          const items = section.qc_checklist_items?.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)) || [];

          return (
            <div key={section.id} className="border rounded-lg">
              {/* Section header */}
              <div
                className="flex items-center gap-2 p-3 cursor-pointer hover:bg-muted"
                onClick={() => toggleSection(section.id)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                {section.icon && <span className="text-sm">{section.icon}</span>}
                <span
                  className="font-semibold text-foreground flex-1"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    const newName = prompt("Section name:", section.name || "");
                    if (newName) renameSection(section.id, newName);
                  }}
                >
                  {section.name}
                </span>
                <span className="text-xs text-muted-foreground">{items.length} items</span>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-7 w-7"
                    onClick={() => moveSection(sections, sIdx, "up")}
                    disabled={sIdx === 0}
                  >
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7"
                    onClick={() => moveSection(sections, sIdx, "down")}
                    disabled={sIdx === sections.length - 1}
                  >
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600"
                    onClick={() => openAddItem(section.id)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500"
                    onClick={() => deleteSection(section.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Items */}
              {isExpanded && (
                <div className="border-t">
                  {items.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground text-center">
                      No items yet — click + to add
                    </div>
                  ) : (
                    items.map((item, iIdx) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 px-3 py-2 border-b last:border-b-0 hover:bg-muted text-sm"
                      >
                        <span className="text-xs text-muted-foreground w-5 text-right">
                          {iIdx + 1}.
                        </span>
                        <span className="flex-1 text-foreground/80">{item.label}</span>
                        <Badge variant="outline" className="text-xs">
                          {QC_INPUT_TYPES.find((t) => t.value === item.input_type)?.label || item.input_type}
                        </Badge>
                        {item.requires_photo && (
                          <Camera className="h-3 w-3 text-blue-500" />
                        )}
                        {item.requires_note_on_fail && (
                          <StickyNote className="h-3 w-3 text-amber-500" />
                        )}
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6"
                            onClick={() => moveItem(section, iIdx, "up")}
                            disabled={iIdx === 0}
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6"
                            onClick={() => moveItem(section, iIdx, "down")}
                            disabled={iIdx === items.length - 1}
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6"
                            onClick={() => openEditItem(item)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500"
                            onClick={() => deleteItem(item.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Add section */}
        <Button variant="outline" className="w-full" onClick={openAddSection}>
          <Plus className="mr-2 h-4 w-4" /> Add Section
        </Button>
      </div>

      {/* ── Add Section Dialog ── */}
      <Dialog open={sectionDialog} onOpenChange={setSectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Section</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Section Name</Label>
              <Input
                value={sectionName}
                onChange={(e) => setSectionName(e.target.value)}
                placeholder="e.g. Work Completion, Workmanship Quality, Safety"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && saveSection()}
              />
            </div>
            <div>
              <Label>Icon (optional)</Label>
              <Input
                value={sectionIcon}
                onChange={(e) => setSectionIcon(e.target.value)}
                placeholder="e.g. 🔧, ✅, ⚠️"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSectionDialog(false)}>Cancel</Button>
            <Button onClick={saveSection} disabled={!sectionName.trim()}>Add Section</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add/Edit Item Dialog ── */}
      <Dialog open={itemDialog} onOpenChange={setItemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Item" : "Add Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Label</Label>
              <Input
                value={itemLabel}
                onChange={(e) => setItemLabel(e.target.value)}
                placeholder="e.g. All work completed per estimate, No fluid leaks"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && saveItem()}
              />
            </div>
            <div>
              <Label>Input Type</Label>
              <Select value={itemInputType} onValueChange={(v) => v && setItemInputType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QC_INPUT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={itemRequiresPhoto}
                  onChange={(e) => setItemRequiresPhoto(e.target.checked)}
                  className="rounded"
                />
                Requires Photo
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={itemRequiresNoteOnFail}
                  onChange={(e) => setItemRequiresNoteOnFail(e.target.checked)}
                  className="rounded"
                />
                Note on Fail
              </label>
            </div>
            <div>
              <Label>Help Text (optional)</Label>
              <Input
                value={itemHelpText}
                onChange={(e) => setItemHelpText(e.target.value)}
                placeholder="Helper text shown to technician"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialog(false)}>Cancel</Button>
            <Button onClick={saveItem} disabled={!itemLabel.trim()}>
              {editingItem ? "Save" : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}