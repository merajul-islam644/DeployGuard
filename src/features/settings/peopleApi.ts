import { blocksClient } from "../../lib/blocks/client";
import { ROLE_ADMIN, ROLE_ENGINEER } from "../access/useIsAdmin";

export type Person = {
  active?: boolean;
  email?: string;
  firstName?: string;
  itemId?: string;
  lastLoggedInTime?: string;
  lastName?: string;
  roles?: string[];
  status?: number;
};

export async function listPeople(search?: string): Promise<Person[]> {
  const response = await blocksClient.iam.users.list({ pageNo: 1, pageSize: 100, search });
  const data = (response as { data?: { items?: Person[] } }).data;
  return data?.items ?? [];
}

export async function invitePerson(input: { email: string; firstName: string; lastName: string; role: "Admin" | "Engineer" }): Promise<void> {
  const result = (await blocksClient.iam.users.create({
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
    roles: [roleSlugFor(input.role)]
  })) as { errors?: unknown[]; message?: string };
  if (result.errors?.length) throw new Error(result.message ?? "Could not invite that person.");
}

export async function setPersonRole(personId: string, role: "Admin" | "Engineer"): Promise<void> {
  const result = (await blocksClient.iam.users.updateAccess({
    roles: [roleSlugFor(role)],
    userId: personId
  })) as { errors?: unknown[]; message?: string };
  if (result.errors?.length) throw new Error(result.message ?? "Could not change that role.");
}

export async function setPersonActive(personId: string, active: boolean): Promise<void> {
  const result = (active
    ? await blocksClient.iam.users.activate({ userId: personId })
    : await blocksClient.iam.users.deactivate({ userId: personId })) as { errors?: unknown[]; message?: string };
  if (result.errors?.length) throw new Error(result.message ?? "Could not change that person's access.");
}

export function roleSlugFor(role: "Admin" | "Engineer"): string {
  return role === "Admin" ? ROLE_ADMIN : ROLE_ENGINEER;
}

export function roleLabel(roles?: string[]): "Admin" | "Engineer" {
  const list = roles ?? [];
  if (list.includes(ROLE_ENGINEER)) return "Engineer";
  if (list.includes(ROLE_ADMIN)) return "Admin";
  return /engineer|developer|viewer|read/i.test(list.join(" ")) ? "Engineer" : "Admin";
}

export function personName(person: Person): string {
  const name = [person.firstName, person.lastName].filter(Boolean).join(" ").trim();
  return name || person.email || "Unnamed";
}