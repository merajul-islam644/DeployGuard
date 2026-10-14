import { useQuery } from "@tanstack/react-query";
import { blocksClient } from "../../lib/blocks/client";

export type Issue = {
  ItemId?: string;
  CreatedDate?: string;
  verificationId?: string;
  deploymentId?: string;
  deploymentName?: string;
  checkKey?: string;
  checkName?: string;
  summary?: string;
  raisedAt?: string;
  open?: boolean;
  resolvedAt?: string;
};

export const ISSUE_FIELDS = [
  "ItemId",
  "verificationId",
  "deploymentId",
  "deploymentName",
  "checkKey",
  "checkName",
  "summary",
  "raisedAt",
  "open",
  "resolvedAt",
  "CreatedDate"
];

const issues = blocksClient.data.collection<Issue>("Issue", { fields: ISSUE_FIELDS });

export function issueId(issue: Issue): string {
  if (!issue.ItemId) throw new Error("Issue id is missing.");
  return String(issue.ItemId);
}

export async function listIssues(): Promise<Issue[]> {
  const response = await issues.list({ pageNo: 1, pageSize: 200, sort: { raisedAt: -1 } });
  return normalizeIssues(response);
}

export async function createIssues(records: Record<string, unknown>[]): Promise<void> {
  for (const record of records) {
    const response = (await issues.create(record)) as { errors?: unknown[] };
    if (response.errors?.length) throw new Error("Could not save an issue.");
  }
}

export async function resolveIssues(ids: string[]): Promise<void> {
  const now = new Date().toISOString();
  for (const id of ids) {
    await issues.update(id, { open: false, resolvedAt: now });
  }
}

export function useIssues() {
  return useQuery({ queryFn: listIssues, queryKey: ["issues"] });
}

export function useIssueCount(): number {
  const query = useIssues();
  return (query.data ?? []).filter((issue) => issue.open !== false).length;
}

function normalizeIssues(response: unknown): Issue[] {
  const record = response as { data?: { getIssues?: { items?: Issue[] } } };
  return record.data?.getIssues?.items ?? [];
}