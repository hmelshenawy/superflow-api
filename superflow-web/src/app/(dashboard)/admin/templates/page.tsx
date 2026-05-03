"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import type { InspectionTemplate } from "@/types";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, RefreshCw, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const VEHICLE_TYPES = [
  { value: "", label: "All" },
  { value: "sedan", label: "Sedan" },
  { value: "suv", label: "SUV" },
  { value: "amg", label: "AMG" },
  { value: "coupe", label: "Coupe" },
  { value: "van", label: "Van" },
  { value: "truck", label: "Truck" },
];

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<InspectionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialog, setCreateDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const [newVehicleType, setNewVehicleType] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<InspectionTemplate[]>("/admin/templates");
      setTemplates(data);
    } catch {
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const createTemplate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post("/admin/templates", {
        name: newName,
        vehicle_type: newVehicleType || null,
        description: newDescription || null,
      });
      toast.success("Template created");
      setCreateDialog(false);
      setNewName("");
      setNewVehicleType("");
      setNewDescription("");
      router.push(`/admin/templates/${data.id}`);
    } catch {
      toast.error("Failed to create template");
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (t: InspectionTemplate) => {
    try {
      await api.patch(`/admin/templates/${t.id}`, { is_active: !t.is_active });
      toast.success(t.is_active ? "Template disabled" : "Template enabled");
      fetchTemplates();
    } catch {
      toast.error("Failed to toggle template");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Inspection Templates</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchTemplates} aria-label="Refresh templates">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={() => setCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Template
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Vehicle Type</TableHead>
              <TableHead className="hidden sm:table-cell">Default</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : templates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No templates yet — click "New Template" to create one
                </TableCell>
              </TableRow>
            ) : (
              templates.map((t) => (
                <TableRow
                  key={t.id}
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => router.push(`/admin/templates/${t.id}`)}
                >
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell>{t.vehicle_type || "All"}</TableCell>
                  <TableCell>
                    {t.is_default && <Badge variant="secondary">Default</Badge>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={t.is_active ? "default" : "secondary"}>
                      {t.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {new Intl.DateTimeFormat("en-GB", {
                      year: "numeric",
                      month: "short",
                      day: "2-digit",
                      timeZone: "UTC",
                    }).format(new Date(t.created_at))}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/admin/templates/${t.id}`)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => toggleActive(t)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Template Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Inspection Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Template Name *</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Multi-Point Inspection, Quick Check"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && createTemplate()}
              />
            </div>
            <div>
              <Label>Vehicle Type</Label>
              <Select value={newVehicleType || "_all_"} onValueChange={(v) => setNewVehicleType(v === "_all_" || !v ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All vehicles" />
                </SelectTrigger>
                <SelectContent>
                  {VEHICLE_TYPES.map((vt) => (
                    <SelectItem key={vt.value || "all"} value={vt.value || "_all_"}>
                      {vt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="What this template is for"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createTemplate} disabled={!newName.trim() || creating}>
              {creating ? "Creating…" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}