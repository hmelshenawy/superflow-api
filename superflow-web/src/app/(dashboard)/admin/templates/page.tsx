"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ClipboardList, ShieldCheck } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import InspectionTemplatesTab from "@/components/templates/inspection-templates-tab";
import QcTemplatesTab from "@/components/templates/qc-templates-tab";

export default function TemplatesPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "qc" ? "qc" : "inspection";
  const [tab, setTab] = useState(initialTab);

  return (
    <RequirePermission permissions={["admin:templates"]}>
      <div className="space-y-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v)}>
          <TabsList className="grid w-full grid-cols-2 rounded-xl">
            <TabsTrigger value="inspection" className="rounded-xl">
              <ClipboardList className="mr-2 h-4 w-4" /> Inspection
            </TabsTrigger>
            <TabsTrigger value="qc" className="rounded-xl">
              <ShieldCheck className="mr-2 h-4 w-4" /> QC
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inspection" className="mt-4">
            <InspectionTemplatesTab />
          </TabsContent>
          <TabsContent value="qc" className="mt-4">
            <QcTemplatesTab />
          </TabsContent>
        </Tabs>
      </div>
    </RequirePermission>
  );
}
