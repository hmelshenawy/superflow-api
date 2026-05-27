"use client";

import { useAuthStore } from "@/stores/auth";
import { hasAnyPermission } from "@/lib/permissions";
import { ShieldX } from "lucide-react";

interface RequirePermissionProps {
  permissions: string[];
  children: React.ReactNode;
}

export function RequirePermission({ permissions, children }: RequirePermissionProps) {
  const user = useAuthStore((state) => state.user);

  if (!hasAnyPermission(user, permissions)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShieldX className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <h2 className="text-lg font-semibold text-foreground">Access Denied</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          You do not have permission to view this page. Contact your admin to update your role.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}