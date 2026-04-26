"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Cookies from "js-cookie";
import { useAuthStore } from "@/stores/auth";

const PUBLIC_ROUTES = ["/login"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loadUser } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    setHydrated(true);
    if (Cookies.get("access_token")) {
      loadUser().finally(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, [loadUser]);

  useEffect(() => {
    if (!hydrated || checking) return;
    if (!isAuthenticated && !PUBLIC_ROUTES.includes(pathname)) {
      router.replace("/login");
    }
  }, [hydrated, checking, isAuthenticated, pathname, router]);

  if (!hydrated || checking) {
    return null;
  }

  if (!isAuthenticated && !PUBLIC_ROUTES.includes(pathname)) {
    return null;
  }

  return <>{children}</>;
}