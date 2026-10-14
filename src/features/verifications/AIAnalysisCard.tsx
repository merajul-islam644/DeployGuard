import { Bot, ExternalLink } from "lucide-react";
import type { Verification } from "./verificationsApi";
import { useNavigate } from "../../app/router/navigation";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { Skeleton } from "../../shared/ui/Skeleton";

type T = ReturnType<typeof useT>["t"];
type FindingKind = "Confirmed fact" | "Likely cause" | "Possible cause";
type Finding = { actions?: { evidence: string; labelKey: string }[]; kind: FindingKind; text: string };

const FINDING_KEYS: Record<FindingKind, string> = {
  "Confirmed fact": "ai.confirmedFact",
  "Likely cause": "ai.likelyCause",
  "Possible cause": "ai.possibleCause"
};

// The AI analysis is written when the run finishes (summary, severity,
// warnings, recommendations saved with the verification). This card renders
// that finding, and derives the concrete findings from the run's reason.
export function AIAnalysisCard({ verification, loading }: { verification: Verification; loading: boolean }) {
  const navigate = useNavigate();
  const { t } = useT();

  if (loading) {
    return (
      <div className="panel ai-card">
        <div className="panel-title"><Bot size={16} />{t("ai.title", "AI Analysis")}</div>
        <Skeleton className="skeleton-line-lg" />
        <Skeleton className="skeleton-line" />
        <Skeleton className="skeleton-line" />
      </div>
    );
  }

  const findings = deriveFindings(verification, t);
  const severity = verification.analysisSeverity ?? "low";
  const severityKey = severity === "high" ? "ai.severityHigh" : severity === "medium" ? "ai.severityMedium" : "ai.severityLow";

  return (
    <div className="panel ai-card">
      <div className="panel-title">
        <Bot size={16} />
        {t("ai.title", "AI Analysis")}
        <span className={`sev sev-${severity}`}>{t("ai.severity", "{severity} severity", { severity: t(severityKey, severity) })}</span>
      </div>
      {verification.summary ? <p className="ai-summary">{verification.summary}</p> : <p className="muted">{t("ai.none", "No analysis was produced for this run.")}</p>}

      {findings.length ? (
        <ul className="findings">
          {findings.map((finding, index) => (
            <li key={index} className="finding">
              <span className={`finding-tag finding-${tagKey(finding.kind)}`}>{t(FINDING_KEYS[finding.kind], finding.kind)}</span>
              <span>{finding.text}</span>
              {finding.actions?.length ? (
                <span className="finding-actions">
                  {finding.actions.map((action) => (
                    <button
                      key={action.labelKey}
                      className="link-button"
                      onClick={() => navigate(`/verifications/${encodeURIComponent(verification.ItemId ?? "")}?evidence=${action.evidence}`)}
                    >
                      <ExternalLink size={13} /> {t(action.labelKey)}
                    </button>
                  ))}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {verification.warnings?.length ? (
        <div className="ai-subsection">
          <span className="ai-subtitle">{t("ai.warnings", "Warnings")}</span>
          <ul className="ai-lines">
            {verification.warnings.map((warning, index) => <li key={index}>{warning}</li>)}
          </ul>
        </div>
      ) : null}

      {verification.recommendations?.length ? (
        <div className="ai-subsection">
          <span className="ai-subtitle">{t("ai.recommendations", "Recommendations")}</span>
          <ul className="ai-lines">
            {verification.recommendations.map((recommendation, index) => <li key={index}>{recommendation}</li>)}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function tagKey(kind: FindingKind): string {
  if (kind === "Confirmed fact") return "confirmed";
  if (kind === "Likely cause") return "likely";
  return "possible";
}

function deriveFindings(verification: Verification, t: T): Finding[] {
  if (verification.healthStatus === "Healthy" && !verification.warnings?.length) return [];

  const findings: Finding[] = [];
  if (verification.reason) findings.push({ kind: "Confirmed fact", text: verification.reason });

  if (verification.healthStatus === "Failed") {
    const loadFailure = (verification.reason ?? "").toLowerCase().includes("load");
    findings.push({
      kind: "Likely cause",
      text: t(loadFailure ? "ai.loadCause" : "ai.criticalCause", loadFailure
        ? "The deployment did not return a usable response, so nothing after the load step could be measured."
        : "A critical check failed. Review the evidence behind it to find exactly what broke."),
      actions: [{ evidence: "Network", labelKey: "ai.viewNetwork" }, { evidence: "Screenshot", labelKey: "ai.viewScreenshot" }]
    });
  } else if (verification.warnings?.length) {
    findings.push({
      kind: "Possible cause",
      text: t("ai.hintCause", "The evidence only hints at a cause: {warnings}", { warnings: verification.warnings.join(" ") }),
      actions: [{ evidence: "Network", labelKey: "ai.viewNetwork" }]
    });
  }

  return findings;
}