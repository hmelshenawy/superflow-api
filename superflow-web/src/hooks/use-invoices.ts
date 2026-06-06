"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  issueInvoice,
  cancelInvoice,
  generateInvoiceFromJob,
  downloadInvoicePdf,
  type Invoice,
  type CreateInvoiceInput,
  type UpdateInvoiceInput,
  type InvoiceListFilters,
  type PaginatedInvoices,
} from "@/lib/invoices";

export function useInvoiceList(filters?: InvoiceListFilters) {
  const [data, setData] = useState<PaginatedInvoices | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getInvoices(filters);
      setData(result);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, [
    filters?.status,
    filters?.search,
    filters?.customer_id,
    filters?.vehicle_id,
    filters?.branch_id,
    filters?.page,
    filters?.limit,
  ]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useInvoiceDetail(id: string | null) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!id) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const result = await getInvoice(id);
      setInvoice(result);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load invoice");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const mutate = useCallback(
    async (mutator: () => Promise<Invoice>) => {
      if (!id) return null;
      setLoading(true);
      try {
        const result = await mutator();
        setInvoice(result);
        return result;
      } catch (err: any) {
        setError(err?.response?.data?.message || "Operation failed");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [id],
  );

  const doUpdate = useCallback(
    async (payload: UpdateInvoiceInput) => mutate(() => updateInvoice(id!, payload)),
    [id, mutate],
  );

  const doIssue = useCallback(async () => mutate(() => issueInvoice(id!)), [id, mutate]);
  const doCancel = useCallback(async () => mutate(() => cancelInvoice(id!)), [id, mutate]);

  const doDownloadPdf = useCallback(async () => {
    if (!id) return;
    const blob = await downloadInvoicePdf(id);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }, [id]);

  return {
    invoice,
    loading,
    error,
    refetch: fetch,
    update: doUpdate,
    issue: doIssue,
    cancel: doCancel,
    downloadPdf: doDownloadPdf,
  };
}

export function useInvoiceMutations() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wrap = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | null> => {
      setSubmitting(true);
      setError(null);
      try {
        return await fn();
      } catch (err: any) {
        const msg = err?.response?.data?.message || "Operation failed";
        setError(msg);
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [],
  );

  const doCreate = useCallback(
    async (payload: CreateInvoiceInput) => wrap(() => createInvoice(payload)),
    [wrap],
  );

  const doGenerateFromJob = useCallback(
    async (jobId: string) => wrap(() => generateInvoiceFromJob(jobId)),
    [wrap],
  );

  return { create: doCreate, generateFromJob: doGenerateFromJob, submitting, error };
}
