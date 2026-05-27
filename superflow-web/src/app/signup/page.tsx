"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Cable, Wrench } from "lucide-react";
import { PrioraFlowLogo } from "@/components/brand/prioraflow-logo";
import api, { setAccessToken, getApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PRODUCT_LABELS } from "@/lib/product-modes";
import { useAuthStore } from "@/stores/auth";
import type { AuthTokens, ProductMode, User, Workshop } from "@/types";

type SignupResponse = AuthTokens & {
  user: User;
  workshop: Workshop;
  workshopId: string;
};

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialProduct = searchParams.get("product")?.toLowerCase() === "connect" ? "CONNECT" : "WORKSHOP";
  const [workshopName, setWorkshopName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [productMode, setProductMode] = useState<ProductMode>(initialProduct);
  const [loading, setLoading] = useState(false);
  const setAuthState = useAuthStore.setState;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post<SignupResponse>("/auth/signup", {
        workshopName,
        name,
        email,
        password,
        productMode,
        ...(phone.trim() ? { phone } : {}),
      });

      const accessToken = data.access_token ?? data.accessToken;
      if (!accessToken) throw new Error("Missing access token");

      setAccessToken(accessToken);
      localStorage.setItem("currentWorkshopId", data.workshopId);
      setAuthState({
        user: data.user,
        isAuthenticated: true,
        workshops: [data.workshop],
        currentWorkshopId: data.workshopId,
      });

      toast.success(`${PRODUCT_LABELS[productMode]} workspace created`);
      router.push("/jobs");
    } catch (error: any) {
      const { code, message } = getApiError(error);
      if (code === "CONFLICT") {
        toast.error("An account with this email already exists.");
      } else if (code === "VALIDATION_ERROR") {
        toast.error(Array.isArray(message) ? message[0] : message);
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <PrioraFlowLogo className="justify-center" imageClassName="h-24 w-auto" framed />
          <h1 className="mt-3 text-2xl font-bold text-foreground">Start your PrioraFlow trial</h1>
          <p className="mt-1 text-sm text-muted-foreground">Choose your product and create your workspace.</p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
          <div className="space-y-2">
            <Label>Product</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                {
                  mode: "WORKSHOP" as ProductMode,
                  icon: Wrench,
                  title: "Workshop",
                  description: "Full standalone OS with jobs, stock, estimates, and invoicing.",
                },
                {
                  mode: "CONNECT" as ProductMode,
                  icon: Cable,
                  title: "Connect",
                  description: "DMS-connected WIP visibility, loading, bottlenecks, and dashboards.",
                },
              ]).map((option) => {
                const Icon = option.icon;
                const active = productMode === option.mode;
                return (
                  <button
                    key={option.mode}
                    type="button"
                    onClick={() => setProductMode(option.mode)}
                    className={`rounded-lg border p-3 text-left transition ${
                      active ? "border-blue-600 bg-blue-50 text-blue-950 ring-2 ring-blue-100" : "border-border bg-background hover:border-blue-200"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm font-bold">
                      <Icon className="h-4 w-4" />
                      PrioraFlow {option.title}
                    </span>
                    <span className="mt-2 block text-xs leading-5 text-muted-foreground">{option.description}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="workshopName">Workshop name</Label>
            <Input id="workshopName" value={workshopName} onChange={(e) => setWorkshopName(e.target.value)} placeholder="Premium Auto Workshop" required autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Your name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Work email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@workshop.com" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone <span className="text-muted-foreground">optional</span></Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+971..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 8 characters" minLength={8} required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating workspace…" : <>Start free trial <ArrowRight className="ml-2 h-4 w-4" /></>}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account? <a className="font-semibold text-blue-600 hover:underline" href="/login">Sign in</a>
          </p>
        </form>
      </div>
    </div>
  );
}
