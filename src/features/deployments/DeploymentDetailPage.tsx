import { ArrowLeft, MoreHorizontal, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useDeployments } from "./useDeployments";
import { useDeploymentMutations } from "./useDeployments";
import { useIsAdmin } from "../access/useIsAdmin";
import { useVerifications } from "../verifications/useVerifications";
import { useNavigate } from "../../app/router/navigation";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { environmentLabel, statusLabel, timeAgoLabel } from "../../lib/i18n/labels";
import { AIAnalysisCard } from "../verifications/AIAnalysisCard";
import { ConfirmDialog } from "../../shared/ui/ConfirmDialog";
import { ErrorState } from "../../shared/ui/ErrorState";
import { healthTone, formatDateTime, formatDuration } from "../../shared/ui/format";
import { PageHeader } from "../../shared/ui/PageHeader";
import { Skeleton } from "../../shared/ui/Skeleton";
import { StatusPill } from "../../shared/ui/StatusPill";
import { useToast } from "../../shared/ui/Toast";

export function DeploymentDetailPage({ deploymentId }: { deploymentId: string; onNavigate?: (path: string) => void }) {
  const deployments = useDeployments();
  const verifications = useVerifications();
  const mutations = useDeploymentMutations();
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  const { notify } = useToast();
  const { language, t } = useT();
  const [removeOpen, setRemoveOpen] = useState(false);

  const deployment = (deployments.data?.items ?? []).find((item) => item.ItemId === deploymentId);
  const runs = (verifications.data ?? []).filter((verification) => verification.deploymentId === deploymentId);
  const latest = runs[0];

  if (deployments.isLoading) return <section><Skeleton className="skeleton-card" /></section>;
  if (deployments.isError) return <section><ErrorState message={t("deployments.couldNotLoad", "Could not load deployments.")} onRetry={() => void deployments.refetch()} /></section>;
  if (!deployment) {
    return (
      <section>
        <PageHeader title={t("deployments.title", "Deployments")} subtitle={t("deployments.detailMissing", "This deployment no longer exists.")} />
        <button className="primary-button" onClick={() => navigate("/deployments")}>{t("deployments.backToDeployments", "Back to Deployments")}</button>
      </section>
    );
  }

  function confirmRemove() {
    if (!deployment) return;
    mutations.remove.mutate(deployment, {
      onError: () => notify(t("deployments.removeFailed", "Could not remove the deployment."), "error"),
      onSuccess: () => {
        setRemoveOpen(false);
        notify(t("deployments.removed", "Deployment removed."), "success");
        navigate("/deployments");
      }
    });
  }

  return (
    <section>
      <button className="back-link" onClick={() => navigate("/deployments")}>
        <ArrowLeft size={16} /> {environmentLabel(t, deployment.environment)}
      </button>

      <PageHeader
        title={t("deployments.detailTitle", "Deployment Verification")}
        subtitle={`${deployment.name} \u00b7 ${latest ? t("deployments.lastChecked", "last checked {when}", { when: timeAgoLabel(t, latest.startedAt) }) : t("deployments.neverChecked", "never checked")}`}
        actions={
          <>
            <button className="icon-button" onClick={() => navigate(`/verifications?deployment=${encodeURIComponent(deploymentId)}`)}>{t("deployments.viewHistory", "View History")}</button>
            {isAdmin ? (
              <button className="icon-button" onClick={() => setRemoveOpen(true)} aria-label={t("deployments.moreActions", "More actions")}>
                <MoreHorizontal size={18} />
              </button>
            ) : null}
          </>
        }
      />

      <div className="detail-layout">
        <div className="detail-main">
          {latest ? (
            <div className="panel">
              <div className="panel-title">{t("deployments.latestVerification", "Latest verification")}</div>
              <div className="latest-run">
                <StatusPill tone={healthTone(latest.healthStatus)}>{statusLabel(t, latest.healthStatus)}</StatusPill>
                <span className="latest-score">{latest.score ?? 0}<small>/100</small></span>
                <span className="muted">{latest.reason}</span>
                <button className="link-button" onClick={() => navigate(`/verifications/${encodeURIComponent(latest.ItemId ?? "")}`)}>{t("deployments.openReport", "Open report")}</button>
              </div>
            </div>
          ) : (
            <div className="panel">
              <div className="panel-title">{t("deployments.latestVerification", "Latest verification")}</div>
              <p className="muted">{t("deployments.notVerifiedYet", "This deployment has not been verified yet.")}</p>
              <button className="primary-button" onClick={() => navigate(`/deployments/${encodeURIComponent(deploymentId)}/verify`)}>{t("overview.verifyNow", "Verify Now")}</button>
            </div>
          )}

          {latest ? <AIAnalysisCard verification={latest} loading={false} /> : null}
        </div>

        <aside className="detail-side">
          <div className="panel">
            <div className="panel-title">{t("deployments.deploymentDetails", "Deployment Details")}</div>
            <dl className="details-list">
              <Detail label={t("deployments.environmentLabel", "Environment")} value={environmentLabel(t, deployment.environment)} />
              <Detail label={t("deployments.urlLabel", "URL")} value={deployment.url} mono />
              <Detail label={t("deployments.verifiedAt", "Verified At")} value={latest ? formatDateTime(latest.startedAt, language) : t("common.never", "Never")} />
              <Detail label={t("deployments.duration", "Duration")} value={latest ? formatDuration(latest.durationSeconds) : t("common.none", "\u2014")} />
              <Detail label={t("deployments.triggeredBy", "Triggered By")} value={latest ? `${latest.triggeredBy ?? t("common.staff", "Staff")} \u00b7 ${latest.triggerType ?? t("common.manual", "Manual")}` : t("common.none", "\u2014")} />
              <Detail label={t("deployments.addedBy", "Added By")} value={deployment.addedBy || t("common.unknown", "Unknown")} />
            </dl>
          </div>

          {!isAdmin ? (
            <div className="panel">
              <div className="panel-title"><TriangleAlert size={16} />{t("deployments.removal", "Removal")}</div>
              <p className="muted">{t("deployments.onlyAdminsRemove", "Only admins can remove a deployment.")}</p>
            </div>
          ) : null}
        </aside>
      </div>

      {removeOpen ? (
        <ConfirmDialog
          title={t("deployments.removeTitle", "Remove deployment")}
          confirmLabel={t("deployments.removeLabel", "Remove")}
          message={t("deployments.removeMessage", "Remove \"{name}\"? Its past verifications stay readable under Verifications.", { name: deployment.name ?? "" })}
          onCancel={() => setRemoveOpen(false)}
          onConfirm={confirmRemove}
        />
      ) : null}
    </section>
  );
}

function Detail({ label, value, mono = false }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div className="details-row">
      <dt>{label}</dt>
      <dd className={mono ? "mono" : ""}>{value || "\u2014"}</dd>
    </div>
  );
}