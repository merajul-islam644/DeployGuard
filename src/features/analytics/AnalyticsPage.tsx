import { useMemo } from "react";
import { useVerifications } from "../verifications/useVerifications";
import type { Verification } from "../verifications/verificationsApi";
import { SuccessChart, successRate } from "../overview/SuccessChart";
import { useIssues } from "../issues/issuesApi";
import { formatDuration } from "../../shared/ui/format";
import { ErrorState } from "../../shared/ui/ErrorState";
import { PageHeader } from "../../shared/ui/PageHeader";
import { Skeleton } from "../../shared/ui/Skeleton";

export function AnalyticsPage() {
  const verifications = useVerifications();
  const issues = useIssues();

  const runs = verifications.data ?? [];
  const stats = useMemo(() => computeStats(runs), [runs]);
  const openIssues = (issues.data ?? []).filter((issue) => issue.open !== false);

  if (verifications.isLoading) {
    return (
      <section>
        <PageHeader title="Analytics" subtitle="How your deployments are holding up." />
        <div className="metrics">{[0, 1, 2, 3, 4].map((key) => <Skeleton className="skeleton-card" key={key} />)}</div>
      </section>
    );
  }

  if (verifications.isError) {
    return (
      <section>
        <PageHeader title="Analytics" subtitle="How your deployments are holding up." />
        <ErrorState message="Could not load analytics." onRetry={() => void verifications.refetch()} />
      </section>
    );
  }

  return (
    <section>
      <PageHeader title="Analytics" subtitle="How your deployments are holding up." />

      <div className="metrics">
        <Metric label="Success rate" value={runs.length ? `${successRate(runs)}%` : "\u2014"} hint="Healthy runs, last 7 days" />
        <Metric label="Average health score" value={runs.length ? String(stats.averageScore) : "\u2014"} hint="Across all runs" />
        <Metric label="Average duration" value={formatDuration(stats.averageDuration)} hint="Per verification" />
        <Metric label="Critical failures" value={String(stats.criticalFailures)} hint="Failed runs" tone="bad" />
        <Metric label="Warnings" value={String(stats.warnings)} hint="Non-blocking findings" tone="warn" />
      </div>

      <div className="panel">
        <div className="panel-title">Verifications over the last 7 days</div>
        <SuccessChart verifications={runs} />
      </div>

      <div className="panel">
        <div className="panel-title">Deployment health</div>
        {openIssues.length ? (
          <p className="muted">{openIssues.length} open issue{openIssues.length === 1 ? "" : "s"} across {new Set(openIssues.map((issue) => issue.deploymentId)).size} deployment{new Set(openIssues.map((issue) => issue.deploymentId)).size === 1 ? "" : "s"}.</p>
        ) : (
          <p className="muted">No open issues.</p>
        )}
      </div>
    </section>
  );
}

function Metric({ hint, label, tone, value }: { hint: string; label: string; tone?: "bad" | "warn"; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong className={tone ? `metric-${tone}` : ""}>{value}</strong>
      <small>{hint}</small>
    </div>
  );
}

function computeStats(runs: Verification[]): { averageScore: number; averageDuration: number; criticalFailures: number; warnings: number } {
  if (!runs.length) return { averageDuration: 0, averageScore: 0, criticalFailures: 0, warnings: 0 };
  const averageScore = Math.round(runs.reduce((total, run) => total + (run.score ?? 0), 0) / runs.length);
  const durations = runs.filter((run) => typeof run.durationSeconds === "number");
  const averageDuration = durations.length ? durations.reduce((total, run) => total + (run.durationSeconds ?? 0), 0) / durations.length : 0;
  const criticalFailures = runs.filter((run) => run.healthStatus === "Failed").length;
  const warnings = runs.reduce((total, run) => total + (run.warnings?.length ?? 0), 0);
  return { averageDuration, averageScore, criticalFailures, warnings };
}