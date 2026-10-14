export const CHECK_DEFINITIONS = [
  { key: "application-load", label: "Application Load", weight: 20 },
  { key: "console", label: "Console", weight: 15 },
  { key: "network", label: "Network", weight: 15 },
  { key: "navigation", label: "Navigation", weight: 15 },
  { key: "broken-links", label: "Broken Links", weight: 15 },
  { key: "primary-content", label: "Primary Content", weight: 10 },
  { key: "performance", label: "Performance", weight: 10 }
] as const;

export type CheckKey = (typeof CHECK_DEFINITIONS)[number]["key"];

export const ALL_CHECK_KEYS: CheckKey[] = CHECK_DEFINITIONS.map((check) => check.key);

export function isCheckKey(value: string): value is CheckKey {
  return ALL_CHECK_KEYS.includes(value as CheckKey);
}