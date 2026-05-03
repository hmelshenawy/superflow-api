"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Monitor,
  User,
  Lock,
  Settings2,
  Bell,
  Link2,
  Loader2,
  Save,
  CheckCircle,
  XCircle,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";


const DEFAULT_PRIORITY_WEIGHTS = {
  promiseOverdue: 30,
  promiseDue2h: 20,
  promiseDue6h: 10,
  noPromiseDate: 5,
  customerWaiting: 22,
  customerAngry: 18,
  customerVip: 16,
  customerComeback: 14,
  waitingCustomerDecision: 20,
  partsBackorder: 22,
  partsWaitingWarehouse: 16,
  partsNeedOrder: 12,
  idle12h: 12,
  idle6h: 6,
  stageCheckingDiagnosis: 10,
  stageQcNearDelivery: 10,
  readyToInform: 20,
  highEstimateValue: 8,
  mediumEstimateValue: 4,
};

type PriorityWeights = typeof DEFAULT_PRIORITY_WEIGHTS;

const PRIORITY_MATRIX_GROUPS: Array<{ title: string; description: string; items: Array<{ key: keyof PriorityWeights; label: string; description: string }> }> = [
  { title: "Promise Risk", description: "Only one promise sub-item applies: overdue, due within 2h, or due within 6h.", items: [
    { key: "promiseOverdue", label: "Promise overdue", description: "Promised delivery time already passed." },
    { key: "promiseDue2h", label: "Promise due within 2h", description: "Delivery promise is very close." },
    { key: "promiseDue6h", label: "Promise due within 6h", description: "Delivery promise is approaching today." },
    { key: "noPromiseDate", label: "No promised date", description: "Active job with no promised delivery date set — nudges advisor to add one." },
  ]},
  { title: "Customer Pressure", description: "Customer waiting can stack with one sensitivity sub-item: angry, VIP, or comeback.", items: [
    { key: "customerWaiting", label: "Customer waiting", description: "Customer is waiting now / needs immediate care." },
    { key: "customerAngry", label: "Angry / complaint", description: "Escalation or complaint risk." },
    { key: "customerVip", label: "VIP customer", description: "High-care customer." },
    { key: "customerComeback", label: "Comeback", description: "Repeat repair / comeback case." },
  ]},
  { title: "Customer Decision", description: "Customer-side blocker that still affects flow and follow-up priority.", items: [
    { key: "waitingCustomerDecision", label: "Waiting customer decision", description: "Estimate sent; progress blocked until customer replies." },
  ]},
  { title: "Parts Risk", description: "Only one parts sub-item applies: backorder, waiting warehouse, or need order.", items: [
    { key: "partsBackorder", label: "Backorder", description: "Parts unavailable or no clear ETA." },
    { key: "partsWaitingWarehouse", label: "Waiting warehouse", description: "Waiting to receive/issue parts from warehouse." },
    { key: "partsNeedOrder", label: "Need order", description: "Parts required but not ordered yet / waiting parts status." },
  ]},
  { title: "Idle / Delay Risk", description: "Only one idle sub-item applies.", items: [
    { key: "idle12h", label: "Idle more than 12h", description: "No recent movement for 12+ hours." },
    { key: "idle6h", label: "Idle more than 6h", description: "No recent movement for 6+ hours." },
  ]},
  { title: "Stage Urgency", description: "Only one stage urgency sub-item applies.", items: [
    { key: "stageCheckingDiagnosis", label: "Checking / diagnosis", description: "Active diagnosis/checking needs follow-up." },
    { key: "stageQcNearDelivery", label: "QC / near delivery", description: "Near handover; push completion." },
  ]},
  { title: "Ready to Inform", description: "Car is ready but customer not yet informed.", items: [
    { key: "readyToInform", label: "Ready to inform customer", description: "Car is ready for delivery — advisor must inform the customer." },
  ]},
  { title: "Value Weight", description: "Only one value sub-item applies.", items: [
    { key: "highEstimateValue", label: "High estimate value", description: "Estimate total is 10k+ AED." },
    { key: "mediumEstimateValue", label: "Medium estimate value", description: "Estimate total is 5k+ AED." },
  ]},
];

function normalizePriorityWeights(value: unknown): PriorityWeights {
  const source = typeof value === "object" && value !== null ? value as Partial<Record<keyof PriorityWeights, unknown>> : {};
  return Object.fromEntries(
    Object.entries(DEFAULT_PRIORITY_WEIGHTS).map(([key, fallback]) => {
      const raw = source[key as keyof PriorityWeights];
      const parsed = typeof raw === "number" ? raw : Number(raw);
      return [key, Number.isFinite(parsed) ? Math.max(0, Math.min(30, parsed)) : fallback];
    }),
  ) as PriorityWeights;
}

// ─── Types ────────────────────────────────────────────
interface Session {
  id: string;
  created_at: string;
  expires_at: string;
}

interface Setting {
  id: string;
  key: string;
  value: string;
  value_type: string;
  parsed_value: string | number | boolean | null;
  description?: string;
}

interface Integration {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  last_test_status: string | null;
  last_tested_at: string | null;
  parsed_config: any;
}

// ─── Section Card ─────────────────────────────────────
function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}

function FieldRow({
  label,
  sublabel,
  children,
}: {
  label: string;
  sublabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <Label className="text-sm font-medium text-slate-700">{label}</Label>
        {sublabel && (
          <p className="text-xs text-slate-400">{sublabel}</p>
        )}
      </div>
      <div className="w-full sm:w-64">{children}</div>
    </div>
  );
}

// ─── Profile Section ─────────────────────────────────
function ProfileSection() {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/auth/me")
      .then(({ data }) => {
        setName(data.name || "");
      })
      .catch(() => toast.error("Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch("/auth/profile", { name });
      setName(data.name || "");
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SectionCard title="Profile">
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Profile" description="Update your display name.">
      <FieldRow label="Display Name" sublabel="Shown to other team members">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
      </FieldRow>
      <div className="flex justify-end pt-2">
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save
        </Button>
      </div>
    </SectionCard>
  );
}

// ─── Password Section ─────────────────────────────────
function PasswordSection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (next.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (next !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setSaving(true);
    try {
      await api.post("/auth/change-password", {
        currentPassword: current,
        newPassword: next,
      });
      toast.success("Password changed. Other sessions have been logged out.");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to change password";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard title="Change Password" description="After changing your password, all other sessions will be logged out.">
      <FieldRow label="Current Password">
        <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
      </FieldRow>
      <FieldRow label="New Password" sublabel="Minimum 6 characters">
        <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} />
      </FieldRow>
      <FieldRow label="Confirm New Password">
        <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </FieldRow>
      <div className="flex justify-end pt-2">
        <Button onClick={save} disabled={saving || !current || !next || !confirm} size="sm">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
          Change Password
        </Button>
      </div>
    </SectionCard>
  );
}

// ─── Sessions Section ─────────────────────────────────
function SessionsSection() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/sessions");
      setSessions(data.sessions ?? []);
    } catch {
      toast.error("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const revoke = async (id: string) => {
    setRevoking(id);
    try {
      await api.delete(`/auth/sessions/${id}`);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      toast.success("Session revoked");
    } catch {
      toast.error("Failed to revoke session");
    } finally {
      setRevoking(null);
    }
  };

  return (
    <SectionCard title="Active Sessions" description="Devices where you're logged in. Revoke any you don't recognize.">
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No active sessions.</p>
      ) : (
        <div className="space-y-3">
          {sessions.map((session, i) => (
            <div
              key={session.id}
              className="flex items-center justify-between rounded-xl border border-border bg-muted px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <Monitor className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {i === 0 ? "Current session" : `Session ${sessions.length - i}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Created: {new Date(session.created_at).toLocaleString()} · Expires:{" "}
                    {new Date(session.expires_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {i !== 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                  onClick={() => revoke(session.id)}
                  disabled={revoking === session.id}
                >
                  {revoking === session.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

// ─── Workshop Settings Section ─────────────────────────
function WorkshopSection() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const editableKeys = [
    "currency",
    "default_tax_rate",
    "tax_rate",
    "approval_token_expiry_days",
    "auto_archive_after_hours",
    "job_number_prefix",
  ];

  useEffect(() => {
    api
      .get("/admin/settings")
      .then(({ data }) => setSettings(data))
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  const getValue = (key: string) => {
    const s = settings.find((s) => s.key === key);
    return s ? String(s.parsed_value ?? s.value) : "";
  };

  const setValue = (key: string, value: string) => {
    setSettings((prev) => {
      const exists = prev.find((s) => s.key === key);
      if (exists) {
        return prev.map((s) =>
          s.key === key ? { ...s, parsed_value: value, value } : s
        );
      }
      return [
        ...prev,
        {
          id: "",
          key,
          value,
          value_type: "string",
          parsed_value: value,
          description: "",
        },
      ];
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const updates = editableKeys
        .filter((key) => getValue(key) !== "")
        .map((key) => ({
          key,
          value: getValue(key),
          valueType: key === "default_tax_rate" || key === "tax_rate" || key === "approval_token_expiry_days" || key === "auto_archive_after_hours"
            ? "number"
            : "string",
        }));
      await api.put("/admin/settings", { settings: updates });
      toast.success("Workshop settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SectionCard title="Workshop Settings">
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Workshop Settings" description="General workshop configuration.">
      <FieldRow label="Currency" sublabel="Default currency for estimates (e.g. AED, SAR)">
        <Input value={getValue("currency")} onChange={(e) => setValue("currency", e.target.value)} placeholder="AED" />
      </FieldRow>
      <FieldRow label="Default Tax Rate %" sublabel="Tax rate applied to new estimate lines">
        <Input
          type="number"
          value={getValue("default_tax_rate") || getValue("tax_rate")}
          onChange={(e) => setValue("default_tax_rate", e.target.value)}
          placeholder="5"
        />
      </FieldRow>
      <FieldRow label="Approval Token Expiry (days)" sublabel="How long customer approval links remain valid">
        <Input
          type="number"
          value={getValue("approval_token_expiry_days")}
          onChange={(e) => setValue("approval_token_expiry_days", e.target.value)}
          placeholder="7"
        />
      </FieldRow>
      <FieldRow label="Auto-Archive After (hours)" sublabel="Closed jobs are auto-archived after this many hours">
        <Input
          type="number"
          value={getValue("auto_archive_after_hours")}
          onChange={(e) => setValue("auto_archive_after_hours", e.target.value)}
          placeholder="24"
        />
      </FieldRow>
      <FieldRow label="Job Number Prefix" sublabel="Prefix for job numbers (e.g. SF)">
        <Input value={getValue("job_number_prefix")} onChange={(e) => setValue("job_number_prefix", e.target.value)} placeholder="SF" />
      </FieldRow>
      <Separator />
      <div className="flex justify-end pt-2">
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Settings
        </Button>
      </div>
    </SectionCard>
  );
}


// ─── Priority Matrix Section ──────────────────────────
function PriorityMatrixSection() {
  const [weights, setWeights] = useState<PriorityWeights>(DEFAULT_PRIORITY_WEIGHTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get("/admin/settings")
      .then(({ data }) => {
        const setting = Array.isArray(data) ? data.find((item: Setting) => item.key === "priority_matrix_weights") : null;
        setWeights(normalizePriorityWeights(setting?.parsed_value));
      })
      .catch(() => toast.error("Failed to load priority matrix settings"))
      .finally(() => setLoading(false));
  }, []);

  const setWeight = (key: keyof PriorityWeights, value: string) => {
    const parsed = Number(value);
    setWeights((prev) => ({
      ...prev,
      [key]: Number.isFinite(parsed) ? Math.max(0, Math.min(30, parsed)) : 0,
    }));
  };

  const save = async (nextWeights = weights, message = "Priority matrix saved") => {
    setSaving(true);
    try {
      await api.put("/admin/settings", {
        settings: [{
          key: "priority_matrix_weights",
          value: nextWeights,
          valueType: "json",
          description: "Priority Matrix scoring weights. Values are additive points, not percentages. Each risk group applies only one matching sub-item.",
        }],
      });
      setWeights(nextWeights);
      toast.success(message);
    } catch {
      toast.error("Failed to save priority matrix");
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = () => save(DEFAULT_PRIORITY_WEIGHTS, "Priority matrix reset to defaults");

  if (loading) {
    return (
      <SectionCard title="Priority Matrix">
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Priority Matrix"
      description="Adjust how much each risk factor adds to the job priority score. Values are points, not percentages; they do not need to sum to 100. Most groups apply one matching sub-item; Customer waiting can stack with one sensitivity sub-item."
    >
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
        Recommended range: <strong>0–30</strong>. 0 disables an item. Final job score is capped at 100.
      </div>

      <div className="space-y-5">
        {PRIORITY_MATRIX_GROUPS.map((group) => (
          <div key={group.title} className="rounded-2xl border border-border bg-muted p-4">
            <div className="mb-3">
              <h4 className="text-sm font-semibold text-foreground">{group.title}</h4>
              <p className="text-xs text-muted-foreground">{group.description}</p>
            </div>
            <div className="space-y-3">
              {group.items.map((item) => (
                <FieldRow key={item.key} label={item.label} sublabel={item.description}>
                  <Input
                    type="number"
                    min={0}
                    max={30}
                    step={1}
                    value={weights[item.key]}
                    onChange={(e) => setWeight(item.key, e.target.value)}
                  />
                </FieldRow>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Separator />
      <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={resetDefaults} disabled={saving} size="sm">
          Reset defaults
        </Button>
        <Button onClick={() => save()} disabled={saving} size="sm">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Matrix
        </Button>
      </div>
    </SectionCard>
  );
}

// ─── Notifications Section ────────────────────────────
function NotificationsSection() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get("/admin/settings")
      .then(({ data }) => setSettings(data))
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  const getValue = (key: string) => {
    const s = settings.find((s) => s.key === key);
    return s ? String(s.parsed_value ?? s.value) : "";
  };

  const setValue = (key: string, value: string) => {
    setSettings((prev) => {
      const exists = prev.find((s) => s.key === key);
      if (exists) {
        return prev.map((s) => (s.key === key ? { ...s, parsed_value: value, value } : s));
      }
      return [...prev, { id: "", key, value, value_type: "string", parsed_value: value, description: "" }];
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const keys = [
        "notifications_email_webhook",
        "notifications_sms_webhook",
        "notifications_whatsapp_webhook",
        "notifications_push_webhook",
      ];
      const updates = keys
        .map((key) => ({ key, value: getValue(key), valueType: "string" }));
      await api.put("/admin/settings", { settings: updates });
      toast.success("Notification settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SectionCard title="Notifications">
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Notification Webhooks" description="Configure webhook URLs for sending notifications to customers and staff.">
      <FieldRow label="Email Webhook" sublabel="n8n webhook URL for email notifications">
        <Input value={getValue("notifications_email_webhook")} onChange={(e) => setValue("notifications_email_webhook", e.target.value)} placeholder="https://..." />
      </FieldRow>
      <FieldRow label="SMS Webhook" sublabel="n8n webhook URL for SMS notifications">
        <Input value={getValue("notifications_sms_webhook")} onChange={(e) => setValue("notifications_sms_webhook", e.target.value)} placeholder="https://..." />
      </FieldRow>
      <FieldRow label="WhatsApp Webhook" sublabel="n8n webhook URL for WhatsApp notifications">
        <Input value={getValue("notifications_whatsapp_webhook")} onChange={(e) => setValue("notifications_whatsapp_webhook", e.target.value)} placeholder="https://..." />
      </FieldRow>
      <FieldRow label="Push Webhook" sublabel="n8n webhook URL for push notifications">
        <Input value={getValue("notifications_push_webhook")} onChange={(e) => setValue("notifications_push_webhook", e.target.value)} placeholder="https://..." />
      </FieldRow>
      <Separator />
      <div className="flex justify-end pt-2">
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Webhooks
        </Button>
      </div>
    </SectionCard>
  );
}

// ─── Integrations Section ──────────────────────────────
function IntegrationsSection() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; msg: string }>>({});

  useEffect(() => {
    api
      .get("/admin/integrations")
      .then(({ data }) => setIntegrations(data))
      .catch(() => toast.error("Failed to load integrations"))
      .finally(() => setLoading(false));
  }, []);

  const testConn = async (name: string) => {
    setTesting(name);
    setTestResult((prev) => ({ ...prev, [name]: { ok: false, msg: "Testing..." } }));
    try {
      const { data } = await api.post(`/admin/integrations/${name}/test`);
      setTestResult((prev) => ({
        ...prev,
        [name]: { ok: data.ok, msg: data.ok ? `Connected (HTTP ${data.status})` : `Failed: ${data.response?.slice(0, 100)}` },
      }));
    } catch (err: any) {
      setTestResult((prev) => ({
        ...prev,
        [name]: { ok: false, msg: err.response?.data?.message || "Connection failed" },
      }));
    } finally {
      setTesting(null);
    }
  };

  if (loading) {
    return (
      <SectionCard title="Integrations">
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      </SectionCard>
    );
  }

  if (integrations.length === 0) {
    return (
      <SectionCard title="Integrations" description="Connect external systems via webhooks.">
        <p className="text-sm text-muted-foreground">No integrations configured yet. Add them via the admin API or database.</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Integrations" description="Connected external systems.">
      <div className="space-y-3">
        {integrations.map((integ) => (
          <div key={integ.id} className="flex items-center justify-between rounded-xl border border-border bg-muted px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">{integ.name}</p>
              <p className="text-xs text-muted-foreground">{integ.type}{integ.last_tested_at ? ` · Last tested: ${new Date(integ.last_tested_at).toLocaleDateString()}` : ""}</p>
            </div>
            <div className="flex items-center gap-2">
              {testResult[integ.name] && (
                <span className={`text-xs font-medium ${testResult[integ.name].ok ? "text-emerald-600" : "text-rose-600"}`}>
                  {testResult[integ.name].ok ? <CheckCircle className="mr-1 inline h-3 w-3" /> : <XCircle className="mr-1 inline h-3 w-3" />}
                  {testResult[integ.name].msg}
                </span>
              )}
              <Button variant="outline" size="sm" onClick={() => testConn(integ.name)} disabled={testing === integ.name}>
                {testing === integ.name ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Link2 className="mr-1 h-3 w-3" />}
                Test
              </Button>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// ─── Main Page ────────────────────────────────────────
export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account, workshop configuration, and integrations.
        </p>
      </div>

      <Tabs defaultValue="account" className="w-full">
        <TabsList>
          <TabsTrigger value="account">
            <User className="mr-1.5 h-4 w-4" />
            Account
          </TabsTrigger>
          <TabsTrigger value="workshop">
            <Settings2 className="mr-1.5 h-4 w-4" />
            Workshop
          </TabsTrigger>
          <TabsTrigger value="priority">
            <Settings2 className="mr-1.5 h-4 w-4" />
            Priority Matrix
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="mr-1.5 h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="integrations">
            <Link2 className="mr-1.5 h-4 w-4" />
            Integrations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="mt-6 space-y-6">
          <ProfileSection />
          <PasswordSection />
          <SessionsSection />
        </TabsContent>

        <TabsContent value="workshop" className="mt-6 space-y-6">
          <WorkshopSection />
        </TabsContent>

        <TabsContent value="priority" className="mt-6 space-y-6">
          <PriorityMatrixSection />
        </TabsContent>

        <TabsContent value="notifications" className="mt-6 space-y-6">
          <NotificationsSection />
        </TabsContent>

        <TabsContent value="integrations" className="mt-6 space-y-6">
          <IntegrationsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}