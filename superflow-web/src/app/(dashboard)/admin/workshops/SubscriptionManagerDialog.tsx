"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import type { Plan, WorkshopBillingOverview } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreditCard, RefreshCw, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workshopId: string;
  workshopName: string;
  workshopRegion: string | null;
}

function formatCents(cents: number | null, currency: string | null) {
  if (cents == null) return "—";
  const cur = (currency || "AED").toUpperCase();
  try {
    return new Intl.NumberFormat("en-AE", { style: "currency", currency: cur, minimumFractionDigits: 2 }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${cur}`;
  }
}

function statusColor(status: string) {
  switch (status) {
    case "manual_active":
    case "active":
    case "paid": return "default" as const;
    case "trialing": return "secondary" as const;
    case "draft":
    case "pending": return "outline" as const;
    default: return "destructive" as const;
  }
}

export default function SubscriptionManagerDialog({ open, onOpenChange, workshopId, workshopName, workshopRegion }: Props) {
  const [billing, setBilling] = useState<WorkshopBillingOverview | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [activating, setActivating] = useState(false);

  // Invoice creation
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [invoicePlanId, setInvoicePlanId] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  // Mark paid
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("manual");
  const [paymentReference, setPaymentReference] = useState("");

  const refreshBilling = async () => {
    setLoading(true);
    try {
      const [billingRes, pricingRes] = await Promise.all([
        api.get(`/billing/admin/workshops/${workshopId}/billing`),
        api.get("/billing/pricing", { params: { region: workshopRegion || "gcc" } }),
      ]);
      setBilling(billingRes.data);
      setPlans(pricingRes.data);
      if (billingRes.data.subscription) {
        setSelectedPlanId(billingRes.data.subscription.planId);
        setInvoicePlanId(billingRes.data.subscription.planId);
      } else if (pricingRes.data.length > 0) {
        setSelectedPlanId(pricingRes.data[0].id);
        setInvoicePlanId(pricingRes.data[0].id);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load billing data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && workshopId) refreshBilling();
    if (!open) { setBilling(null); setPlans([]); }
  }, [open, workshopId, workshopRegion]);

  const handleActivate = async () => {
    if (!selectedPlanId) return;
    const plan = plans.find(p => p.id === selectedPlanId);
    if (!confirm(`Activate ${plan?.name || selectedPlanId} for ${workshopName}? This will replace the current subscription.`)) return;
    setActivating(true);
    try {
      await api.post("/billing/admin/activate", { workshopId, planId: selectedPlanId, region: workshopRegion || "gcc" });
      toast.success("Subscription activated");
      refreshBilling();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to activate subscription");
    } finally {
      setActivating(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (!invoicePlanId) return;
    setCreatingInvoice(true);
    try {
      await api.post("/billing/admin/invoices", {
        workshopId,
        planId: invoicePlanId,
        region: workshopRegion || "gcc",
        periodStart: periodStart || undefined,
        periodEnd: periodEnd || undefined,
      });
      toast.success("Invoice created");
      refreshBilling();
      setPeriodStart("");
      setPeriodEnd("");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create invoice");
    } finally {
      setCreatingInvoice(false);
    }
  };

  const handleMarkPaid = async (invoiceId: string) => {
    setMarkingPaidId(invoiceId);
    try {
      await api.post(`/billing/admin/invoices/${invoiceId}/mark-paid`, {
        method: paymentMethod,
        reference: paymentReference || undefined,
      });
      toast.success("Invoice marked as paid");
      refreshBilling();
      setMarkingPaidId(null);
      setPaymentMethod("manual");
      setPaymentReference("");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to mark invoice as paid");
    } finally {
      setMarkingPaidId(null);
    }
  };

  const sub = billing?.subscription;
  const invoices = billing?.invoices ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscription — {workshopName}
          </DialogTitle>
          <DialogDescription>Manage billing, plan, and invoices for this workshop</DialogDescription>
        </DialogHeader>

        {loading && !billing ? (
          <div className="flex justify-center py-8"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <Tabs defaultValue="subscription" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="subscription" className="flex-1">Subscription</TabsTrigger>
              <TabsTrigger value="invoices" className="flex-1">Invoices</TabsTrigger>
            </TabsList>

            <TabsContent value="subscription" className="space-y-4 mt-4">
              {/* Current subscription card */}
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Current Plan</span>
                  <Badge variant={sub ? statusColor(sub.status) : "outline"}>
                    {sub ? sub.status.replace(/_/g, " ") : "No subscription"}
                  </Badge>
                </div>
                {sub ? (
                  <>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <span className="text-muted-foreground">Plan</span>
                      <span className="font-medium">{billing?.plan?.name || sub.planId}</span>
                      <span className="text-muted-foreground">Price</span>
                      <span>{formatCents(billing?.plan?.price ?? null, billing?.plan?.currency ?? null)}/mo</span>
                      <span className="text-muted-foreground">Region</span>
                      <span>{(sub.region || "gcc").toUpperCase()}</span>
                      <span className="text-muted-foreground">Period</span>
                      <span>{sub.currentPeriodStartsAt ? new Date(sub.currentPeriodStartsAt).toLocaleDateString() : "—"} — {sub.currentPeriodEndsAt ? new Date(sub.currentPeriodEndsAt).toLocaleDateString() : "—"}</span>
                      {sub.trialEndsAt && (
                        <>
                          <span className="text-muted-foreground">Trial ends</span>
                          <span>{new Date(sub.trialEndsAt).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">This workshop has no active subscription. Select a plan below to activate one.</p>
                )}
              </div>

              {/* Plan selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Activate / Change Plan</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                >
                  <option value="">Select a plan...</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} — {formatCents(p.price, p.currency)}/mo</option>
                  ))}
                </select>
                <Button onClick={handleActivate} disabled={!selectedPlanId || activating} className="w-full">
                  {activating ? "Activating..." : sub ? "Change Plan" : "Activate Subscription"}
                </Button>
              </div>

              {/* Features summary */}
              {billing?.features && billing.features.length > 0 && (
                <div className="rounded-lg border p-3">
                  <p className="text-sm font-medium mb-2">Plan Features</p>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    {billing.features.map((f) => (
                      <div key={f.key} className="flex items-center gap-1">
                        {f.isIncluded ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : <span className="h-3 w-3 rounded-full border border-muted-foreground/30" />}
                        <span className={f.isIncluded ? "" : "text-muted-foreground line-through"}>{f.key.replace(/_/g, " ")}</span>
                        {f.isIncluded && f.ceiling != null && <span className="text-muted-foreground">({f.ceiling})</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="invoices" className="space-y-4 mt-4">
              {/* Create invoice */}
              <div className="rounded-lg border p-4 space-y-3">
                <p className="text-sm font-medium">Create Invoice</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Plan</label>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={invoicePlanId}
                      onChange={(e) => setInvoicePlanId(e.target.value)}
                    >
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} — {formatCents(p.price, p.currency)}/mo</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Period start (optional)</label>
                      <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="h-9" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Period end (optional)</label>
                      <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="h-9" />
                    </div>
                  </div>
                </div>
                <Button onClick={handleCreateInvoice} disabled={!invoicePlanId || creatingInvoice} className="w-full">
                  {creatingInvoice ? "Creating..." : "Create Invoice"}
                </Button>
              </div>

              {/* Invoice list */}
              {invoices.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  No invoices yet
                </div>
              ) : (
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Due</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell className="font-mono text-sm">{inv.invoiceNumber}</TableCell>
                          <TableCell><Badge variant={statusColor(inv.status)}>{inv.status.replace(/_/g, " ")}</Badge></TableCell>
                          <TableCell>{formatCents(inv.totalCents, inv.currency)}</TableCell>
                          <TableCell className="text-sm">{inv.dueAt ? new Date(inv.dueAt).toLocaleDateString() : "—"}</TableCell>
                          <TableCell className="text-right">
                            {inv.status !== "paid" ? (
                              markingPaidId === inv.id ? (
                                <div className="space-y-1">
                                  <select className="w-full rounded border border-input bg-background px-2 py-1 text-xs" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                                    <option value="manual">Manual</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="cash">Cash</option>
                                    <option value="check">Check</option>
                                  </select>
                                  <Input placeholder="Reference (optional)" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} className="h-7 text-xs" />
                                  <Button size="sm" onClick={() => handleMarkPaid(inv.id)} className="w-full">Confirm Payment</Button>
                                </div>
                              ) : (
                                <Button variant="ghost" size="sm" onClick={() => { setMarkingPaidId(inv.id); setPaymentMethod("manual"); setPaymentReference(""); }}>
                                  Mark Paid
                                </Button>
                              )
                            ) : (
                              <Badge variant="default">Paid</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}