"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import type { Workshop } from "@/types";

export default function SelectWorkshopPage() {
  const router = useRouter();
  const { user, workshops, selectWorkshop, currentWorkshopId, isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    // If user already has a workshop selected, redirect to jobs
    if (currentWorkshopId) {
      router.push("/jobs");
      return;
    }
  }, [isAuthenticated, currentWorkshopId, router]);

  const handleSelect = async (workshopId: string) => {
    setLoading(workshopId);
    setError(null);
    try {
      await selectWorkshop(workshopId);
      router.push("/jobs");
    } catch {
      setError("Failed to select workshop. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Select Workshop</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Welcome back, {user?.name || user?.email}. Choose a workshop to continue.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {(workshops ?? []).map((w: Workshop) => (
            <button
              key={w.id}
              onClick={() => handleSelect(w.id)}
              disabled={loading !== null}
              className="w-full p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-md transition-all text-left group disabled:opacity-50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    {w.name}
                  </h3>
                  {w.address && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{w.address}</p>
                  )}
                </div>
                {loading === w.id ? (
                  <svg className="animate-spin h-5 w-5 text-blue-500" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-gray-400 group-hover:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            </button>
          ))}
        </div>

        {(workshops ?? []).length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">No workshops available.</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Contact your administrator to be assigned to a workshop.</p>
          </div>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={() => useAuthStore.getState().logout()}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}