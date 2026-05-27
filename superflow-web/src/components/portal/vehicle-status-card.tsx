import { Car, FileText, Phone } from "lucide-react";
import type { PortalData } from "./types";

interface VehicleStatusCardProps {
  data: PortalData;
  stageLabel: string;
}

export function VehicleStatusCard({ data, stageLabel }: VehicleStatusCardProps) {
  const vehicle = data.job.vehicle;
  const customer = data.job.customer;
  const vehicleName = [vehicle?.year, vehicle?.make, vehicle?.model].filter(Boolean).join(" ") || "Your vehicle";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="grid gap-4 sm:grid-cols-[1.2fr_0.8fr]">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <Car className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Vehicle</p>
            <h2 className="truncate text-xl font-bold text-slate-950 dark:text-white">{vehicleName}</h2>
            <div className="mt-1 flex flex-wrap gap-2 text-sm text-slate-600 dark:text-slate-300">
              {vehicle?.plate ? <span>Plate {vehicle.plate}</span> : null}
              {vehicle?.vin ? <span>VIN {vehicle.vin}</span> : null}
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Repair status</p>
          <p className="mt-1 text-lg font-bold text-slate-950 dark:text-white">{stageLabel}</p>
          {customer?.phone ? (
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
              <Phone className="h-3.5 w-3.5" />
              {customer.phone}
            </p>
          ) : null}
        </div>
      </div>

      {data.job.customer_concern ? (
        <div className="mt-4 flex gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">What you asked us to check</p>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{data.job.customer_concern}</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
