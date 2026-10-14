import { ListChecks } from "lucide-react";
import { useMemo } from "react";
import { useVerifications } from "./useVerifications";
import { useNavigate } from "../../app/router/navigation";
import { useQueryParam } from "../../app/router/useSearchParams";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { environmentLabel, statusLabel } from "../../lib/i18n/labels";
import { formatDateTime, formatDuration, healthTone, verificationTone } from "../../shared/ui/format";
import { EmptyState } from "../../shared/ui/EmptyState";
import { ErrorState } from "../../shared/ui/ErrorState";
import { PageHeader } from "../../shared/ui/PageHeader";
import { Skeleton } from "../../shared/ui/Skeleton";
import { StatusPill } from "../../shared/ui/StatusPill";

export function VerificationsPage() {
  const verifications = useVerifications();
  const navigate = useNavigate();
  const { language, t } = useT();
  const deploymentFilter = useQueryParam("deployment");

  const rows = useMemo(
    () => (verifications.data ?? []).filter((run) => (deploymentFilter ? run.deploymentId === deploymentFilter : true)),
    [verifications.data, deploymentFilter]
  );

  return (
    <section>
      <PageHeader title={t("verifications.title", "Verifications")} subtitle={t("verifications.subtitle", "Every run DeployGuard has recorded, newest first.")} />
      {verifications.isLoading ? (
        <Skeleton className="skeleton-card" />
      ) : verifications.isError ? (
        <ErrorState message={t("verifications.couldNotLoad", "Could not load verification history.")} onRetry={() => void verifications.refetch()} />
      ) : !rows.length ? (
        <EmptyState icon={<ListChecks size={28} />} title={t("verifications.empty", "No verifications yet")} description={t("verifications.emptyHint", "Run a verification from a deployment to see it here.")} />
      ) : (
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>{t("verifications.date", "Date")}</th><th>{t("verifications.deployment", "Deployment")}</th><th>{t("verifications.score", "Score")}</th><th>{t("verifications.status", "Status")}</th><th>{t("verifications.run", "Run")}</th><th>{t("verifications.duration", "Duration")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((run) => (
                <tr key={run.ItemId} className="clickable" onClick={() => navigate(`/verifications/${encodeURIComponent(run.ItemId ?? "")}`)}>
                  <td>{formatDateTime(run.startedAt, language)}</td>
                  <td>{run.deploymentName} <span className="muted">{environmentLabel(t, run.environment)}</span></td>
                  <td className="mono">{run.score ?? 0}/100</td>
                  <td><StatusPill tone={healthTone(run.healthStatus)}>{statusLabel(t, run.healthStatus)}</StatusPill></td>
                  <td><StatusPill tone={verificationTone(run.status)} icon={false}>{statusLabel(t, run.status)}</StatusPill></td>
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