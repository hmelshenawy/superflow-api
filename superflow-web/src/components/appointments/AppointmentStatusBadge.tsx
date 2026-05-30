import type { AppointmentStatus } from "@/types/appointments";
import { cn } from "@/lib/utils";

export const APPOINTMENT_STATUS_META: Record<AppointmentStatus, { label: string; bg: string; text: string; border: string }> = {
  scheduled: { label: "Scheduled", bg: "#E6F1FB", text: "#0C447C", border: "#B5D4F4" },
  waiting: { label: "Waiting", bg: "#E6F1FB", text: "#0C447C", border: "#B5D4F4" },
  in_progress: { label: "In progress", bg: "#EAF3DE", text: "#27500A", border: "#C0DD97" },
  on_hold: { label: "On hold", bg: "#FAEEDA", text: "#633806", border: "#FAC775" },
  done: { label: "Done", bg: "#F1EFE8", text: "#444441", border: "#D3D1C7" },
  cancelled: { label: "Cancelled", bg: "#FCEBEB", text: "#791F1F", border: "#F7C1C1" },
};

export function AppointmentStatusBadge({ status, size = "sm" }: { status: AppointmentStatus; size?: "sm" | "md" }) {
  const meta = APPOINTMENT_STATUS_META[status] ?? APPOINTMENT_STATUS_META.scheduled;
  return (
    <span
      className={cn("inline-flex items-center rounded-full border font-semibold", size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs")}
      style={{ backgroundColor: meta.bg, color: meta.text, borderColor: meta.border }}
    >
      {meta.label}
    </span>
  );
}
