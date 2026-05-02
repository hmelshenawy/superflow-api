"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { Sidebar } from "@/components/layout/sidebar";
import { Toaster } from "@/components/ui/sonner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-slate-100">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="min-h-full p-3 lg:p-4">{children}</div>
        </main>
      </div>
      <Toaster position="top-right" richColors closeButton duration={4000} toastOptions={{ style: { maxWidth: '340px', padding: '10px 14px' } }} />
    </AuthGuard>
  );
}
