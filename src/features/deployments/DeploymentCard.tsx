import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import type { EnrichedDeployment } from "./useEnrichedDeployments";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { environmentLabel, statusLabel, timeAgoLabel } from "../../lib/i18n/labels";
import { healthTone, scoreTone } from "../../shared/ui/format";
import { StatusPill } from "../../shared/ui/StatusPill";

export function DeploymentCard({
  deployment,
  isAdmin,
  running,
  onEdit,
  onRemove,
  onOpen,
  onVerify
}: {
  deployment: EnrichedDeployment;
  isAdmin: boolean;
  running: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onOpen: () => void;
  onVerify: () => void;
}) {
  const latest = deployment.latest;
  const { t } = useT();

  return (
    <article className="deployment-card">
      <div className="deployment-card-head">
        <div className="deployment-card-title">
          <button className="card-title-button" onClick={onOpen}>
            <h3>{deployment.name}</h3>
          </button>
          <span className="pill pill-neutral">{environmentLabel(t, deployment.environment)}</span>
        </div>
        <div className="row-actions">
          <button className="icon-button" onClick={onEdit} aria-label={t("deployments.editAria", "Edit {name}", { name: deployment.name ?? "" })} title={t("deployments.edit", "Edit")}>
            <Pencil size={16} />
          </button>
          {isAdmin ? (
            <button className="icon-button" onClick={onRemove} aria-label={t("deployments.removeAria", "Remove {name}", { name: deployment.name ?? "" })} title={t("deployments.removeLabel", "Remove")}>
              <Trash2 size={16} />
            </button>
          ) : null}
        </div>
      </div>

      <a className="deployment-url mono" href={deployment.url} target="_blank" rel="noreferrer">
        <ExternalLink size={13} />
        {deployment.url}
      </a>

      <div className="deployment-card-status">
        {latest ? (
          <>
            <StatusPill tone={healthTone(latest.healthStatus)}>{statusLabel(t, latest.healthStatus)}</StatusPill>
            <span className="deployment-score" style={{ color: scoreTone(latest.score) }}>{latest.score ?? 0}<small>/100</small></span>
          </>
        ) : (
          <StatusPill tone="neutral">{t("overview.notVerified", "Not verified")}</StatusPill>
        )}
        <span className="muted">{latest ? t("overview.verified", "Verified {when}", { when: timeAgoLabel(t, latest.startedAt) }) : t("overview.neverVerified", "Never verified")}</span>
      </div>

      <div className="deployment-card-actions">
        <button className="primary-button" disabled={running} onClick={onVerify}>
          {running ? t("overview.verifying", "Verifying\u2026") : t("overview.verifyNow", "Verify Now")}
        </button>
        <button className="icon-button" onClick={onOpen}>{t("deployments.viewHistory", "View History")}</button>
      </div>
    </article>
  );
}