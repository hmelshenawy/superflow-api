"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import {
  Wrench,
  ClipboardList,
  Clock,
  Settings,
  LogOut,
  User,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/jobs", label: "Jobs", icon: ClipboardList },
  { href: "/deferred", label: "Deferred Work", icon: Clock },
  { href: "/admin/users-roles", label: "Users & Roles", icon: User },
  { href: "/admin/labour-rates", label: "Labour Rates", icon: Wrench },
  { href: "/admin/templates", label: "Templates", icon: ClipboardList },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  return (
    <aside className="flex h-screen w-60 flex-col border-r bg-slate-50">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <Wrench className="h-6 w-6 text-blue-600" />
        <span className="text-lg font-bold text-slate-800">SuperFlow</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-blue-100 text-blue-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t p-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-800">
              {user?.name || "User"}
            </p>
            <p className="truncate text-xs text-slate-500">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}