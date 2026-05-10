"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { PrioraFlowLogo } from "@/components/brand/prioraflow-logo";
import api, { setAccessToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/auth";
import type { AuthTokens, User, Workshop } from "@/types";

type SignupResponse = AuthTokens & {
  user: User;
  workshop: Workshop;
  workshopId: string;
};

export default function SignupPage() {
  const router = useRouter();
  const [workshopName, setWorkshopName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
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

      toast.success("Workspace created — welcome to PrioraFlow");
      router.push("/jobs");
    } catch (error: any) {
      const message = error?.response?.data?.message || "Could not create workspace";
      toast.error(Array.isArray(message) ? message[0] : message);
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
          <p className="mt-1 text-sm text-muted-foreground">Create your workshop workspace in under a minute.</p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
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
