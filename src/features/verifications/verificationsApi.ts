import { blocksClient } from "../../lib/blocks/client";
import { ALL_CHECK_KEYS } from "../deployments/checks";

// One running verification per deployment at a time. Soft guard so a double
// click never starts two runs; the runs themselves live in Blocks Data.
const inFlight = new Set<string>();

export function isVerificationInFlight(deploymentId: string): boolean {
  return inFlight.has(deploymentId);
}

export function markInFlight(deploymentId: string): boolean {
  if (inFlight.has(deploymentId)) return false;
  inFlight.add(deploymentId);
  return true;
}

export function clearInFlight(deploymentId: string): void {
  inFlight.delete(deploymentId);
}

export const VERIFICATION_STATUSES = ["Completed", "Failed", "Cancelled", "Timed Out"] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const HEALTH_STATUSES = ["Healthy", "Needs Attention", "Failed"] as const;
export type HealthStatus = (typeof HEALTH_STATUSES)[number];

export const CHECK_OUTCOMES = ["Passed", "Warning", "Failed"] as const;
export type CheckOutcome = (typeof CHECK_OUTCOMES)[number];

export const EVIDENCE_KINDS = ["Screenshot", "Network", "Console", "Trace", "DOM", "Timeline"] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

export type Verification = {
  ItemId?: string;
  CreatedDate?: string;
  deploymentId?: string;
  deploymentName?: string;
  environment?: string;
  url?: string;
  status?: string;
  healthStatus?: string;
  score?: number;
  durationSeconds?: number;
  startedAt?: string;
  triggeredBy?: string;
  triggerType?: string;
  reason?: string;
  checks?: string[];
  summary?: string;
  analysisSeverity?: string;
  warnings?: string[];
  recommendations?: string[];
};

export type CheckResultRecord = {
  ItemId?: string;
  verificationId?: string;
  checkKey?: string;
  checkName?: string;
  outcome?: string;
  result?: string;
  weight?: number;
  durationSeconds?: number;
  detail?: string[];
};

export type EvidenceRecord = {
  ItemId?: string;
  verificationId?: string;
  kind?: string;
  capture?: string;
  capturedAt?: string;
  url?: string;
  viewport?: string;
  browser?: string;
  notCaptured?: boolean;
  rows?: string[];
};

export type ActivityRecord = {
  ItemId?: string;
  verificationId?: string;
  stepName?: string;
  state?: string;
  notedAt?: string;
  note?: string;
  order?: number;
};

export const VERIFICATION_FIELDS = [
  "ItemId",
  "deploymentId",
  "deploymentName",
  "environment",
  "url",
  "status",
  "healthStatus",
  "score",
  "durationSeconds",
  "startedAt",
  "triggeredBy",
  "triggerType",
  "reason",
  "checks",
  "summary",
  "analysisSeverity",
  "warnings",
  "recommendations",
  "CreatedDate"
];

const verifications = blocksClient.data.collection<Verification>("Verification", { fields: VERIFICATION_FIELDS });
const checkResults = blocksClient.data.collection<CheckResultRecord>("CheckResult");
const evidences = blocksClient.data.collection<EvidenceRecord>("Evidence");
const activities = blocksClient.data.collection<ActivityRecord>("ActivityEntry");

export function verificationId(verification: Verification): string {
  if (!verification.ItemId) throw new Error("Verification id is missing.");
  return String(verification.ItemId);
}

export async function listVerifications(): Promise<Verification[]> {
  const response = await verifications.list({ pageNo: 1, pageSize: 200, sort: { CreatedDate: -1 } });
  return normalizeItems<Verification>(response, "getVerifications");
}

export async function getVerification(id: string): Promise<Verification | undefined> {
  const response = await verifications.get(id);
  return normalizeOne<Verification>(response, "getVerification");
}

export async function createVerification(input: Record<string, unknown>): Promise<string> {
  const response = await verifications.create(input);
  return mutationItemId(response, "insertVerification");
}

export async function updateVerification(id: string, input: Record<string, unknown>): Promise<void> {
  const response = await verifications.update(id, input);
  assertAcknowledged(response, "save the verification");
}

export async function createCheckResults(records: CheckResultRecord[]): Promise<void> {
  for (const record of records) {
    assertAcknowledged(await checkResults.create(record as Record<string, unknown>), "save a check result");
  }
}

export async function listCheckResults(verificationIdValue: string): Promise<CheckResultRecord[]> {
  const response = await checkResults.list({ pageNo: 1, pageSize: 50, filter: { verificationId: verificationIdValue } });
  const items = normalizeItems<CheckResultRecord>(response, "getCheckResults");
  return orderChecks(items);
}

export async function listEvidence(verificationIdValue: string): Promise<EvidenceRecord[]> {
  const response = await evidences.list({ pageNo: 1, pageSize: 50, filter: { verificationId: verificationIdValue } });
  return normalizeItems<EvidenceRecord>(response, "getEvidences");
}

export async function createEvidence(records: EvidenceRecord[]): Promise<void> {
  for (const record of records) {
    assertAcknowledged(await evidences.create(record as Record<string, unknown>), "save evidence");
  }
}

export async function createActivity(record: Record<string, unknown>): Promise<string> {
  const response = await activities.create(record);
  return mutationItemId(response, "insertActivityEntry");
}

export async function listActivity(verificationIdValue: string): Promise<ActivityRecord[]> {
  const response = await activities.list({ pageNo: 1, pageSize: 50, filter: { verificationId: verificationIdValue } });
  const items = normalizeItems<ActivityRecord>(response, "getActivityEntrys");
  return items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function enabledRunChecks(verification: Verification): string[] {
  const stored = verification.checks ?? [];
  const valid = stored.filter((key) => ALL_CHECK_KEYS.includes(key as (typeof ALL_CHECK_KEYS)[number]));
  return valid.length ? valid : [...ALL_CHECK_KEYS];
}

function orderChecks(items: CheckResultRecord[]): CheckResultRecord[] {
  const order = new Map(ALL_CHECK_KEYS.map((key, index) => [key, index] as const));
  return [...items].sort((a, b) => (order.get(a.checkKey as never) ?? 0) - (order.get(b.checkKey as never) ?? 0));
}

function assertAcknowledged(response: unknown, action: string): void {
  const record = response as { errors?: unknown[]; data?: Record<string, unknown> };
  const payload = record.data ?? {};
  const first = Object.values(payload).find((value) => value && typeof value === "object") as { acknowledged?: boolean } | undefined;
  if (record.errors?.length || first?.acknowledged === false) throw new Error(`Could not ${action}.`);
}

function mutationItemId(response: unknown, field: string): string {
  const record = response as { data?: Record<string, { itemId?: string } | undefined> };
  const id = record.data?.[field]?.itemId;
  if (!id) throw new Error("The record was saved but no id came back.");
  return String(id);
}

function normalizeOne<T>(response: unknown, field: string): T | undefined {
  const record = response as { data?: Record<string, T | undefined> };
  return record.data?.[field];
}

function normalizeItems<T>(response: unknown, field: string): T[] {
  const record = response as { data?: Record<string, { items?: T[] } | undefined> };
  return record.data?.[field]?.items ?? [];
}