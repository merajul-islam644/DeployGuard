import { ListChecks } from "lucide-react";
import { useMemo } from "react";
import { useVerifications } from "./useVerifications";
import { useNavigate } from "../../app/router/navigation";
import { useQueryParam } from "../../app/router/useSearchParams";
import { formatDateTime, formatDuration, healthTone, verificationTone } from "../../shared/ui/format";
import { EmptyState } from "../../shared/ui/EmptyState";
import { ErrorState } from "../../shared/ui/ErrorState";
import { PageHeader } from "../../shared/ui/PageHeader";
import { Skeleton } from "../../shared/ui/Skeleton";
import { StatusPill } from "../../shared/ui/StatusPill";

export function VerificationsPage() {
  const verifications = useVerifications();
  const navigate = useNavigate();
  const deploymentFilter = useQueryParam("deployment");

  const rows = useMemo(
    () => (verifications.data ?? []).filter((run) => (deploymentFilter ? run.deploymentId === deploymentFilter : true)),
    [verifications.data, deploymentFilter]
  );

  return (
    <section>
      <PageHeader title="Verifications" subtitle="Every run DeployGuard has recorded, newest first." />
      {verifications.isLoading ? (
        <Skeleton className="skeleton-card" />
      ) : verifications.isError ? (
        <ErrorState message="Could not load verification history." onRetry={() => void verifications.refetch()} />
      ) : !rows.length ? (
        <EmptyState icon={<ListChecks size={28} />} title="No verifications yet" description="Run a verification from a deployment to see it here." />
      ) : (
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Date</th><th>Deployment</th><th>Score</th><th>Status</th><th>Run</th><th>Duration</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((run) => (
                <tr key={run.ItemId} className="clickable" onClick={() => navigate(`/verifications/${encodeURIComponent(run.ItemId ?? "")}`)}>
                  <td>{formatDateTime(run.startedAt)}</td>
                  <td>{run.deploymentName} <span className="muted">{run.environment}</span></td>
                  <td className="mono">{run.score ?? 0}/100</td>
                  <td><StatusPill tone={healthTone(run.healthStatus)}>{run.healthStatus ?? "Unknown"}</StatusPill></td>
                  <td><StatusPill tone={verificationTone(run.status)} icon={false}>{run.status ?? "Unknown"}</StatusPill></td>
                  <td className="mono">{formatDuration(run.durationSeconds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}