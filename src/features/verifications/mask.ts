// Cookie and Authorization values are replaced with '[hidden]' before they
// are stored, displayed, or sent for analysis. This is the last line of
// defence at render time: any header or cookie value reaching the UI passes
// through here first.
const SECRET_HEADERS = /(cookie|set-cookie|authorization)\s*[:=]\s*\S+/gi;
const SECRET_VALUE = /(cookie|authorization)["']?\s*[:=]\s*["']?[^"',}\n]+/gi;

export function maskSecrets(value: string): string {
  return value.replace(SECRET_HEADERS, (_match, name: string) => `${name}: [hidden]`).replace(SECRET_VALUE, (_match, name: string) => `${name}: [hidden]`);
}

export function maskRow(value: unknown): string {
  return maskSecrets(typeof value === "string" ? value : JSON.stringify(value ?? {}));
}

export function hasSecret(value: string): boolean {
  SECRET_HEADERS.lastIndex = 0;
  return SECRET_HEADERS.test(value);
}