"use client";

import { useEffect, useState } from "react";
import api, { getApiError } from "@/lib/api";
import type { User, Role, PaginatedResponse } from "@/types";
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
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Plus, RefreshCw, Pencil, Power, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export default function UsersRolesPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRoleId, setFormRoleId] = useState("");
  const [formEmployeeCode, setFormEmployeeCode] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [u, r] = await Promise.all([
        api.get<PaginatedResponse<User>>("/users", { params: { limit: 100 } }),
        api.get<Role[]>("/admin/roles"),
      ]);
      setUsers(u.data.data ?? u.data.items ?? (u.data as unknown as User[]));
      setRoles(r.data);
    } catch (err: any) {
      const msg = getApiError(err).message;
      setLoadError(Array.isArray(msg) ? msg.join(", ") : msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const openCreate = () => {
    setEditingUser(null);
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setFormRoleId(roles[0]?.id ?? "");
    setFormEmployeeCode("");
    setDialogOpen(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setFormName(user.name ?? "");
    setFormEmail(user.email ?? "");
    setFormPassword("");
    setFormRoleId(user.role_id ?? "");
    setFormEmployeeCode((user as any).employee_code ?? "");
    setDialogOpen(true);
  };

  const saveUser = async () => {
    if (!editingUser && !formPassword) {
      toast.error("Password is required for new users");
      return;
    }
    setSaving(true);
    try {
      if (editingUser) {
        await api.patch(`/users/${editingUser.id}`, {
          name: formName,
          email: formEmail,
          role_id: formRoleId,
          employee_code: formEmployeeCode,
          ...(formPassword ? { password: formPassword } : {}),
        });
        toast.success("User updated");
      } else {
        await api.post("/users", {
          name: formName,
          email: formEmail,
          password: formPassword,
          role_id: formRoleId,
          employee_code: formEmployeeCode,
        });
        toast.success("User created");
      }
      setDialogOpen(false);
      fetchUsers();
    } catch (err: any) {
      const msg = getApiError(err).message;
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (user: User) => {
    const nextActive = !user.is_active;
    if (!confirm(`${nextActive ? "Reactivate" : "Deactivate"} ${user.name || user.email}?`)) return;
    setTogglingId(user.id);
    try {
      await api.patch(`/users/${user.id}`, { is_active: nextActive });
      toast.success(user.is_active ? "User deactivated" : "User activated");
      fetchUsers();
    } catch (err: any) {
      const msg = getApiError(err).message;
      toast.error(msg);
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-foreground">Users & Roles</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchUsers} aria-label="Refresh users" disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add User
          </Button>
        </div>
      </div>

      {loadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Could not load users</p>
                <p className="mt-1">{loadError}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>Retry</Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="hidden sm:table-cell">Staff ID</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Last Login</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Loading…</TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No users found yet.</TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name || "—"}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell className="hidden sm:table-cell font-mono">{(u as any).employee_code || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{u.role?.name || u.role_id?.slice(0, 8) || "—"}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.is_active ? "default" : "destructive"}>
                      {u.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {u.last_login_at ? new Intl.DateTimeFormat("en-GB", { year: "numeric", month: "short", day: "2-digit", timeZone: "UTC" }).format(new Date(u.last_login_at)) : "Never"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(u)} aria-label={`Edit ${u.name || u.email}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => toggleActive(u)} aria-label={u.is_active ? `Deactivate ${u.name || u.email}` : `Reactivate ${u.name || u.email}`} disabled={togglingId === u.id}>
                        {u.is_active ? <Power className="h-4 w-4 text-red-600" /> : <RotateCcw className="h-4 w-4 text-emerald-600" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "New User"}</DialogTitle>
            <DialogDescription>{editingUser ? "Update user profile, role, and staff ID." : "Create a new team member account."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} aria-label="Name" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} aria-label="Email" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{editingUser ? "New Password" : "Password"}</label>
              <Input type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder={editingUser ? "Leave blank to keep" : ""} aria-label="Password" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Staff ID</label>
              <Input value={formEmployeeCode} onChange={(e) => setFormEmployeeCode(e.target.value)} placeholder="e.g. 4702" aria-label="Staff ID" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select value={formRoleId} onValueChange={(v) => setFormRoleId(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={saveUser} disabled={saving || !formEmail.trim() || !formRoleId || (!editingUser && !formPassword)}>
              {saving ? "Saving..." : editingUser ? "Save Changes" : "Create User"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
