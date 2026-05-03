"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Cookies from "js-cookie";
import { useAuthStore } from "@/stores/auth";
import { Wrench } from "lucide-react";

const PUBLIC_ROUTES = ["/login"];

function LoadingShell() {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-100">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/15 ring-1 ring-blue-500/30">
          <Wrench className="h-5 w-5 animate-pulse text-blue-400" />
        </div>
        <div className="h-2 w-24 animate-pulse rounded-full bg-slate-200" />
      </div>
    </div>
  );
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loadUser } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    setHydrated(true);

    if (PUBLIC_ROUTES.includes(pathname)) {
      setChecking(false);
      return;
    }

    if (Cookies.get("access_token")) {
      loadUser().finally(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, [loadUser, pathname]);

  useEffect(() => {
    if (!hydrated || checking) return;
    if (!isAuthenticated && !PUBLIC_ROUTES.includes(pathname)) {
      router.replace("/login");
    }
  }, [hydrated, checking, isAuthenticated, pathname, router]);

  if (!hydrated || checking) {
    return <LoadingShell />;
  }

  if (!isAuthenticated && !PUBLIC_ROUTES.includes(pathname)) {
    return <LoadingShell />;
  }

  return <>{children}</>;
}