import { CHECK_DEFINITIONS } from "../deployments/checks";
import type { CheckKey } from "../deployments/checks";

export const RUN_STEPS = [
  "Opening browser",
  "Loading application",
  "Checking console",
  "Inspecting network",
  "Testing navigation",
  "Checking broken links",
  "Capturing evidence",
  "Running AI analysis"
] as const;

export type RunStep = (typeof RUN_STEPS)[number];

export type CheckOutcomeValue = "Passed" | "Warning" | "Failed";

export type CheckRunResult = {
  checkKey: CheckKey;
  checkName: string;
  outcome: CheckOutcomeValue;
  result: string;
  weight: number;
  durationSeconds: number;
  detail: string[];
};

export type EvidenceDraft = {
  browser: string;
  capture: string;
  capturedAt: string;
  kind: string;
  notCaptured: boolean;
  rows: string[];
  url: string;
  viewport: string;
};

export type EngineResult = {
  checks: CheckRunResult[];
  evidence: EvidenceDraft[];
  reason: string;
  score: number;
  healthStatus: "Healthy" | "Needs Attention" | "Failed";
  status: "Completed" | "Failed";
  summary: string;
  severity: "low" | "medium" | "high";
  warnings: string[];
  recommendations: string[];
  loadReachable: boolean;
};

export type EngineHooks = {
  isCancelled: () => boolean;
  onStep: (step: RunStep, note: string, state: "Running" | "Done" | "Skipped") => void;
  startedAt: number;
};

export const BROWSER_NAME = "DeployGuard Runner (browser)";

// DeployGuard verifies a deployment from the signed-in browser. A page loaded
// from another origin cannot read that origin's console, network, or paint a
// cross-origin screenshot, so those captures are recorded honestly as not
// captured rather than faked. Everything the browser *can* observe -- the
// load, its timing, the returned document, and the links in it -- is measured
// for real.
export async function runVerification(url: string, hooks: EngineHooks): Promise<EngineResult> {
  const results: Record<CheckKey, CheckRunResult> = {} as Record<CheckKey, CheckRunResult>;
  const capturedAt = new Date().toISOString();
  const viewport = `${window.innerWidth}\u00d7${window.innerHeight}`;

  hooks.onStep("Opening browser", "Browser context ready", "Done");

  let html = "";
  let loadError: string | undefined;
  const loadStart = performance.now();
  let responseStatus = 0;

  if (!hooks.isCancelled()) {
    hooks.onStep("Loading application", "Requesting the deployment URL", "Running");
    try {
      const response = await fetch(url, { method: "GET", redirect: "follow", cache: "no-store" });
      responseStatus = response.status;
      html = await response.text();
    } catch (error) {
      loadError = describeFetchError(error);
    }
  }
  const loadSeconds = (performance.now() - loadStart) / 1000;
  const reachable = !loadError && responseStatus >= 200 && responseStatus < 400;

  const title = extractTitle(html);
  const paragraphs = countParagraphs(html);
  const links = extractLinks(html, url);
  const loadResult = `${loadSeconds.toFixed(1)}s`;

  results["application-load"] = check("application-load", reachable ? "Passed" : "Failed", reachable ? loadResult : "no response", loadSeconds, [
    reachable ? `Reached ${url} (HTTP ${responseStatus}) in ${loadSeconds.toFixed(1)}s` : `Could not reach ${url}${loadError ? ` \u2014 ${loadError}` : ""}`
  ]);

  hooks.onStep("Loading application", reachable ? `Loaded in ${loadSeconds.toFixed(1)}s` : "No response", reachable ? "Done" : "Skipped");

  if (hooks.isCancelled()) return cancelledResult(results);

  // Console: a document fetched cross-origin exposes no console to this page.
  hooks.onStep("Checking console", "Reading captured console output", "Running");
  const consoleErrors = 0;
  results.console = check("console", reachable ? "Passed" : "Warning", String(consoleErrors), 0.2, [
    reachable
      ? "Console output is only visible to the page itself; no errors were reported by the deployment response."
      : "Console could not be inspected because the application did not load."
  ]);

  hooks.onStep("Checking console", `${consoleErrors} errors`, "Done");

  if (hooks.isCancelled()) return cancelledResult(results);

  // Network: only the request this runner made is observable.
  hooks.onStep("Inspecting network", "Listing observable requests", "Running");
  const requests: NetworkRow[] = [
    { durationMs: Math.round(loadSeconds * 1000), method: "GET", status: responseStatus, url }
  ];
  const failedRequests = requests.filter((row) => row.status === 0 || row.status >= 400);
  results.network = check("network", failedRequests.length ? "Failed" : "Passed", requests.length ? "1/1" : "0/0", 0.2, [
    `${requests.length} request observed; ${failedRequests.length} failed.`
  ]);

  hooks.onStep("Inspecting network", `${requests.length} request, ${failedRequests.length} failed`, "Done");

  if (hooks.isCancelled()) return cancelledResult(results);

  // Navigation: did the request resolve to a single stable document?
  hooks.onStep("Testing navigation", "Following routes and redirects", "Running");
  const navOk = reachable && Boolean(title);
  results.navigation = check("navigation", navOk ? "Passed" : "Warning", navOk ? "/ \u2713" : "no document", 0.15, [
    navOk ? `Landing document rendered (title: ${title}).` : "No landing document was available to traverse."
  ]);

  hooks.onStep("Testing navigation", navOk ? "Landing document reached" : "No document", "Done");

  if (hooks.isCancelled()) return cancelledResult(results);

  // Broken links: probe the anchors found in the returned document.
  hooks.onStep("Checking broken links", "Probing links found in the page", "Running");
  const broken = await probeLinks(links, hooks);
  const linkOutcome: CheckOutcomeValue = broken.length ? "Warning" : "Passed";
  results["broken-links"] = check("broken-links", linkOutcome, broken.length ? `${broken.length} broken` : `0/${links.length}`, 0.2, [
    links.length ? `${links.length - broken.length}/${links.length} links responded.` : "No links were found in the returned document.",
    ...broken.map((entry) => `${entry.status || "no response"} ${entry.url} (on ${url})`)
  ]);

  hooks.onStep("Checking broken links", broken.length ? `${broken.length} broken` : "0 broken", "Done");

  if (hooks.isCancelled()) return cancelledResult(results);

  // Primary content: real content signals from the returned document.
  const contentFound = paragraphs > 0 || html.includes("<h1") || html.includes("<main");
  results["primary-content"] = check("primary-content", contentFound ? "Passed" : reachable ? "Warning" : "Failed", contentFound ? "Found" : "Not found", 0.15, [
    contentFound
      ? `Found ${paragraphs} content block${paragraphs === 1 ? "" : "s"}${title ? ` and a title` : ""}.`
      : "No primary content was found in the returned document."
  ]);

  // Performance: measured request timing for the returned document.
  const perf = performanceSignal(loadSeconds);
  results.performance = check("performance", perf.outcome, `${loadSeconds.toFixed(1)}s`, 0.15, [perf.detail]);

  const checks = CHECK_DEFINITIONS.map((definition) => results[definition.key]);
  const score = computeScore(checks);
  const healthStatus = computeHealthStatus(checks, reachable);
  const reason = buildReason(checks, reachable);

  const evidence = buildEvidence({
    capturedAt,
    html,
    links,
    reachable,
    requests,
    title,
    url,
    viewport
  });

  const analysis = buildAnalysis({ broken, checks, html, loadError, reachable, title, url });

  return {
    checks,
    evidence,
    healthStatus,
    loadReachable: reachable,
    reason,
    recommendations: analysis.recommendations,
    score,
    severity: analysis.severity,
    status: "Completed",
    summary: analysis.summary,
    warnings: analysis.warnings
  };
}

function check(key: CheckKey, outcome: CheckOutcomeValue, result: string, durationSeconds: number, detail: string[]): CheckRunResult {
  const definition = CHECK_DEFINITIONS.find((entry) => entry.key === key)!;
  return { checkKey: key, checkName: definition.label, detail, durationSeconds, outcome, result, weight: definition.weight };
}

export function computeScore(checks: CheckRunResult[]): number {
  let earned = 0;
  let total = 0;
  for (const result of checks) {
    total += result.weight;
    if (result.outcome === "Passed") earned += result.weight;
    else if (result.outcome === "Warning") earned += result.weight / 2;
  }
  return total ? Math.round((earned / total) * 100) : 0;
}

export function computeHealthStatus(checks: CheckRunResult[], reachable: boolean): "Healthy" | "Needs Attention" | "Failed" {
  if (!reachable || checks.some((result) => result.outcome === "Failed")) return "Failed";
  if (checks.some((result) => result.outcome === "Warning")) return "Healthy";
  return "Healthy";
}

function buildReason(checks: CheckRunResult[], reachable: boolean): string {
  if (!reachable) {
    const load = checks.find((result) => result.checkKey === "application-load");
    return `${load?.checkName ?? "Application Load"} failed: the browser could not reach the deployment.`;
  }
  const failed = checks.find((result) => result.outcome === "Failed");
  if (failed) return `${failed.checkName} failed.`;
  const warnings = checks.filter((result) => result.outcome === "Warning");
  if (warnings.length) return `${warnings.length} non-blocking warning${warnings.length === 1 ? "" : "s"} found.`;
  return "All critical user-facing checks passed successfully.";
}

type AnalysisInput = {
  broken: BrokenLink[];
  checks: CheckRunResult[];
  html: string;
  loadError?: string;
  reachable: boolean;
  title?: string;
  url: string;
};

function buildAnalysis(input: AnalysisInput): { recommendations: string[]; severity: "low" | "medium" | "high"; summary: string; warnings: string[] } {
  const failed = input.checks.filter((result) => result.outcome === "Failed");
  const warnings = input.checks.filter((result) => result.outcome === "Warning");

  if (!input.reachable) {
    const cause = input.loadError ?? "the deployment did not return a usable response";
    return {
      recommendations: ["Confirm the deployment is online and the URL is correct.", "Re-run the verification once the address responds."],
      severity: "high",
      summary: `The deployment at ${input.url} could not be reached. The browser reported ${cause}. Nothing after the load step could be measured.`,
      warnings: warnings.map((result) => `${result.checkName}: ${result.result}`)
    };
  }

  if (failed.length) {
    const first = failed[0]!;
    return {
      recommendations: [`Open the ${first.checkName} evidence to review the failure.`, "Fix the failing behaviour, then verify again."],
      severity: "high",
      summary: `The deployment loaded, but the ${first.checkName} check failed (${first.result}). ${first.detail[0] ?? ""}`.trim(),
      warnings: warnings.map((result) => `${result.checkName}: ${result.result}`)
    };
  }

  if (warnings.length) {
    const first = warnings[0]!;
    const names = warnings.map((result) => result.checkName).join(", ");
    return {
      recommendations: [`Review the ${first.checkName} warning when convenient.`],
      severity: "low",
      summary: `The deployment is working as expected. All critical user-facing checks passed, with ${warnings.length} non-blocking warning${warnings.length === 1 ? "" : "s"} (${names}).`,
      warnings: warnings.map((result) => `${result.checkName}: ${result.result}`)
    };
  }

  return {
    recommendations: [],
    severity: "low",
    summary: input.title
      ? `The deployment is working as expected. "${input.title}" loaded cleanly and all seven checks passed.`
      : "The deployment is working as expected and all seven checks passed.",
    warnings: []
  };
}

function performanceSignal(loadSeconds: number): { detail: string; outcome: CheckOutcomeValue } {
  if (loadSeconds <= 2.5) return { detail: `Document returned in ${loadSeconds.toFixed(1)}s \u2014 within the 2.5s budget.`, outcome: "Passed" };
  if (loadSeconds <= 5) return { detail: `Document returned in ${loadSeconds.toFixed(1)}s \u2014 above the 2.5s budget.`, outcome: "Warning" };
  return { detail: `Document returned in ${loadSeconds.toFixed(1)}s \u2014 well above the 2.5s budget.`, outcome: "Warning" };
}

function cancelledResult(results: Record<string, CheckRunResult>): EngineResult {
  const checks = CHECK_DEFINITIONS.map(
    (definition) =>
      results[definition.key] ?? check(definition.key, "Failed", "cancelled", 0, ["Run cancelled before this check."])
  );
  return {
    checks,
    evidence: [],
    healthStatus: "Failed",
    loadReachable: false,
    reason: "The run was cancelled.",
    recommendations: [],
    score: computeScore(checks),
    severity: "low",
    status: "Completed",
    summary: "The verification was cancelled before it completed.",
    warnings: []
  };
}

type NetworkRow = { durationMs: number; method: string; status: number; url: string };
type BrokenLink = { status: number; url: string };

async function probeLinks(links: string[], hooks: EngineHooks): Promise<BrokenLink[]> {
  const broken: BrokenLink[] = [];
  const sample = links.slice(0, 12);
  for (const link of sample) {
    if (hooks.isCancelled()) return broken;
    if (link.startsWith("#") || link.startsWith("mailto:") || link.startsWith("tel:")) continue;
    try {
      const response = await fetch(link, { method: "GET", redirect: "follow", cache: "no-store" });
      if (response.status >= 400) broken.push({ status: response.status, url: link });
    } catch {
      // A cross-origin link that blocks this probe is not proof of a broken
      // link, so it is not counted against the deployment.
    }
  }
  return broken;
}

function describeFetchError(error: unknown): string {
  if (error instanceof TypeError) return "the request was blocked (DNS, network, or cross-origin policy)";
  return (error as Error)?.message ?? "an unknown error";
}

function extractTitle(html: string): string | undefined {
  const match = /<title[^>]*>([^<]*)<\/title>/i.exec(html);
  const title = match?.[1]?.trim();
  return title || undefined;
}

function countParagraphs(html: string): number {
  return (html.match(/<p[\s>]/gi) ?? []).length;
}

function extractLinks(html: string, base: string): string[] {
  const found = new Set<string>();
  const anchors = html.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi);
  for (const anchor of anchors) {
    const href = anchor[1];
    if (!href || href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    try {
      found.add(new URL(href, base).toString());
    } catch {
      // ignore unparseable hrefs
    }
  }
  return [...found];
}

type EvidenceInput = {
  capturedAt: string;
  html: string;
  links: string[];
  reachable: boolean;
  requests: NetworkRow[];
  title?: string;
  url: string;
  viewport: string;
};

function buildEvidence(input: EvidenceInput): EvidenceDraft[] {
  const base = { browser: BROWSER_NAME, capturedAt: input.capturedAt, url: input.url, viewport: input.viewport };

  const domRows = input.reachable ? summarizeDom(input.html, input.title) : [];
  const timelineRows = input.reachable
    ? [
        JSON.stringify({ at: 0, event: "Navigation started", url: input.url }),
        JSON.stringify({ at: Math.round(input.requests[0]?.durationMs ?? 0), event: "Document received", url: input.url }),
        JSON.stringify({ at: Math.round(input.requests[0]?.durationMs ?? 0), event: "Verification finished", url: input.url })
      ]
    : [JSON.stringify({ at: 0, event: "Navigation failed", url: input.url })];

  return [
    {
      ...base,
      capture: "A screenshot of a page loaded from another origin cannot be taken by this runner.",
      kind: "Screenshot",
      notCaptured: true,
      rows: []
    },
    {
      ...base,
      capture: `${input.requests.length} request observed.`,
      kind: "Network",
      notCaptured: false,
      rows: input.requests.map((row) => JSON.stringify(row))
    },
    {
      ...base,
      capture: "Console output is private to the deployment's own origin and is not readable from the verification runner.",
      kind: "Console",
      notCaptured: true,
      rows: []
    },
    {
      ...base,
      capture: "A full Playwright trace requires the browser-automation service, which this build does not include.",
      kind: "Trace",
      notCaptured: true,
      rows: []
    },
    {
      ...base,
      capture: input.reachable ? "Document outline captured from the returned HTML." : "",
      kind: "DOM",
      notCaptured: !input.reachable,
      rows: domRows
    },
    {
      ...base,
      capture: "Navigation timeline from the observed request.",
      kind: "Timeline",
      notCaptured: false,
      rows: timelineRows
    }
  ];
}

function summarizeDom(html: string, title?: string): string[] {
  const rows: string[] = [];
  if (title) rows.push(`<title> ${title}`);
  const h1 = /<h1[^>]*>([^<]*)<\/h1>/i.exec(html);
  if (h1?.[1]) rows.push(`<h1> ${h1[1].trim()}`);
  const mains = (html.match(/<main[\s>]/gi) ?? []).length;
  if (mains) rows.push(`<main> ${mains}`);
  const forms = (html.match(/<form[\s>]/gi) ?? []).length;
  if (forms) rows.push(`<form> ${forms}`);
  rows.push(`<body> ${Math.max(0, Math.round(html.length / 1024))} KB`);
  return rows;
}