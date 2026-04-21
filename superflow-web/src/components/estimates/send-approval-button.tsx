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
import { Send } from "lucide-react";
import { toast } from "sonner";

interface Props {
  jobId: string;
}

export function SendApprovalButton({ jobId }: Props) {
  const [sending, setSending] = useState(false);
  const [channel, setChannel] = useState<string>("email");

  const send = async () => {
    setSending(true);
    try {
      await api.post(`/jobs/${jobId}/auth-request`, { channel });
      toast.success(`Approval request sent via ${channel}`);
    } catch {
      toast.error("Failed to send approval request");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={channel} onValueChange={(v) => setChannel(v ?? "")}>
        <SelectTrigger className="h-9 w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="email">Email</SelectItem>
          <SelectItem value="sms">SMS</SelectItem>
          <SelectItem value="whatsapp">WhatsApp</SelectItem>
          <SelectItem value="link">Link</SelectItem>
        </SelectContent>
      </Select>
      <Button size="sm" onClick={send} disabled={sending}>
        <Send className="mr-2 h-4 w-4" />
        {sending ? "Sending…" : "Send to Customer"}
      </Button>
    </div>
  );
}