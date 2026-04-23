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

  useEffect(() => {
    setHydrated(true);
    if (Cookies.get("access_token")) {
      loadUser();
    }
  }, [loadUser]);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated && !PUBLIC_ROUTES.includes(pathname)) {
      router.replace("/login");
    }
  }, [hydrated, isAuthenticated, pathname, router]);

  if (!hydrated) {
    return null;
  }

  if (!isAuthenticated && !PUBLIC_ROUTES.includes(pathname)) {
    return null;
  }

  return <>{children}</>;
}
