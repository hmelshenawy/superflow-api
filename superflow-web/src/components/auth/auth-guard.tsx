"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import Image from "next/image";

const PUBLIC_ROUTES = ["/login", "/signup", "/select-workshop"];

function LoadingShell() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <Image src="/prioraflow-icon.png" alt="PrioraFlow" width={40} height={40} className="h-10 w-10 animate-pulse rounded-[30%] object-contain" />
        <div className="h-2 w-24 animate-pulse rounded-full bg-slate-200" />
      </div>
    </div>
  );
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loadUser, workshops, currentWorkshopId } = useAuthStore();
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

    loadUser().finally(() => setChecking(false));
  }, [loadUser, pathname]);

  useEffect(() => {
    if (!hydrated || checking) return;
    if (!isAuthenticated && !PUBLIC_ROUTES.includes(pathname)) {
      router.replace("/login");
      return;
    }
    // Authenticated users with multiple workshops but no selection must pick one
    if (isAuthenticated && !currentWorkshopId && workshops.length > 1 && !PUBLIC_ROUTES.includes(pathname)) {
      router.replace("/select-workshop");
    }
  }, [hydrated, checking, isAuthenticated, currentWorkshopId, workshops.length, pathname, router]);

  if (!hydrated || checking) {
    return <LoadingShell />;
  }

  if (!isAuthenticated && !PUBLIC_ROUTES.includes(pathname)) {
    return <LoadingShell />;
  }

  return <>{children}</>;
}
