import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import type { EnrichedDeployment } from "./useEnrichedDeployments";
import { healthTone, scoreTone, timeAgo } from "../../shared/ui/format";
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

  return (
    <article className="deployment-card">
      <div className="deployment-card-head">
        <div className="deployment-card-title">
          <button className="card-title-button" onClick={onOpen}>
            <h3>{deployment.name}</h3>
          </button>
          <span className="pill pill-neutral">{deployment.environment}</span>
        </div>
        <div className="row-actions">
          <button className="icon-button" onClick={onEdit} aria-label={`Edit ${deployment.name}`} title="Edit">
            <Pencil size={16} />
          </button>
          {isAdmin ? (
            <button className="icon-button" onClick={onRemove} aria-label={`Remove ${deployment.name}`} title="Remove">
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
            <StatusPill tone={healthTone(latest.healthStatus)}>{latest.healthStatus ?? "Unknown"}</StatusPill>
            <span className="deployment-score" style={{ color: scoreTone(latest.score) }}>{latest.score ?? 0}<small>/100</small></span>
          </>
        ) : (
          <StatusPill tone="neutral">Not verified</StatusPill>
        )}
        <span className="muted">{latest ? `Verified ${timeAgo(latest.startedAt)}` : "Never verified"}</span>
      </div>

      <div className="deployment-card-actions">
        <button className="primary-button" disabled={running} onClick={onVerify}>
          {running ? "Verifying\u2026" : "Verify Now"}
        </button>
        <button className="icon-button" onClick={onOpen}>View History</button>
      </div>
    </article>
  );
}