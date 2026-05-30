"use client";

import { CustomerList } from "@/components/crm/customer-list";

export default function CustomersPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Customers</h1>
      <CustomerList />
    </div>
  );
}