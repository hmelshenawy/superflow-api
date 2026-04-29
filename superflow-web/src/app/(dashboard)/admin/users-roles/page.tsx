"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, RefreshCw, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function UsersRolesPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRoleId, setFormRoleId] = useState("");
  const [formEmployeeCode, setFormEmployeeCode] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const [u, r] = await Promise.all([
        api.get<PaginatedResponse<User>>("/users", { params: { limit: 100 } }),
        api.get<Role[]>("/admin/roles"),
      ]);
      setUsers(u.data.data ?? u.data.items ?? (u.data as unknown as User[]));
      setRoles(r.data);
    } catch {
      toast.error("Failed to load users");
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
    } catch {
      toast.error("Failed to save user");
    }
  };

  const toggleActive = async (user: User) => {
    try {
      await api.patch(`/users/${user.id}`, { is_active: !user.is_active });
      toast.success(user.is_active ? "User deactivated" : "User activated");
      fetchUsers();
    } catch {
      toast.error("Failed to toggle user status");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Users & Roles</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchUsers}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add User
          </Button>
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Staff ID</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-slate-400">Loading…</TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name || "—"}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell className="font-mono">{(u as any).employee_code || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{u.role?.name || u.role_id?.slice(0, 8) || "—"}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.is_active ? "default" : "destructive"}>
                      {u.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {u.last_login_at ? new Intl.DateTimeFormat("en-GB", { year: "numeric", month: "short", day: "2-digit", timeZone: "UTC" }).format(new Date(u.last_login_at)) : "Never"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(u)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => toggleActive(u)}>
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "New User"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{editingUser ? "New Password" : "Password"}</label>
              <Input type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder={editingUser ? "Leave blank to keep" : ""} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Staff ID</label>
              <Input value={formEmployeeCode} onChange={(e) => setFormEmployeeCode(e.target.value)} placeholder="e.g. 4702" />
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
            <Button className="w-full" onClick={saveUser}>
              {editingUser ? "Save Changes" : "Create User"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}