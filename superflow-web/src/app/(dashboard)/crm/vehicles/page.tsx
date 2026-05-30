"use client";

import { VehicleList } from "@/components/crm/vehicle-list";

export default function VehiclesPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Vehicles</h1>
      <VehicleList />
    </div>
  );
}