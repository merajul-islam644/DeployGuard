import { useEffect, useState } from "react";
import { ChevronRight, Image as ImageIcon, ListTree, Network, ScrollText, Terminal, Timer } from "lucide-react";
import { useCheckResults, useEvidence, useVerification } from "./useVerifications";
import type { CheckResultRecord, EvidenceRecord } from "./verificationsApi";
import { AIAnalysisCard } from "./AIAnalysisCard";
import { EvidenceViewer } from "./EvidenceViewer";
import { useNavigate } from "../../app/router/navigation";
import { useQueryParam } from "../../app/router/useSearchParams";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { checkLabel, environmentLabel, evidenceLabel, statusLabel } from "../../lib/i18n/labels";
import { formatDateTime, formatDuration, healthTone, outcomeTone } from "../../shared/ui/format";
import { Alert } from "../../shared/ui/Alert";
import { PageHeader } from "../../shared/ui/PageHeader";
import { ScoreRing } from "../../shared/ui/ScoreRing";
import { Skeleton } from "../../shared/ui/Skeleton";
import { StatusPill } from "../../shared/ui/StatusPill";

const EVIDENCE_ICONS = {
  Console: Terminal,
  DOM: ScrollText,
  Network: Network,
  Screenshot: ImageIcon,
  Timeline: Timer,
  Trace: ListTree
} as const;

export function VerificationReportPage({ verificationId }: { verificationId: string; onNavigate?: (path: string) => void; search?: string }) {
  const verification = useVerification(verificationId);
  const checks = useCheckResults(verificationId);
  const evidence = useEvidence(verificationId);
  const navigate = useNavigate();
  const { language, t } = useT();
  const requestedEvidence = useQueryParam("evidence");
  const [openEvidence, setOpenEvidence] = useState<EvidenceRecord | undefined>();

  useEffect(() => {
    if (requestedEvidence && evidence.data) {
      const match = evidence.data.find((entry) => entry.kind === requestedEvidence);
      if (match) setOpenEvidence(match);
    }
  }, [requestedEvidence, evidence.data]);

  if (verification.isLoading) {
    return (
      <section>
        <Skeleton className="skeleton-card" />
      </section>
    );
  }

  if (verification.isError || !verification.data) {
    return (
      <section>
        <PageHeader title={t("report.title", "Verification")} subtitle={t("report.missing", "This verification no longer exists.")} />
        <Alert tone="error">{t("report.missing", "This verification no longer exists.")}</Alert>
        <button className="primary-button" onClick={() => navigate("/verifications")}>{t("report.backToHistory", "Back to History")}</button>
      </section>
    );
  }

  const run = verification.data;
  const healthy = run.healthStatus === "Healthy";
  const checkList = checks.data ?? [];
  const evidenceList = evidence.data ?? [];

  return (
    <section>
      <button className="back-link" onClick={() => navigate(`/deployments/${encodeURIComponent(run.deploymentId ?? "")}`)}>
        <ChevronRight size={16} /> {environmentLabel(t, run.environment)}
      </button>

      <PageHeader
        title={t("report.verificationOf", "{name} verification", { name: run.deploymentName ?? t("issues.deployment", "Deployment") })}
        subtitle={`${formatDateTime(run.startedAt, language)} \u00b7 ${formatDuration(run.durationSeconds)} \u00b7 ${run.triggeredBy ?? t("common.staff", "Staff")} \u00b7 ${run.triggerType ?? t("common.manual", "Manual")}`}
        actions={<StatusPill tone={healthTone(run.healthStatus)}>{statusLabel(t, run.healthStatus)}</StatusPill>}
      />

      <div className="report-hero">
        <ScoreRing score={run.score ?? 0} />
        <div className="report-hero-copy">
          <span className="report-status" style={{ color: "inherit" }}>
            <StatusPill tone={healthTone(run.healthStatus)}>{statusLabel(t, run.healthStatus)}</StatusPill>
          </span>
          <h3>{healthy ? t("report.heroHealthy", "Your deployment is working as expected!") : run.reason ?? t("report.heroProblemTitle", "This deployment needs attention.")}</h3>
          <p className="muted">
            {healthy
              ? run.warnings?.length
                ? run.warnings.length === 1
                  ? t("report.warningFound", "All critical user-facing checks passed successfully. {count} non-blocking warning was found.", { count: run.warnings.length })
                  : t("report.warningsFound", "All critical user-facing checks passed successfully. {count} non-blocking warnings were found.", { count: run.warnings.length })
                : t("report.allPassed", "All seven checks passed successfully.")
              : run.reason ?? t("report.heroProblem", "A critical check failed.")}
          </p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">{t("report.steps", "Verification Steps")}</div>
        <div className="table-shell">
          <table>
            <thead>
              <tr><th>{t("report.check", "Check")}</th><th>{t("report.result", "Result")}</th><th>{t("report.outcome", "Outcome")}</th><th>{t("report.duration", "Duration")}</th><th /></tr>
            </thead>
            <tbody>
              {checkList.map((result) => (
                <CheckRow key={result.ItemId ?? result.checkKey} result={result} onOpen={() => pickEvidenceForCheck(result, evidenceList, setOpenEvidence)} />
              ))}
            </tbody>
          </table>
          {checks.isLoading ? <Skeleton className="skeleton-line" /> : null}
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">{t("report.evidence", "Evidence")}</div>
        <div className="evidence-grid">
          {evidenceList.map((entry) => {
            const Icon = EVIDENCE_ICONS[(entry.kind as keyof typeof EVIDENCE_ICONS) ?? "DOM"] ?? ScrollText;
            return (
              <button className="evidence-card" key={entry.ItemId ?? entry.kind} onClick={() => setOpenEvidence(entry)}>
                <span className="evidence-card-icon"><Icon size={18} /></span>
                <span className="evidence-card-title">{evidenceLabel(t, entry.kind)}</span>
                <span className="evidence-card-preview muted">
                  {entry.notCaptured
                    ? entry.kind === "Trace"
                      ? t("report.traceMissing", "Trace not captured for this run.")
                      : t("report.notCapturedRun", "{kind} was not captured for this run.", { kind: evidenceLabel(t, entry.kind) })
                    : entry.capture}
                </span>
              </button>
            );
          })}
          {evidence.isLoading ? [0, 1, 2, 3, 4, 5].map((key) => <Skeleton className="skeleton-card" key={key} />) : null}
        </div>
      </div>

      <AIAnalysisCard verification={run} loading={false} />

      {openEvidence ? <EvidenceViewer evidence={openEvidence} onClose={() => setOpenEvidence(undefined)} /> : null}
    </section>
  );
}

function CheckRow({ result, onOpen }: { result: CheckResultRecord; onOpen: () => void }) {
  const { t } = useT();
  return (
    <tr className="clickable" onClick={onOpen}>
      <td><strong>{checkLabel(t, result.checkName)}</strong><div className="muted check-detail-hint">{result.detail?.[0]}</div></td>
      <td className="mono">{result.result}</td>
      <td><StatusPill tone={outcomeTone(result.outcome)}>{statusLabel(t, result.outcome)}</StatusPill></td>
      <td className="mono">{formatDuration(result.durationSeconds)}</td>
      <td><ChevronRight size={16} /></td>
    </tr>
  );
}

function pickEvidenceForCheck(result: CheckResultRecord, list: EvidenceRecord[], open: (entry: EvidenceRecord) => void) {
  const preferred =
    result.checkKey === "network" ? "Network" : result.checkKey === "console" ? "Console" : result.checkKey === "application-load" ? "Screenshot" : "Timeline";
  const match = list.find((entry) => entry.kind === preferred) ?? list[0];
  if (match) open(match);
}