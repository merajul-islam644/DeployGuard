import { useQuery } from "@tanstack/react-query";
import { blocksClient } from "../../lib/blocks/client";

export type ChangeRecord = {
  ItemId?: string;
  CreatedDate?: string;
  entity?: string;
  record?: string;
  changedBy?: string;
  changedAt?: string;
  before?: string;
  after?: string;
  action?: string;
};

export const CHANGE_FIELDS = ["ItemId", "entity", "record", "changedBy", "changedAt", "before", "after", "action", "CreatedDate"];

const changes = blocksClient.data.collection<ChangeRecord>("ChangeRecord", { fields: CHANGE_FIELDS });

export async function listChanges(): Promise<ChangeRecord[]> {
  const response = await changes.list({ pageNo: 1, pageSize: 200, sort: { changedAt: -1 } });
  return normalizeChanges(response);
}

export async function recordChange(entry: {
  action: string;
  after?: string;
  before?: string;
  changedBy: string;
  entity: string;
  record: string;
}): Promise<void> {
  await changes.create({ ...entry, changedAt: new Date().toISOString() });
}

export function useChangeRecords(enabled = true) {
  return useQuery({ enabled, queryFn: listChanges, queryKey: ["change-records"] });
}

function normalizeChanges(response: unknown): ChangeRecord[] {
  const record = response as { data?: { getChangeRecords?: { items?: ChangeRecord[] } } };
  return record.data?.getChangeRecords?.items ?? [];
}