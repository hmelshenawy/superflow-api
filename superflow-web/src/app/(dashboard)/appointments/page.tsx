"use client";

import { AppointmentBoard } from "@/components/appointments/AppointmentBoard";
import { formatDateLong } from "@/utils/appointments";

export default function AppointmentsPage() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Appointments</h1>
        <p className="mt-1 text-sm text-muted-foreground">{formatDateLong(new Date())}</p>
      </div>
      <AppointmentBoard />
    </div>
  );
}
