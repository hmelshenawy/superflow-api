"use client";

import { useState } from "react";
import { useCrmOverview } from "@/hooks/use-crm";
import { CustomerList } from "@/components/crm/customer-list";
import { VehicleList } from "@/components/crm/vehicle-list";
import { Users, UserPlus, Car, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CrmPage() {
  const { data: overview, loading } = useCrmOverview();
  const [activeTab, setActiveTab] = useState("customers");

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">CRM</h1>

      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Customers"
          value={overview?.totalActiveCustomers ?? 0}
          icon={Users}
          loading={loading}
        />
        <StatCard
          title="New This Month"
          value={overview?.newCustomersThisMonth ?? 0}
          icon={UserPlus}
          loading={loading}
        />
        <StatCard
          title="Total Vehicles"
          value={overview?.totalVehicles ?? 0}
          icon={Car}
          loading={loading}
        />
        <StatCard
          title="Overdue Reminders"
          value={overview?.customersWithOverdueReminders ?? 0}
          icon={AlertTriangle}
          loading={loading}
          highlight={!!(overview?.customersWithOverdueReminders && overview.customersWithOverdueReminders > 0)}
        />
      </div>

      {/* Tabbed List */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
        </TabsList>
        <TabsContent value="customers">
          <CustomerList />
        </TabsContent>
        <TabsContent value="vehicles">
          <VehicleList />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  loading,
  highlight,
}: {
  title: string;
  value: number;
  icon: typeof Users;
  loading?: boolean;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-amber-500" : ""}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${highlight ? "text-amber-500" : "text-muted-foreground"}`} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-7 w-16 animate-pulse rounded bg-muted" />
        ) : (
          <div className={`text-2xl font-bold ${highlight ? "text-amber-600" : ""}`}>{value}</div>
        )}
      </CardContent>
    </Card>
  );
}