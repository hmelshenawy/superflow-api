import type { PortalDecision, PortalPhoto, QuoteGroup } from "./types";

export const DECISION_LABEL: Record<PortalDecision, string> = {
  approved: "Approve",
  declined: "Decline",
  deferred: "Defer",
};

export const DECISION_STATUS_LABEL: Record<PortalDecision, string> = {
  approved: "Approved",
  declined: "Declined",
  deferred: "Deferred",
};

export const formatMoney = (currency: string, value: number) =>
  `${currency} ${Number(value || 0).toFixed(2)}`;

export const getPortalApiBase = () => {
  const configured = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (configured) return configured;
  if (typeof window !== "undefined" && window.location.port === "3000") return "http://localhost:3002/api";
  return "/api";
};

export const mediaUrl = (token: string, photo: PortalPhoto) =>
  photo.url || `${getPortalApiBase()}/portal/${token}/media/${photo.id}`;

export const getActionableLines = (group: QuoteGroup) =>
  group.lines.filter((line) => line.is_actionable);

export const getGroupSummary = (group: QuoteGroup) => {
  const concern = group.concern;
  return (
    concern?.description ||
    concern?.technician_finding ||
    group.finding?.tech_notes ||
    group.lines.find((line) => line.description)?.description ||
    "Review this recommendation from the workshop."
  );
};

export const getGroupPhotos = (group: QuoteGroup) => {
  const photos = [...(group.finding?.photos ?? []), ...(group.concern?.photos ?? [])];
  const seen = new Set<string>();
  return photos.filter((photo) => {
    if (seen.has(photo.id)) return false;
    seen.add(photo.id);
    return true;
  });
};

export const getSeverityLabel = (severity: QuoteGroup["severity"]) => {
  if (severity === "red") return "Needs attention";
  if (severity === "amber") return "Recommended";
  return null;
};
