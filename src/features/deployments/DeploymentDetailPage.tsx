import { ArrowLeft, MoreHorizontal, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useDeployments } from "./useDeployments";
import { useDeploymentMutations } from "./useDeployments";
import { useIsAdmin } from "../access/useIsAdmin";
import { useVerifications } from "../verifications/useVerifications";
import { useNavigate } from "../../app/router/navigation";
import { AIAnalysisCard } from "../verifications/AIAnalysisCard";
import { ConfirmDialog } from "../../shared/ui/ConfirmDialog";
import { ErrorState } from "../../shared/ui/ErrorState";
import { healthTone, formatDateTime, formatDuration, timeAgo } from "../../shared/ui/format";
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
  const [removeOpen, setRemoveOpen] = useState(false);

  const deployment = (deployments.data?.items ?? []).find((item) => item.ItemId === deploymentId);
  const runs = (verifications.data ?? []).filter((verification) => verification.deploymentId === deploymentId);
  const latest = runs[0];

  if (deployments.isLoading) return <section><Skeleton className="skeleton-card" /></section>;
  if (deployments.isError) return <section><ErrorState message="Could not load the deployment." onRetry={() => void deployments.refetch()} /></section>;
  if (!deployment) {
    return (
      <section>
        <PageHeader title="Deployment" subtitle="This deployment no longer exists." />
        <button className="primary-button" onClick={() => navigate("/deployments")}>Back to Deployments</button>
      </section>
    );
  }

  function confirmRemove() {
    if (!deployment) return;
    mutations.remove.mutate(deployment, {
      onError: () => notify("Could not remove the deployment.", "error"),
      onSuccess: () => {
        setRemoveOpen(false);
        notify("Deployment removed.", "success");
        navigate("/deployments");
      }
    });
  }

  return (
    <section>
      <button className="back-link" onClick={() => navigate("/deployments")}>
        <ArrowLeft size={16} /> {deployment.environment}
      </button>

      <PageHeader
        title="Deployment Verification"
        subtitle={`${deployment.name} \u00b7 last checked ${latest ? timeAgo(latest.startedAt) : "never"}`}
        actions={
          <>
            <button className="icon-button" onClick={() => navigate(`/verifications?deployment=${encodeURIComponent(deploymentId)}`)}>View History</button>
            {isAdmin ? (
              <button className="icon-button" onClick={() => setRemoveOpen(true)} aria-label="More actions">
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
              <div className="panel-title">Latest verification</div>
              <div className="latest-run">
                <StatusPill tone={healthTone(latest.healthStatus)}>{latest.healthStatus ?? "Unknown"}</StatusPill>
                <span className="latest-score">{latest.score ?? 0}<small>/100</small></span>
                <span className="muted">{latest.reason}</span>
                <button className="link-button" onClick={() => navigate(`/verifications/${encodeURIComponent(latest.ItemId ?? "")}`)}>Open report</button>
              </div>
            </div>
          ) : (
            <div className="panel">
              <div className="panel-title">Latest verification</div>
              <p className="muted">This deployment has not been verified yet.</p>
              <button className="primary-button" onClick={() => navigate(`/deployments/${encodeURIComponent(deploymentId)}/verify`)}>Verify Now</button>
            </div>
          )}

          {latest ? <AIAnalysisCard verification={latest} loading={false} /> : null}
        </div>

        <aside className="detail-side">
          <div className="panel">
            <div className="panel-title">Deployment Details</div>
            <dl className="details-list">
              <Detail label="Environment" value={deployment.environment} />
              <Detail label="URL" value={deployment.url} mono />
              <Detail label="Verified At" value={latest ? formatDateTime(latest.startedAt) : "Never"} />
              <Detail label="Duration" value={latest ? formatDuration(latest.durationSeconds) : "\u2014"} />
              <Detail label="Triggered By" value={latest ? `${latest.triggeredBy ?? "Staff"} \u00b7 ${latest.triggerType ?? "Manual"}` : "\u2014"} />
              <Detail label="Added By" value={deployment.addedBy || "Unknown"} />
            </dl>
          </div>

          {!isAdmin ? (
            <div className="panel">
              <div className="panel-title"><TriangleAlert size={16} />Removal</div>
              <p className="muted">Only admins can remove a deployment.</p>
            </div>
          ) : null}
        </aside>
      </div>

      {removeOpen ? (
        <ConfirmDialog
          title="Remove deployment"
          confirmLabel="Remove"
          message={`Remove "${deployment.name}"? Its past verifications stay readable under Verifications.`}
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