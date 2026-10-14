export const ENVIRONMENTS = ["Production", "Staging", "Development", "Custom"] as const;

export type Environment = (typeof ENVIRONMENTS)[number];

export function isEnvironment(value: string): value is Environment {
  return (ENVIRONMENTS as readonly string[]).includes(value);
}

export const ENVIRONMENT_ORDER: Environment[] = [...ENVIRONMENTS];