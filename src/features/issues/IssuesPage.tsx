import { CheckCircle2, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { useIssues } from "./issuesApi";
import { useNavigate } from "../../app/router/navigation";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { checkLabel } from "../../lib/i18n/labels";
import { formatDateTime } from "../../shared/ui/format";
import { EmptyState } from "../../shared/ui/EmptyState";
import { ErrorState } from "../../shared/ui/ErrorState";
import { PageHeader } from "../../shared/ui/PageHeader";
import { Skeleton } from "../../shared/ui/Skeleton";
import { StatusPill } from "../../shared/ui/StatusPill";

export function IssuesPage() {
  const issues = useIssues();
  const navigate = useNavigate();
  const { language, t } = useT();
  const [showResolved, setShowResolved] = useState(false);

  const open = (issues.data ?? []).filter((issue) => issue.open !== false);
  const resolved = (issues.data ?? []).filter((issue) => issue.open === false);
  const visible = useMemo(() => (showResolved ? resolved : open), [showResolved, open, resolved]);

  return (
    <section>
      <PageHeader
        title={t("issues.title", "Issues")}
        subtitle={t("issues.subtitle", "Failed checks raised by recent verifications.")}
        actions={
          <button className={showResolved ? "chip active-chip" : "chip"} onClick={() => setShowResolved((value) => !value)}>
            {showResolved ? t("issues.showOpen", "Show open") : t("issues.openCount", "Open {count}", { count: open.length })}{showResolved ? t("issues.resolvedCount", " \u00b7 resolved {count}", { count: resolved.length }) : ""}
          </button>
        }
      />

      {issues.isLoading ? (
        <Skeleton className="skeleton-card" />
      ) : issues.isError ? (
        <ErrorState message={t("issues.couldNotLoad", "Could not load issues.")} onRetry={() => void issues.refetch()} />
      ) : !visible.length ? (
        <EmptyState
          icon={<CheckCircle2 size={28} />}
          title={showResolved ? t("issues.noResolved", "No resolved issues") : t("issues.noOpen", "No open issues.")}
          description={showResolved ? t("issues.noResolvedHint", "Resolved issues appear here after a later healthy run.") : t("issues.noOpenHint", "Every failed check is resolved or none have been raised.")}
        />
      ) : (
        <ul className="issue-cards">
          {visible.map((issue) => (
            <li className="issue-card" key={issue.ItemId}>
              <span className="issue-card-icon"><TriangleAlert size={18} /></span>
              <div className="issue-card-body">
                <div className="issue-card-head">
                  <strong>{issue.deploymentName ?? t("issues.deployment", "Deployment")}</strong>
                  <StatusPill tone={issue.open === false ? "good" : "bad"}>{issue.open === false ? t("issues.resolved", "Resolved") : t("issues.open", "Open")}</StatusPill>
                </div>
                <span className="issue-card-line">{checkLabel(t, issue.checkName)}: {issue.summary}</span>
                <span className="muted">{formatDateTime(issue.raisedAt, language)}</span>
              </div>
              <button className="icon-button" onClick={() => navigate(`/verifications/${encodeURIComponent(issue.verificationId ?? "")}`)}>{t("issues.viewReport", "View report")}</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}