import { CheckCircle2, Plus, Rocket, TriangleAlert } from "lucide-react";
import { useMemo } from "react";
import { useIsAdmin } from "../access/useIsAdmin";
import { ENVIRONMENT_ORDER } from "../deployments/environments";
import type { Environment } from "../deployments/environments";
import { useEnrichedDeployments } from "../deployments/useEnrichedDeployments";
import type { EnrichedDeployment } from "../deployments/useEnrichedDeployments";
import { useIssues } from "../issues/issuesApi";
import { runningVerification } from "../verifications/runningRuns";
import { useNavigate } from "../../app/router/navigation";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { checkLabel, environmentLabel, statusLabel, timeAgoLabel } from "../../lib/i18n/labels";
import { healthTone } from "../../shared/ui/format";
import { EmptyState } from "../../shared/ui/EmptyState";
import { ErrorState } from "../../shared/ui/ErrorState";
import { PageHeader } from "../../shared/ui/PageHeader";
import { Skeleton } from "../../shared/ui/Skeleton";
import { StatusPill } from "../../shared/ui/StatusPill";
import { SuccessChart } from "./SuccessChart";
import { useToast } from "../../shared/ui/Toast";

export function OverviewPage() {
  const enriched = useEnrichedDeployments();
  const issues = useIssues();
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  const { notify } = useToast();
  const { t } = useT();

  const openIssues = (issues.data ?? []).filter((issue) => issue.open !== false);
  const byEnvironment = useMemo(() => groupLatestByEnvironment(enriched.deployments), [enriched.deployments]);

  function verifyNow(deployment: EnrichedDeployment) {
    const id = deployment.ItemId;
    if (!id) return;
    if (runningVerification(id)) {
      notify(t("deployments.alreadyRunning", "A verification is already running for {environment}.", { environment: environmentLabel(t, deployment.environment) }), "info");
      return;
    }
    navigate(`/deployments/${encodeURIComponent(id)}/verify`);
  }

  if (enriched.isLoading) {
    return (
      <section>
        <PageHeader title={t("overview.title", "Overview")} subtitle={t("overview.subtitle", "Deployment health across every environment.")} />
        <div className="metrics">{ENVIRONMENT_ORDER.map((env) => <Skeleton className="skeleton-card" key={env} />)}</div>
      </section>
    );
  }

  if (enriched.isError) {
    return (
      <section>
        <PageHeader title={t("overview.title", "Overview")} subtitle={t("overview.subtitle", "Deployment health across every environment.")} />
        <ErrorState message={t("overview.couldNotLoad", "Could not load your deployments.")} onRetry={enriched.refetch} />
      </section>
    );
  }

  if (!enriched.deployments.length) {
    return (
      <section>
        <PageHeader title={t("overview.title", "Overview")} subtitle={t("overview.subtitle", "Deployment health across every environment.")} />
        <EmptyState
          description={t("overview.addFirst", "Add your first deployment and run your first automated verification.")}
          icon={<Rocket size={28} />}
          title={t("deployments.noDeployments", "No deployments yet")}
          action={<button className="primary-button" onClick={() => navigate("/deployments")}><Plus size={16} />{t("deployments.addDeployment", "Add Deployment")}</button>}
        />
      </section>
    );
  }

  return (
    <section>
      <PageHeader
        title={t("overview.title", "Overview")}
        subtitle={t("overview.subtitle", "Deployment health across every environment.")}
        actions={<StatusPill tone={openIssues.length ? "warn" : "good"}>{openIssues.length ? t("overview.openCount", "{count} open", { count: openIssues.length }) : t("overview.noOpen", "No open issues")}</StatusPill>}
      />

      <div className="metric-strip">
        <div className="metric">
          <span>{t("overview.openIssues", "Open issues")}</span>
          <strong className={openIssues.length ? "metric-warn" : ""}>{openIssues.length}</strong>
          <small>{openIssues.length ? t("overview.needAttention", "Need attention") : t("overview.allClear", "All clear")}</small>
        </div>
        <div className="metric">
          <span>{t("overview.deployments", "Deployments")}</span>
          <strong>{enriched.deployments.length}</strong>
          <small>{t("overview.acrossEnvironments", "Across {count} environments", { count: Object.keys(byEnvironment).length })}</small>
        </div>
        <div className="metric metric-wide">
          <span>{t("overview.successRate7", "7-day success rate")}</span>
          <SuccessChart verifications={enriched.verifications} compact />
        </div>
      </div>

      <div className="environment-groups">
        {ENVIRONMENT_ORDER.map((environment) => {
          const items = byEnvironment[environment] ?? [];
          return (
            <div className="environment-group" key={environment}>
              <div className="environment-heading">
                <h3>{environmentLabel(t, environment)}</h3>
                <span className="muted">{t("overview.deploymentCountPlural", "{count} deployments", { count: items.length })}</span>
              </div>
              {items.length ? (
                <div className="environment-status-grid">
                  {items.map((deployment) => {
                    const running = Boolean(deployment.ItemId && runningVerification(deployment.ItemId));
                    return (
                      <article className="status-card" key={deployment.ItemId}>
                        <div className="status-card-head">
                          <h4>{deployment.name}</h4>
                          {deployment.latest ? (
                            <StatusPill tone={healthTone(deployment.latest.healthStatus)}>{statusLabel(t, deployment.latest.healthStatus)}</StatusPill>
                          ) : (
                            <StatusPill tone="neutral">{t("overview.notVerified", "Not verified")}</StatusPill>
                          )}
                        </div>
                        <a className="deployment-url mono" href={deployment.url} target="_blank" rel="noreferrer">{deployment.url}</a>
                        <div className="status-card-meta">
                          <span>{deployment.latest ? t("overview.score", "Score {value}", { value: deployment.latest.score ?? 0 }) : t("overview.noScoreYet", "No score yet")}</span>
                          <span>{deployment.latest ? t("overview.verified", "Verified {when}", { when: timeAgoLabel(t, deployment.latest.startedAt) }) : t("overview.neverVerified", "Never verified")}</span>
                        </div>
                        <div className="status-card-actions">
                          <button className="primary-button" disabled={running} onClick={() => verifyNow(deployment)}>
                            {running ? t("overview.verifying", "Verifying\u2026") : t("overview.verifyNow", "Verify Now")}
                          </button>
                          <button className="icon-button" onClick={() => navigate(`/deployments/${encodeURIComponent(deployment.ItemId ?? "")}`)}>{t("overview.open", "Open")}</button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="environment-empty muted">{t("overview.noDeploymentsIn", "No deployments in {environment}.", { environment: environmentLabel(t, environment) })}</p>
              )}
            </div>
          );
        })}
      </div>

      {openIssues.length ? (
        <div className="panel">
          <div className="panel-title"><TriangleAlert size={16} />{t("overview.recentIssues", "Recent open issues")}</div>
          <ul className="issue-list">
            {openIssues.slice(0, 5).map((issue) => (
              <li key={issue.ItemId}>
                <TriangleAlert size={14} />
                <span><strong>{issue.deploymentName ?? t("issues.deployment", "Deployment")}</strong> {"\u00b7"} {checkLabel(t, issue.checkName)}: {issue.summary}</span>
                <button className="link-button" onClick={() => navigate(`/verifications/${encodeURIComponent(issue.verificationId ?? "")}`)}>{t("issues.viewReport", "View report")}</button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="panel">
          <div className="panel-title"><CheckCircle2 size={16} />{t("overview.openIssues", "Open issues")}</div>
          <p className="muted">{t("overview.noOpenIssues", "No open issues.")}</p>
        </div>
      )}

      {isAdmin ? null : <p className="muted">{t("overview.engineerNote", "Signed in as an Engineer. You can add deployments and verify them.")}</p>}
    </section>
  );
}

function groupLatestByEnvironment(deployments: EnrichedDeployment[]): Partial<Record<Environment, EnrichedDeployment[]>> {
  const result: Partial<Record<Environment, EnrichedDeployment[]>> = {};
  for (const deployment of deployments) {
    const environment = (ENVIRONMENT_ORDER as string[]).includes(deployment.environment ?? "")
      ? (deployment.environment as Environment)
      : "Custom";
    (result[environment] ??= []).push(deployment);
  }
  return result;
}