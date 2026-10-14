// A run is owned by the VerifyPage once it starts, but the deployment card's
// "Verify Now" must know a run is already going so it can refuse a second one
// with 'A verification is already running for Production.' Kept in a module
// store (not React state) so it is shared across pages in one session.
const STORAGE_KEY = "deployguard:running-runs";

type RunningMap = Record<string, { environment: string; name: string }>;

function read(): RunningMap {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "{}") as RunningMap;
  } catch {
    return {};
  }
}

function write(map: RunningMap): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function runningVerification(deploymentId: string): { environment: string; name: string } | undefined {
  return read()[deploymentId];
}

export function markRunning(deploymentId: string, name: string, environment: string): void {
  const map = read();
  map[deploymentId] = { environment, name };
  write(map);
}

export function clearRunning(deploymentId: string): void {
  const map = read();
  delete map[deploymentId];
  write(map);
}

export function runningCount(): number {
  return Object.keys(read()).length;
}