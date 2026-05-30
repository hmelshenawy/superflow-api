export function formatDuration(minutes: number): string {
  const safe = Math.max(0, Number(minutes) || 0);
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;
  if (!hours) return `${mins} min`;
  if (!mins) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function dateParts(date: Date, timezone?: string) {
  if (!timezone) {
    return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate(), hour: date.getHours(), minute: date.getMinutes() };
  }
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(date);
  const pick = (type: string) => Number(parts.find((part) => part.type === type)?.value || 0);
  return { year: pick("year"), month: pick("month"), day: pick("day"), hour: pick("hour"), minute: pick("minute") };
}

export function formatTime(isoString: string, timezone?: string): string {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: timezone }).format(date);
}

export function formatDateShort(date: Date | string, timezone?: string): string {
  const d = typeof date === "string" ? new Date(date.includes("T") ? date : `${date}T00:00:00`) : date;
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: timezone }).format(d);
}

export function formatDateLong(date: Date | string, timezone?: string): string {
  const d = typeof date === "string" ? new Date(date.includes("T") ? date : `${date}T00:00:00`) : date;
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: timezone }).format(d);
}

export function formatTimeRange(startIso: string, durationMin: number, timezone?: string): string {
  const start = new Date(startIso);
  const end = new Date(start.getTime() + durationMin * 60_000);
  return `${formatTime(start.toISOString(), timezone)} – ${formatTime(end.toISOString(), timezone)}`;
}

export function toDateString(date: Date, timezone?: string): string {
  const parts = dateParts(date, timezone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function appointmentLocalTime(isoString: string, timezone?: string): string {
  const parts = dateParts(new Date(isoString), timezone);
  return `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

export function getDayOfWeek(dateString: string): number {
  return new Date(`${dateString}T00:00:00`).getDay();
}

export function isToday(dateString: string): boolean {
  return toDateString(new Date()) === dateString;
}

export function addDays(date: Date, n: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + n);
  return next;
}

export function timeToMinutes(time: string): number {
  const [hour, minute] = time.slice(0, 5).split(":").map(Number);
  return hour * 60 + minute;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function displaySlotTime(time: string): string {
  const [hour, minute] = time.slice(0, 5).split(":");
  return `${Number(hour)}:${minute}`;
}
