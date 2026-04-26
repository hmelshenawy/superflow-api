"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Trash2, Monitor, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Session {
  id: string;
  created_at: string;
  expires_at: string;
}

export default function SettingsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      const { data } = await api.get("/auth/sessions");
      setSessions(data.sessions ?? []);
    } catch {
      toast.error("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSessions(); }, []);

  const revokeSession = async (id: string) => {
    setRevoking(id);
    try {
      await api.delete(`/auth/sessions/${id}`);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      toast.success("Session revoked");
    } catch {
      toast.error("Failed to revoke session");
    } finally {
      setRevoking(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your account and active sessions.</p>
      </div>

      {/* Active Sessions */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Active Sessions</h2>
        <p className="mt-1 text-sm text-slate-500">Devices or browsers where you're currently logged in. Revoke any you don't recognize.</p>

        {loading ? (
          <div className="mt-6 flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">No active sessions found.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {sessions.map((session, i) => (
              <div key={session.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Monitor className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {i === 0 ? "Current session" : `Session ${sessions.length - i}`}
                    </p>
                    <p className="text-xs text-slate-500">
                      Created: {new Date(session.created_at).toLocaleString()} · Expires: {new Date(session.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {i !== 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                    onClick={() => revokeSession(session.id)}
                    disabled={revoking === session.id}
                  >
                    {revoking === session.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}