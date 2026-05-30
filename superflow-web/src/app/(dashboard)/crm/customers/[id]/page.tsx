"use client";

import { useParams, useRouter } from "next/navigation";
import { useCrmCustomerDashboard, useCrmActivities, useCrmCustomerMutations } from "@/hooks/use-crm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Phone,
  Mail,
  MessageSquare,
  MapPin,
  Calendar,
  Car,
  Wrench,
  DollarSign,
  Plus,
  CheckCircle,
  Clock,
} from "lucide-react";

const ACTIVITY_ICONS: Record<string, typeof Phone> = {
  call: Phone,
  visit: Calendar,
  note: CheckCircle,
  reminder: Clock,
  email: Mail,
  message: MessageSquare,
};

const ACTIVITY_COLORS: Record<string, string> = {
  call: "bg-blue-100 text-blue-700",
  visit: "bg-green-100 text-green-700",
  note: "bg-slate-100 text-slate-700",
  reminder: "bg-amber-100 text-amber-700",
  email: "bg-purple-100 text-purple-700",
  message: "bg-sky-100 text-sky-700",
};

const TAG_COLORS: Record<string, string> = {
  VIP: "bg-amber-100 text-amber-800",
  fleet: "bg-blue-100 text-blue-800",
  corporate: "bg-purple-100 text-purple-800",
  comeback: "bg-green-100 text-green-800",
  new: "bg-sky-100 text-sky-800",
};

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;

  const { data, loading, error, refetch } = useCrmCustomerDashboard(customerId);
  const { activities, loading: activitiesLoading, addActivity, markDone } = useCrmActivities(customerId);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-muted" />
          <div className="h-32 rounded bg-muted" />
          <div className="h-64 rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          Error loading customer: {error || "Not found"}
        </div>
      </div>
    );
  }

  const { customer, vehicles, stats, recentActivities, recentJobs } = data;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/crm")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{customer.name || "Unknown Customer"}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {customer.phone && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  {customer.phone}
                </span>
              )}
              {customer.email && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  {customer.email}
                </span>
              )}
              {customer.mobile && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {customer.mobile}
                </span>
              )}
            </div>
            {(customer.address || customer.city) && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <MapPin className="h-3.5 w-3.5" />
                {[customer.address, customer.city].filter(Boolean).join(", ")}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {Array.isArray(customer.tags) &&
            customer.tags.map((tag: string) => (
              <Badge key={tag} className={TAG_COLORS[tag] || ""}>
                {tag}
              </Badge>
            ))}
          {customer.lead_source && (
            <Badge variant="outline">{customer.lead_source}</Badge>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{stats.totalJobs}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{stats.totalRevenue.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vehicles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Car className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{vehicles.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last Visit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <span className="text-lg font-bold">
                {stats.lastVisitDate ? new Date(stats.lastVisitDate).toLocaleDateString() : "Never"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Vehicles, Activities, Jobs */}
      <Tabs defaultValue="vehicles">
        <TabsList>
          <TabsTrigger value="vehicles">Vehicles ({vehicles.length})</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="jobs">Recent Jobs</TabsTrigger>
        </TabsList>

        <TabsContent value="vehicles" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Vehicles
                <Button size="sm" variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Vehicle
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {vehicles.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No vehicles found</p>
              ) : (
                <div className="space-y-2">
                  {vehicles.map((v: any) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/crm/vehicles/${v.id}`)}
                    >
                      <div>
                        <div className="font-medium">
                          {v.year ? `${v.year} ` : ""}
                          {v.make} {v.model}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {v.plate || "No plate"} • {v.vin?.slice(-8) || "No VIN"}
                        </div>
                      </div>
                      <Car className="h-5 w-5 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Activity Timeline
                <Button size="sm" variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Log Activity
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activitiesLoading ? (
                <p className="text-center text-muted-foreground py-4">Loading...</p>
              ) : activities.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No activities yet</p>
              ) : (
                <div className="space-y-3">
                  {activities.map((activity: any) => {
                    const Icon = ACTIVITY_ICONS[activity.type] || CheckCircle;
                    const colorClass = ACTIVITY_COLORS[activity.type] || "bg-slate-100";
                    return (
                      <div key={activity.id} className="flex items-start gap-3">
                        <div className={`rounded-full p-2 ${colorClass}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium capitalize">{activity.type}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(activity.created_at).toLocaleString()}
                            </span>
                          </div>
                          {activity.content && (
                            <p className="text-sm text-muted-foreground mt-1">{activity.content}</p>
                          )}
                          {activity.type === "reminder" && !activity.is_done && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2"
                              onClick={() => markDone(activity.id)}
                            >
                              <CheckCircle className="mr-2 h-3 w-3" />
                              Mark Done
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Recent Jobs
                <Button size="sm" variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Job
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentJobs.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No jobs yet</p>
              ) : (
                <div className="space-y-2">
                  {recentJobs.map((job: any) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <div className="font-medium">#{job.job_number || job.id.slice(0, 8)}</div>
                        <div className="text-sm text-muted-foreground">
                          {job.vehicles?.make} {job.vehicles?.model} • {job.status}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(job.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}