import { blocksClient } from "../../lib/blocks/client";
import { ALL_CHECK_KEYS } from "./checks";
import type { CheckKey } from "./checks";
import type { Environment } from "./environments";

export type Deployment = {
  ItemId?: string;
  addedBy?: string;
  checks?: string[];
  CreatedDate?: string;
  environment?: string;
  name?: string;
  url?: string;
};

export type DeploymentInput = {
  checks: CheckKey[];
  environment: Environment;
  name: string;
  url: string;
  addedBy?: string;
};

const FIELDS = ["ItemId", "name", "environment", "url", "checks", "addedBy", "CreatedDate"];
const deployments = blocksClient.data.collection<Deployment>("Deployment", { fields: FIELDS });

export type DeploymentList = { items: Deployment[]; totalCount: number };

export async function listDeployments(): Promise<DeploymentList> {
  const response = await deployments.list({ pageNo: 1, pageSize: 200, sort: { CreatedDate: -1 } });
  return normalizeList(response);
}

export async function createDeployment(input: DeploymentInput): Promise<void> {
  const response = await deployments.create({
    addedBy: input.addedBy,
    checks: input.checks,
    environment: input.environment,
    name: input.name,
    url: input.url
  });
  assertAcknowledged(response, "save");
}

export async function updateDeployment(itemId: string, input: Omit<DeploymentInput, "addedBy">): Promise<void> {
  const response = await deployments.update(itemId, {
    checks: input.checks,
    environment: input.environment,
    name: input.name,
    url: input.url
  });
  assertAcknowledged(response, "save");
}

export async function deleteDeployment(itemId: string): Promise<void> {
  const response = await deployments.delete(itemId);
  assertAcknowledged(response, "remove");
}

export function deploymentId(deployment: Deployment): string {
  const id = deployment.ItemId;
  if (!id) throw new Error("Deployment id is missing.");
  return String(id);
}

export function enabledChecks(deployment: Deployment): CheckKey[] {
  const stored = deployment.checks ?? [];
  const valid = stored.filter((key): key is CheckKey => ALL_CHECK_KEYS.includes(key as CheckKey));
  return valid.length ? valid : [...ALL_CHECK_KEYS];
}

function assertAcknowledged(response: unknown, action: string): void {
  const record = response as { errors?: unknown[]; data?: Record<string, unknown> };
  const payload = record.data ?? {};
  const first = Object.values(payload).find((value) => value && typeof value === "object") as { acknowledged?: boolean } | undefined;
  if (record.errors?.length || first?.acknowledged === false) {
    throw new Error(`Could not ${action} the deployment.`);
  }
}

function normalizeList(response: unknown): DeploymentList {
  const record = response as {
    data?: { getDeployments?: { items?: Deployment[]; totalCount?: number } };
  };
  const gateway = record.data?.getDeployments;
  return { items: gateway?.items ?? [], totalCount: gateway?.totalCount ?? 0 };
}