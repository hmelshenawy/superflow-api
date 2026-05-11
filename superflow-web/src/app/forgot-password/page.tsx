"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wrench, ArrowLeft, Mail } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSubmitted(true);
    } catch {
      // Always show success to prevent email enumeration
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-green-600">
              <Mail className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Check your email</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              If an account exists for <span className="font-medium text-foreground">{email}</span>, you will receive a password reset link shortly.
            </p>
          </div>
          <div className="rounded-lg border bg-card p-6 shadow-sm text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Didn&apos;t receive the email? Check your spam folder or try again.
            </p>
            <Button variant="outline" className="w-full" onClick={() => { setSubmitted(false); setEmail(""); }}>
              Try again
            </Button>
          </div>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link href="/login" className="text-blue-600 hover:underline">Back to login</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
            <Wrench className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Reset your password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your email and we&apos;ll send you a reset link
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@workshop.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading || !email.trim()}>
            {loading ? "Sending..." : "Send reset link"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/login" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
            <ArrowLeft className="h-3 w-3" />
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}