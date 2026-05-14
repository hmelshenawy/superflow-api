"use client";

import { useEffect, useState, useMemo } from "react";
import api, { getApiError } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import type { Role } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Shield,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { redirect } from "next/navigation";

// Permission categories for the UI
const PERMISSION_CATEGORIES: { key: string; label: string; permissions: string[] }[] = [
  {
    key: "jobs",
    label: "Jobs",
    permissions: ["jobs:read", "jobs:create", "jobs:update", "jobs:delete", "jobs:assign", "jobs:transition"],
  },
  {
    key: "estimates",
    label: "Estimates",
    permissions: ["estimates:read", "estimates:create", "estimates:update", "estimates:delete"],
  },
  {
    key: "inspections",
    label: "Inspections",
    permissions: ["inspections:read", "inspections:create", "inspections:submit", "inspections:reopen"],
  },
  {
    key: "customers",
    label: "Customers",
    permissions: ["customers:read", "customers:create", "customers:update", "customers:delete"],
  },
  {
    key: "vehicles",
    label: "Vehicles",
    permissions: ["vehicles:read", "vehicles:create", "vehicles:update"],
  },
  {
    key: "media",
    label: "Media",
    permissions: ["media:upload", "media:delete"],
  },
  {
    key: "auth",
    label: "Authorisation",
    permissions: ["auth:request", "auth:status"],
  },
  {
    key: "deferred",
    label: "Deferred Work",
    permissions: ["deferred:read", "deferred:manage", "deferred:book"],
  },
  {
    key: "import",
    label: "Booking Import",
    permissions: ["import:parse", "import:run"],
  },
  {
    key: "admin",
    label: "Admin",
    permissions: [
      "admin:settings", "admin:settings:edit", "admin:roles",
      "admin:users", "admin:users:create", "admin:users:delete",
      "admin:audit", "admin:integrations", "admin:templates",
      "admin:labour-rates", "admin:stats",
    ],
  },
  {
    key: "priority",
    label: "Priority & Insights",
    permissions: ["priority:read", "insights:dashboard"],
  },
];

function formatPermName(perm: string): string {
  const [cat, action] = perm.split(":");
  const catLabel = PERMISSION_CATEGORIES.find((c) => c.key === cat)?.label ?? cat;
  return `${catLabel} — ${action.replace(/_/g, " ")}`;
}

function normalizePermissions(p: string[] | string | null | undefined): string[] {
  if (!p) return [];
  if (Array.isArray(p)) return p;
  try {
    const parsed = JSON.parse(p);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function RolesPermissionsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role?.name === "admin" || user?.role?.name === "administrator" || user?.role?.name === "platform_admin" || user?.role?.name === "workshop_admin";

  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formPermissions, setFormPermissions] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(PERMISSION_CATEGORIES.map((c) => c.key)));

  // Role detail view
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        api.get<Role[]>("/admin/roles"),
        api.get<{ permissions: string[] }>("/admin/permissions"),
      ]);
      setRoles(rolesRes.data);
      setAllPermissions(permsRes.data.permissions);
    } catch (err: any) {
      const message = getApiError(err).message;
      setLoadError(Array.isArray(message) ? message.join(", ") : message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    fetchData();
  }, [isAdmin]);

  if (!isAdmin) {
    redirect("/jobs");
  }

  const openCreate = () => {
    setEditingRole(null);
    setFormName("");
    setFormDesc("");
    setFormPermissions(new Set());
    setExpandedCategories(new Set(PERMISSION_CATEGORIES.map((c) => c.key)));
    setDialogOpen(true);
  };

  const openEdit = (role: Role) => {
    setEditingRole(role);
    setFormName(role.name ?? "");
    setFormDesc(role.description ?? "");
    setFormPermissions(new Set(normalizePermissions(role.permissions)));
    setExpandedCategories(new Set(PERMISSION_CATEGORIES.map((c) => c.key)));
    setDialogOpen(true);
  };

  const togglePermission = (perm: string) => {
    setFormPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(perm)) next.delete(perm);
      else next.add(perm);
      return next;
    });
  };

  const toggleCategory = (key: string, perms: string[]) => {
    const allSelected = perms.every((p) => formPermissions.has(p));
    setFormPermissions((prev) => {
      const next = new Set(prev);
      perms.forEach((p) => {
        if (allSelected) next.delete(p);
        else next.add(p);
      });
      return next;
    });
  };

  const toggleCategoryExpand = (key: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const saveRole = async () => {
    if (!formName.trim()) {
      toast.error("Role name is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: formName.trim().toLowerCase().replace(/\s+/g, "_"),
        description: formDesc.trim() || null,
        permissions: Array.from(formPermissions),
      };

      if (editingRole) {
        await api.patch(`/admin/roles/${editingRole.id}`, payload);
        toast.success("Role updated");
      } else {
        await api.post("/admin/roles", payload);
        toast.success("Role created");
      }
      setDialogOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(getApiError(err).message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingRole) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/roles/${deletingRole.id}`);
      toast.success("Role deleted");
      setDeleteDialogOpen(false);
      setDeletingRole(null);
      setSelectedRoleId(null);
      fetchData();
    } catch (err: any) {
      toast.error(getApiError(err).message);
    } finally {
      setDeleting(false);
    }
  };

  const selectedRole = useMemo(() => roles.find((r) => r.id === selectedRoleId), [roles, selectedRoleId]);
  const selectedPerms = useMemo(() => normalizePermissions(selectedRole?.permissions), [selectedRole]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Roles & Permissions</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage role-based access control. Admin always has full access.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchData} aria-label="Refresh" disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> New Role
          </Button>
        </div>
      </div>

      {loadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Could not load roles</p>
                <p className="mt-1">{loadError}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>Retry</Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Role list */}
        <div className="lg:col-span-4">
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-center">Perms</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">Loading…</TableCell>
                  </TableRow>
                ) : roles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">No roles found yet.</TableCell>
                  </TableRow>
                ) : (
                  roles.map((role) => {
                    const perms = normalizePermissions(role.permissions);
                    const isSelected = selectedRoleId === role.id;
                    const isDefault = ["workshop_admin", "manager", "service_advisor", "workshop_teamleader", "technician", "receptionist"].includes(role.name ?? "");
                    return (
                      <TableRow
                        key={role.id}
                        className={`cursor-pointer ${isSelected ? "bg-blue-500/10" : ""}`}
                        onClick={() => setSelectedRoleId(role.id)}
                      >
                        <TableCell>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {role.name}
                              {role.name === "workshop_admin" && <Badge variant="default" className="text-[10px]">Always Full</Badge>}
                              {isDefault && role.name !== "workshop_admin" && <Badge variant="secondary" className="text-[10px]">Default</Badge>}
                            </div>
                            {role.description && (
                              <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[180px]">{role.description}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{perms.length}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => { e.stopPropagation(); openEdit(role); }}
                              aria-label={`Edit ${role.name}`}
                              disabled={deleting}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {!isDefault && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => { e.stopPropagation(); setDeletingRole(role); setDeleteDialogOpen(true); }}
                                aria-label={`Delete ${role.name}`}
                                disabled={deleting}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Permission detail view */}
        <div className="lg:col-span-8">
          {selectedRole ? (
            <div className="rounded-lg border p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-500" />
                    {selectedRole.name}
                  </h2>
                  {selectedRole.description && (
                    <p className="text-sm text-muted-foreground mt-0.5">{selectedRole.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(selectedRole)}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit Permissions
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline">{selectedPerms.length} of {allPermissions.length} permissions</Badge>
                {selectedRole.name === "admin" && (
                  <span className="text-xs text-muted-foreground">Admin bypasses all checks regardless of listed permissions</span>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                {PERMISSION_CATEGORIES.map((cat) => {
                  const catPerms = cat.permissions.filter((p) => allPermissions.includes(p));
                  if (catPerms.length === 0) return null;
                  const granted = catPerms.filter((p) => selectedPerms.includes(p));
                  const allGranted = granted.length === catPerms.length;
                  const noneGranted = granted.length === 0;

                  return (
                    <div key={cat.key} className="rounded-lg border bg-card">
                      <div className="flex items-center justify-between px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{cat.label}</span>
                          <Badge variant={allGranted ? "default" : noneGranted ? "secondary" : "outline"} className="text-[10px]">
                            {granted.length}/{catPerms.length}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {allGranted && <Check className="h-3.5 w-3.5 text-green-500" />}
                          {noneGranted && <X className="h-3.5 w-3.5 text-muted-foreground" />}
                          {!allGranted && !noneGranted && <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
                        </div>
                      </div>
                      <div className="border-t px-3 py-2 flex flex-wrap gap-1.5">
                        {catPerms.map((perm) => {
                          const has = selectedPerms.includes(perm);
                          const [, action] = perm.split(":");
                          return (
                            <Badge
                              key={perm}
                              variant={has ? "default" : "secondary"}
                              className={`text-[11px] ${has ? "bg-blue-600 hover:bg-blue-700 text-white" : "opacity-50"}`}
                            >
                              {action.replace(/_/g, " ")}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <Shield className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p>Select a role to view its permissions</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRole ? "Edit Role" : "New Role"}</DialogTitle>
            <DialogDescription>
              {editingRole ? `Editing permissions for ${editingRole.name}` : "Create a new role with custom permissions"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Role Name</label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. parts_coordinator"
                  disabled={!!editingRole}
                  aria-label="Role name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="What this role can do"
                  aria-label="Description"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Permissions ({formPermissions.size} selected)</label>
              <Select
                onValueChange={(v) => {
                  if (v === "all") {
                    setFormPermissions(new Set(allPermissions));
                  } else if (v === "none") {
                    setFormPermissions(new Set());
                  } else {
                    const template = ROLES_TEMPLATES[v as keyof typeof ROLES_TEMPLATES];
                    if (template) setFormPermissions(new Set(template));
                  }
                }}
              >
                <SelectTrigger className="w-48"><SelectValue placeholder="Quick-fill template" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Select All</SelectItem>
                  <SelectItem value="none">Clear All</SelectItem>
                  <SelectItem value="admin">Admin template</SelectItem>
                  <SelectItem value="platform_admin">Platform Admin template</SelectItem>
                  <SelectItem value="manager">Manager template</SelectItem>
                  <SelectItem value="service_advisor">Service Advisor template</SelectItem>
                  <SelectItem value="workshop_teamleader">Workshop Team Leader template</SelectItem>
                  <SelectItem value="technician">Technician template</SelectItem>
                  <SelectItem value="receptionist">Receptionist template</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              {PERMISSION_CATEGORIES.map((cat) => {
                const catPerms = cat.permissions.filter((p) => allPermissions.includes(p));
                if (catPerms.length === 0) return null;
                const allSelected = catPerms.every((p) => formPermissions.has(p));
                const someSelected = catPerms.some((p) => formPermissions.has(p));
                const isExpanded = expandedCategories.has(cat.key);

                return (
                  <div key={cat.key} className="rounded-lg border">
                    <button
                      className="flex items-center justify-between w-full px-3 py-2.5 hover:bg-muted/50 transition"
                      onClick={() => toggleCategoryExpand(cat.key)}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = someSelected && !allSelected;
                          }}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleCategory(cat.key, catPerms);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 rounded border-input accent-blue-600"
                          aria-label={`Toggle all ${cat.label} permissions`}
                        />
                        <span className="text-sm font-medium">{cat.label}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {catPerms.filter((p) => formPermissions.has(p)).length}/{catPerms.length}
                        </Badge>
                      </div>
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    {isExpanded && (
                      <div className="border-t px-3 py-2.5 space-y-2">
                        {catPerms.map((perm) => {
                          const has = formPermissions.has(perm);
                          const [, action] = perm.split(":");
                          return (
                            <label
                              key={perm}
                              className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 cursor-pointer transition ${has ? "bg-blue-500/10" : "hover:bg-muted/50"}`}
                            >
                              <input
                                type="checkbox"
                                checked={has}
                                onChange={() => togglePermission(perm)}
                                className="h-4 w-4 rounded border-input accent-blue-600"
                              />
                              <span className={`text-sm ${has ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                                {action.replace(/_/g, " ")}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={saveRole} disabled={saving || !formName.trim()}>
                {saving ? "Saving..." : editingRole ? "Save Changes" : "Create Role"}
              </Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the <strong>{deletingRole?.name}</strong> role? This cannot be undone.
              Users assigned to this role will need to be reassigned first.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-2">
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>{deleting ? "Deleting..." : "Delete"}</Button>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Default role templates for the quick-fill dropdown
const ROLES_TEMPLATES: Record<string, string[]> = {
  platform_admin: [
    "jobs:read","jobs:create","jobs:update","jobs:delete","jobs:assign","jobs:transition",
    "estimates:read","estimates:create","estimates:update","estimates:delete",
    "inspections:read","inspections:create","inspections:submit","inspections:reopen",
    "customers:read","customers:create","customers:update","customers:delete",
    "vehicles:read","vehicles:create","vehicles:update",
    "media:upload","media:delete",
    "auth:request","auth:status",
    "deferred:read","deferred:manage","deferred:book",
    "import:parse","import:run",
    "admin:settings","admin:settings:edit","admin:roles",
    "admin:users","admin:users:create","admin:users:delete",
    "admin:audit","admin:integrations","admin:templates",
    "admin:labour-rates","admin:stats",
    "workshops:read","workshops:create","workshops:update","workshops:delete","workshops:assign-users",
    "priority:read","insights:dashboard",
  ],
  admin: [
    "jobs:read","jobs:create","jobs:update","jobs:delete","jobs:assign","jobs:transition",
    "estimates:read","estimates:create","estimates:update","estimates:delete",
    "inspections:read","inspections:create","inspections:submit","inspections:reopen",
    "customers:read","customers:create","customers:update","customers:delete",
    "vehicles:read","vehicles:create","vehicles:update",
    "media:upload","media:delete",
    "auth:request","auth:status",
    "deferred:read","deferred:manage","deferred:book",
    "import:parse","import:run",
    "admin:settings","admin:settings:edit","admin:roles",
    "admin:users","admin:users:create","admin:users:delete",
    "admin:audit","admin:integrations","admin:templates",
    "admin:labour-rates","admin:stats",
    "priority:read","insights:dashboard",
  ],
  manager: [
    "jobs:read","jobs:create","jobs:update","jobs:delete","jobs:assign","jobs:transition",
    "estimates:read","estimates:create","estimates:update","estimates:delete",
    "inspections:read","inspections:create","inspections:submit",
    "customers:read","customers:create","customers:update",
    "vehicles:read","vehicles:create","vehicles:update",
    "media:upload","media:delete",
    "auth:request","auth:status",
    "deferred:read","deferred:manage","deferred:book",
    "import:parse","import:run",
    "admin:settings","admin:settings:edit","admin:roles",
    "admin:users","admin:users:create",
    "admin:integrations","admin:templates",
    "admin:labour-rates","admin:stats",
    "priority:read","insights:dashboard",
  ],
  service_advisor: [
    "jobs:read","jobs:create","jobs:update","jobs:transition",
    "estimates:read","estimates:create","estimates:update",
    "inspections:read","inspections:create","inspections:submit",
    "customers:read","customers:create","customers:update",
    "vehicles:read","vehicles:create","vehicles:update",
    "media:upload",
    "auth:request","auth:status",
    "deferred:read","deferred:manage","deferred:book",
    "admin:settings",
    "priority:read","insights:dashboard",
  ],
  workshop_teamleader: [
    "jobs:read","jobs:update","jobs:assign","jobs:transition",
    "estimates:read","estimates:create","estimates:update",
    "inspections:read","inspections:create","inspections:submit","inspections:reopen",
    "customers:read","vehicles:read",
    "media:upload",
    "auth:status",
    "deferred:read",
    "priority:read","insights:dashboard",
  ],
  technician: [
    "jobs:read","jobs:transition",
    "estimates:read",
    "inspections:read","inspections:create","inspections:submit",
    "customers:read","vehicles:read",
    "media:upload",
    "auth:status",
    "deferred:read",
  ],
  receptionist: [
    "jobs:read","jobs:create",
    "customers:read","customers:create","customers:update",
    "vehicles:read","vehicles:create",
  ],
};
