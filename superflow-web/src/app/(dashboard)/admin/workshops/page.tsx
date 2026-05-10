"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import type { Workshop, User } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  DialogDescription,
} from "@/components/ui/dialog";
import { Plus, RefreshCw, Pencil, Power, RotateCcw, Users, Download, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface WorkshopUser {
  id: string;
  userId: string;
  assignedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    roles?: { name: string } | null;
  };
}

interface WorkshopWithCount extends Workshop {
  _count?: { user_workshop_access: number };
  userCount?: number;
  created_at?: string;
  updated_at?: string;
}

export default function WorkshopsPage() {
  const [workshops, setWorkshops] = useState<WorkshopWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWorkshop, setEditingWorkshop] = useState<WorkshopWithCount | null>(null);
  const [usersDialogOpen, setUsersDialogOpen] = useState(false);
  const [selectedWorkshop, setSelectedWorkshop] = useState<WorkshopWithCount | null>(null);
  const [workshopUsers, setWorkshopUsers] = useState<WorkshopUser[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [assignUserId, setAssignUserId] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formTimezone, setFormTimezone] = useState("Asia/Dubai");

  const fetchWorkshops = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data } = await api.get<WorkshopWithCount[]>("/workshops");
      setWorkshops(data);
    } catch (err: any) {
      const message = err?.response?.data?.message || "Failed to load workshops";
      setLoadError(Array.isArray(message) ? message.join(", ") : message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const { data } = await api.get("/users", { params: { limit: 100 } });
      const list = data.data ?? data.items ?? data;
      setAllUsers(list);
    } catch {
      // non-critical
    }
  };

  useEffect(() => { fetchWorkshops(); fetchAllUsers(); }, []);

  const openCreate = () => {
    setEditingWorkshop(null);
    setFormName("");
    setFormSlug("");
    setFormAddress("");
    setFormPhone("");
    setFormEmail("");
    setFormTimezone("Asia/Dubai");
    setDialogOpen(true);
  };

  const openEdit = (w: WorkshopWithCount) => {
    setEditingWorkshop(w);
    setFormName(w.name);
    setFormSlug(w.slug);
    setFormAddress(w.address ?? "");
    setFormPhone(w.phone ?? "");
    setFormEmail(w.email ?? "");
    setFormTimezone(w.timezone ?? "Asia/Dubai");
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload: any = {
        name: formName,
        slug: formSlug,
        address: formAddress || undefined,
        phone: formPhone || undefined,
        email: formEmail || undefined,
        timezone: formTimezone || undefined,
      };
      if (editingWorkshop) {
        await api.patch(`/workshops/${editingWorkshop.id}`, payload);
        toast.success("Workshop updated");
      } else {
        await api.post("/workshops", payload);
        toast.success("Workshop created");
      }
      setDialogOpen(false);
      fetchWorkshops();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save workshop");
    } finally {
      setSaving(false);
    }
  };

  const toggleWorkshopActive = async (workshop: WorkshopWithCount) => {
    const nextActive = !workshop.is_active;
    const action = nextActive ? "reactivate" : "deactivate";
    const message = nextActive
      ? `Reactivate ${workshop.name}? Users will be able to select it again.`
      : `Deactivate ${workshop.name}? Users will lose active sessions for this workshop, but data will be retained.`;
    if (!confirm(message)) return;
    setTogglingId(workshop.id);
    try {
      await api.patch(`/workshops/${workshop.id}`, { is_active: nextActive });
      toast.success(nextActive ? "Workshop reactivated" : "Workshop deactivated");
      fetchWorkshops();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || `Failed to ${action} workshop`);
    } finally {
      setTogglingId(null);
    }
  };

  const exportWorkshop = async (workshop: WorkshopWithCount) => {
    setExportingId(workshop.id);
    try {
      const { data } = await api.get(`/workshops/${workshop.id}/export`);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const slug = (workshop.slug || workshop.name || workshop.id).replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
      const date = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `prioraflow-${slug || workshop.id}-export-${date}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("Workshop export downloaded");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to export workshop");
    } finally {
      setExportingId(null);
    }
  };

  const openUsers = async (w: WorkshopWithCount) => {
    setSelectedWorkshop(w);
    setUsersError(null);
    try {
      const { data } = await api.get<WorkshopUser[]>(`/workshops/${w.id}/users`);
      setWorkshopUsers(data);
    } catch (err: any) {
      setWorkshopUsers([]);
      const message = err?.response?.data?.message || "Failed to load workshop users";
      setUsersError(Array.isArray(message) ? message.join(", ") : message);
    }
    setAssignUserId("");
    setUsersDialogOpen(true);
  };

  const handleAssignUser = async () => {
    if (!selectedWorkshop || !assignUserId) return;
    setAssigning(true);
    try {
      await api.post(`/workshops/${selectedWorkshop.id}/users`, { userId: assignUserId });
      toast.success("User assigned");
      const { data } = await api.get<WorkshopUser[]>(`/workshops/${selectedWorkshop.id}/users`);
      setWorkshopUsers(data);
      setAssignUserId("");
      fetchWorkshops();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to assign user");
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!selectedWorkshop) return;
    setRemovingUserId(userId);
    try {
      await api.delete(`/workshops/${selectedWorkshop.id}/users/${userId}`);
      toast.success("User removed");
      setWorkshopUsers(prev => prev.filter(wu => wu.userId !== userId));
      fetchWorkshops();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to remove user");
    } finally {
      setRemovingUserId(null);
    }
  };

  // Compare by userId (not access record id) to find who's not yet assigned
  const assignedUserIds = new Set(workshopUsers.map(wu => wu.userId));
  const availableUsers = allUsers.filter(u => !assignedUserIds.has(u.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workshops</h1>
          <p className="text-sm text-muted-foreground">Manage workshops, user assignments, and account activation</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchWorkshops} disabled={loading}>
            <RefreshCw className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" /> Add Workshop
          </Button>
        </div>
      </div>

      {loadError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Could not load workshops</p>
                <p className="mt-1">{loadError}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchWorkshops} disabled={loading}>Retry</Button>
          </div>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : workshops.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No workshops found. Create your first workshop.
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Timezone</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workshops.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-medium">{w.name}</TableCell>
                  <TableCell className="text-muted-foreground">{w.slug}</TableCell>
                  <TableCell className="text-muted-foreground">{w.address || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{w.timezone || "—"}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => openUsers(w)}>
                      <Users className="mr-1 h-3.5 w-3.5" />
                      {w._count?.user_workshop_access ?? w.userCount ?? 0}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Badge variant={w.is_active ? "default" : "secondary"}>
                      {w.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(w)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => exportWorkshop(w)}
                      disabled={exportingId === w.id || togglingId === w.id}
                      aria-label="Export workshop data"
                      title="Export workshop data"
                    >
                      <Download className={`h-3.5 w-3.5 ${exportingId === w.id ? "animate-pulse" : ""}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={w.is_active ? "text-red-600" : "text-emerald-600"}
                      onClick={() => toggleWorkshopActive(w)}
                      disabled={togglingId === w.id || exportingId === w.id}
                      aria-label={w.is_active ? "Deactivate workshop" : "Reactivate workshop"}
                      title={w.is_active ? "Deactivate workshop" : "Reactivate workshop"}
                    >
                      {w.is_active ? <Power className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingWorkshop ? "Edit Workshop" : "Create Workshop"}</DialogTitle>
            <DialogDescription>
              {editingWorkshop ? "Update workshop details" : "Add a new workshop to the platform"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Workshop name" />
            </div>
            <div>
              <label className="text-sm font-medium">Slug</label>
              <Input
                value={formSlug}
                onChange={(e) => setFormSlug(e.target.value.replace(/[^a-z0-9-]/g, "-"))}
                placeholder="unique-slug"
                disabled={!!editingWorkshop}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Address</label>
              <Input value={formAddress} onChange={(e) => setFormAddress(e.target.value)} placeholder="Street address" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Phone</label>
                <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="+971..." />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="info@..." />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Timezone</label>
              <Input value={formTimezone} onChange={(e) => setFormTimezone(e.target.value)} placeholder="Asia/Dubai" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!formName || !formSlug || saving}>
              {saving ? "Saving..." : editingWorkshop ? "Update" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={usersDialogOpen} onOpenChange={setUsersDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Users — {selectedWorkshop?.name}</DialogTitle>
            <DialogDescription>
              {selectedWorkshop?.is_active ? "Assign or remove users from this workshop" : "This workshop is inactive. Existing users remain listed, but new assignments are disabled."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {usersError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{usersError}</div>
            )}
            <div className="flex gap-2">
              <select
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={assignUserId}
                onChange={(e) => setAssignUserId(e.target.value)}
                disabled={!selectedWorkshop?.is_active || assigning}
              >
                <option value="">Select user to assign...</option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name || u.email}</option>
                ))}
              </select>
              <Button size="sm" onClick={handleAssignUser} disabled={!assignUserId || !selectedWorkshop?.is_active || assigning}>
                {assigning ? "Assigning..." : "Assign"}
              </Button>
            </div>
            {workshopUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No users assigned</p>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workshopUsers.map((wu) => (
                      <TableRow key={wu.id}>
                        <TableCell className="font-medium">{wu.user?.name || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{wu.user?.email || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{wu.user?.roles?.name || "—"}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleRemoveUser(wu.userId)} disabled={removingUserId === wu.userId}>
                            {removingUserId === wu.userId ? "Removing..." : "Remove"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
