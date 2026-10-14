import { CheckCircle2, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { useIssues } from "./issuesApi";
import { useNavigate } from "../../app/router/navigation";
import { formatDateTime } from "../../shared/ui/format";
import { EmptyState } from "../../shared/ui/EmptyState";
import { ErrorState } from "../../shared/ui/ErrorState";
import { PageHeader } from "../../shared/ui/PageHeader";
import { Skeleton } from "../../shared/ui/Skeleton";
import { StatusPill } from "../../shared/ui/StatusPill";

export function IssuesPage() {
  const issues = useIssues();
  const navigate = useNavigate();
  const [showResolved, setShowResolved] = useState(false);

  const open = (issues.data ?? []).filter((issue) => issue.open !== false);
  const resolved = (issues.data ?? []).filter((issue) => issue.open === false);
  const visible = useMemo(() => (showResolved ? resolved : open), [showResolved, open, resolved]);

  return (
    <section>
      <PageHeader
        title="Issues"
        subtitle="Failed checks raised by recent verifications."
        actions={
          <button className={showResolved ? "chip active-chip" : "chip"} onClick={() => setShowResolved((value) => !value)}>
            {showResolved ? "Show open" : `Open ${open.length}`}{showResolved ? ` \u00b7 resolved ${resolved.length}` : ""}
          </button>
        }
      />

      {issues.isLoading ? (
        <Skeleton className="skeleton-card" />
      ) : issues.isError ? (
        <ErrorState message="Could not load issues." onRetry={() => void issues.refetch()} />
      ) : !visible.length ? (
        <EmptyState
          icon={<CheckCircle2 size={28} />}
          title={showResolved ? "No resolved issues" : "No open issues."}
          description={showResolved ? "Resolved issues appear here after a later healthy run." : "Every failed check is resolved or none have been raised."}
        />
      ) : (
        <ul className="issue-cards">
          {visible.map((issue) => (
            <li className="issue-card" key={issue.ItemId}>
              <span className="issue-card-icon"><TriangleAlert size={18} /></span>
              <div className="issue-card-body">
                <div className="issue-card-head">
                  <strong>{issue.deploymentName ?? "Deployment"}</strong>
                  <StatusPill tone={issue.open === false ? "good" : "bad"}>{issue.open === false ? "Resolved" : "Open"}</StatusPill>
                </div>
                <span className="issue-card-line">{issue.checkName}: {issue.summary}</span>
                <span className="muted">{formatDateTime(issue.raisedAt)}</span>
              </div>
              <button className="icon-button" onClick={() => navigate(`/verifications/${encodeURIComponent(issue.verificationId ?? "")}`)}>View report</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}