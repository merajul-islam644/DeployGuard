import { useT } from "./LocalizationProvider";
import { CHECK_DEFINITIONS } from "../../features/deployments/checks";
import type { CheckKey } from "../../features/deployments/checks";
import { ENVIRONMENTS } from "../../features/deployments/environments";
import type { Environment } from "../../features/deployments/environments";

type T = ReturnType<typeof useT>["t"];

// The stored values are still English identifiers; these map them to the
// chosen language for display, falling back to the stored value.
export function environmentLabel(t: T, environment?: string): string {
  if (!environment) return t("common.none", "\u2014");
  if ((ENVIRONMENTS as readonly string[]).includes(environment)) {
    return t(`env.${environment.toLowerCase()}`, environment);
  }
  return environment;
}

const CHECK_KEYS: Record<string, CheckKey> = {
  "Application Load": "application-load",
  Console: "console",
  Network: "network",
  Navigation: "navigation",
  "Broken Links": "broken-links",
  "Primary Content": "primary-content",
  Performance: "performance"
};

export function checkLabel(t: T, name?: string): string {
  if (!name) return t("common.unknown", "Unknown");
  const key = CHECK_KEYS[name] ?? (CHECK_DEFINITIONS.find((check) => check.key === name)?.key as CheckKey | undefined);
  return key ? t(`checks.${key}`, name) : name;
}

const STATUS_KEYS: Record<string, string> = {
  Healthy: "status.healthy",
  "Needs Attention": "status.needsAttention",
  Failed: "status.failed",
  Completed: "status.completed",
  Cancelled: "status.cancelled",
  "Timed Out": "status.timedOut",
  Passed: "status.passed",
  Warning: "status.warning"
};

export function statusLabel(t: T, status?: string): string {
  if (!status) return t("common.unknown", "Unknown");
  const key = STATUS_KEYS[status];
  return key ? t(key, status) : status;
}

const EVIDENCE_KEYS: Record<string, string> = {
  Screenshot: "evidence.screenshot",
  Network: "evidence.network",
  Console: "evidence.console",
  Trace: "evidence.trace",
  DOM: "evidence.dom",
  Timeline: "evidence.timeline"
};

export function evidenceLabel(t: T, kind?: string): string {
  if (!kind) return "";
  const key = EVIDENCE_KEYS[kind];
  return key ? t(key, kind) : kind;
}

const STEP_KEYS: Record<string, string> = {
  "Opening browser": "run.step.openingBrowser",
  "Loading application": "run.step.loadingApplication",
  "Checking console": "run.step.checkingConsole",
  "Inspecting network": "run.step.inspectingNetwork",
  "Testing navigation": "run.step.testingNavigation",
  "Checking broken links": "run.step.checkingBrokenLinks",
  "Capturing evidence": "run.step.capturingEvidence",
  "Running AI analysis": "run.step.runningAi"
};

export function stepLabel(t: T, step?: string): string {
  if (!step) return "";
  const key = STEP_KEYS[step];
  return key ? t(key, step) : step;
}

export function timeAgoLabel(t: T, value?: string): string {
  if (!value) return t("common.never", "Never");
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t("common.never", "Never");
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return t("common.justNow", "just now");
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return t("common.minAgo", "{count} min ago", { count: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return t(hours === 1 ? "common.hrAgo" : "common.hrsAgo", hours === 1 ? "{count} hr ago" : "{count} hrs ago", { count: hours });
  const days = Math.round(hours / 24);
  if (days < 30) return t(days === 1 ? "common.dayAgo" : "common.daysAgo", days === 1 ? "{count} day ago" : "{count} days ago", { count: days });
  return new Date(value).toLocaleDateString(undefined, { dateStyle: "medium" });
}