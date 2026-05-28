"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import type {
  CrmCustomerDashboard,
  CrmOverview,
  CrmCustomer,
  CustomerActivity,
  CrmVehicleListItem,
  CrmVehicleDashboard,
  ActivityType,
} from "@/types";

// ─── Overview ──────────────────────────────────────────────
export function useCrmOverview() {
  const [data, setData] = useState<CrmOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/crm/overview")
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || "Failed to load CRM overview"))
      .finally(() => setLoading(false));
  }, []);

  const refetch = useCallback(() => {
    setLoading(true);
    api
      .get("/crm/overview")
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || "Failed to load CRM overview"))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error, refetch };
}

// ─── Customer List ─────────────────────────────────────────
export function useCrmCustomers(params?: {
  search?: string;
  tag?: string;
  lead_source?: string;
  page?: number;
  limit?: number;
}) {
  const [data, setData] = useState<{ items: CrmCustomer[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .get("/crm/customers", { params })
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || "Failed to load customers"))
      .finally(() => setLoading(false));
  }, [params?.search, params?.tag, params?.lead_source, params?.page, params?.limit]);

  return { data, loading, error };
}

// ─── Customer Dashboard (360°) ─────────────────────────────
export function useCrmCustomerDashboard(customerId: string | null) {
  const [data, setData] = useState<CrmCustomerDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customerId) return;
    setLoading(true);
    api
      .get(`/crm/customers/${customerId}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || "Failed to load customer"))
      .finally(() => setLoading(false));
  }, [customerId]);

  const refetch = useCallback(() => {
    if (!customerId) return;
    setLoading(true);
    api
      .get(`/crm/customers/${customerId}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || "Failed to load customer"))
      .finally(() => setLoading(false));
  }, [customerId]);

  return { data, loading, error, refetch };
}

// ─── Activity CRUD ─────────────────────────────────────────
export function useCrmActivities(customerId: string | null) {
  const [activities, setActivities] = useState<CustomerActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customerId) return;
    api
      .get(`/crm/customers/${customerId}/activities`)
      .then((res) => setActivities(res.data))
      .finally(() => setLoading(false));
  }, [customerId]);

  const addActivity = useCallback(
    async (type: ActivityType, content?: string, due_at?: string) => {
      const res = await api.post(`/crm/customers/${customerId}/activities`, { type, content, due_at });
      setActivities((prev) => [res.data, ...prev]);
      return res.data;
    },
    [customerId]
  );

  const markDone = useCallback(async (activityId: string) => {
    const res = await api.patch(`/crm/activities/${activityId}`, { is_done: true });
    setActivities((prev) => prev.map((a) => (a.id === activityId ? { ...a, is_done: true } : a)));
    return res.data;
  }, []);

  const deleteActivity = useCallback(async (activityId: string) => {
    await api.delete(`/crm/activities/${activityId}`);
    setActivities((prev) => prev.filter((a) => a.id !== activityId));
  }, []);

  return { activities, loading, addActivity, markDone, deleteActivity };
}

// ─── Vehicle List ──────────────────────────────────────────
export function useCrmVehicles(params?: { search?: string; page?: number; limit?: number }) {
  const [data, setData] = useState<{ items: CrmVehicleListItem[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .get("/crm/vehicles", { params })
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || "Failed to load vehicles"))
      .finally(() => setLoading(false));
  }, [params?.search, params?.page, params?.limit]);

  return { data, loading, error };
}

// ─── Vehicle Dashboard ─────────────────────────────────────
export function useCrmVehicleDashboard(vehicleId: string | null) {
  const [data, setData] = useState<CrmVehicleDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!vehicleId) return;
    setLoading(true);
    api
      .get(`/crm/vehicles/${vehicleId}`)
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, [vehicleId]);

  return { data, loading, error };
}

// ─── Customer CRUD ─────────────────────────────────────────
export function useCrmCustomerMutations() {
  const createCustomer = useCallback(async (data: {
    name: string;
    email?: string;
    phone?: string;
    mobile?: string;
    preferred_contact?: string;
    language?: string;
    notes?: string;
    address?: string;
    city?: string;
    tags?: string[];
    lead_source?: string;
  }) => {
    const res = await api.post("/crm/customers", data);
    return res.data;
  }, []);

  const updateCustomer = useCallback(
    async (
      customerId: string,
      data: {
        name?: string;
        email?: string;
        phone?: string;
        mobile?: string;
        preferred_contact?: string;
        language?: string;
        notes?: string;
        address?: string;
        city?: string;
        tags?: string[];
        lead_source?: string;
        is_active?: boolean;
      }
    ) => {
      const res = await api.patch(`/crm/customers/${customerId}`, data);
      return res.data;
    },
    []
  );

  return { createCustomer, updateCustomer };
}