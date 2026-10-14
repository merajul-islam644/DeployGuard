export function formatDuration(seconds?: number): string {
  if (seconds === undefined || seconds === null || Number.isNaN(seconds)) return "\u2014";
  return `${Number(seconds).toFixed(1)}s`;
}

export function formatDateTime(value?: string, locale?: string): string {
  if (!value) return "\u2014";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
}

export function formatDate(value?: string, locale?: string): string {
  if (!value) return "\u2014";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(locale, { dateStyle: "medium" });
}

export function timeAgo(value?: string): string {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatDate(value);
}

export type PillTone = "good" | "warn" | "bad" | "neutral";

export function healthTone(status?: string): PillTone {
  if (status === "Healthy") return "good";
  if (status === "Needs Attention") return "warn";
  if (status === "Failed") return "bad";
  return "neutral";
}

export function verificationTone(status?: string): PillTone {
  if (status === "Completed") return "good";
  if (status === "Failed") return "bad";
  if (status === "Cancelled" || status === "Timed Out") return "warn";
  return "neutral";
}

export function outcomeTone(outcome?: string): PillTone {
  if (outcome === "Passed") return "good";
  if (outcome === "Warning") return "warn";
  if (outcome === "Failed") return "bad";
  return "neutral";
}

export function scoreTone(score?: number): string {
  if (score === undefined) return "hsl(var(--muted-foreground))";
  if (score >= 90) return "hsl(var(--success-fg))";
  if (score >= 60) return "hsl(var(--warning-fg))";
  return "hsl(var(--destructive))";
}