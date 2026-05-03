"use client";

import { useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface Props {
  jobId: string;
  onSent?: () => void | Promise<void>;
}

export function SendApprovalButton({ jobId, onSent }: Props) {
  const [sending, setSending] = useState(false);
  const [channel, setChannel] = useState<string>("link");
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const send = async () => {
    setSending(true);
    try {
      const { data } = await api.post(`/jobs/${jobId}/auth-request`, { channel });
      setPortalUrl(data.portalUrl);
      await onSent?.();
      toast.success(channel === "link" ? "Link generated" : `Approval request sent via ${channel}`);
    } catch {
      toast.error("Failed to send approval request");
    } finally {
      setSending(false);
    }
  };

  const copyLink = () => {
    if (!portalUrl) return;
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Select value={channel} onValueChange={(v) => setChannel(v ?? "")}>
          <SelectTrigger className="h-9 w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="link">Link</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="sms">SMS</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={send} disabled={sending}>
          <Send className="mr-2 h-4 w-4" />
          {sending ? "Sending…" : "Send to Customer"}
        </Button>
      </div>
      {portalUrl && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
          <input
            type="text"
            readOnly
            value={portalUrl}
            className="flex-1 bg-transparent text-xs text-emerald-800 outline-none"
          />
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={copyLink} aria-label="Copy approval link">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
          </Button>
        </div>
      )}
    </div>
  );
}