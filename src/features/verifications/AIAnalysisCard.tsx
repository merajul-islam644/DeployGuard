import { Bot, ExternalLink } from "lucide-react";
import type { Verification } from "./verificationsApi";
import { useNavigate } from "../../app/router/navigation";
import { Skeleton } from "../../shared/ui/Skeleton";

type Finding = { label: "Confirmed fact" | "Likely cause" | "Possible cause"; text: string; actions?: { label: string; evidence: string }[] };

// The AI analysis is written when the run finishes (summary, severity,
// warnings, recommendations saved with the verification). This card renders
// that finding, and derives the concrete findings from the run's reason.
export function AIAnalysisCard({ verification, loading }: { verification: Verification; loading: boolean }) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="panel ai-card">
        <div className="panel-title"><Bot size={16} />AI Analysis</div>
        <Skeleton className="skeleton-line-lg" />
        <Skeleton className="skeleton-line" />
        <Skeleton className="skeleton-line" />
      </div>
    );
  }

  const findings = deriveFindings(verification);
  const severity = verification.analysisSeverity ?? "low";

  return (
    <div className="panel ai-card">
      <div className="panel-title">
        <Bot size={16} />
        AI Analysis
        <span className={`sev sev-${severity}`}>{severity} severity</span>
      </div>
      {verification.summary ? <p className="ai-summary">{verification.summary}</p> : <p className="muted">No analysis was produced for this run.</p>}

      {findings.length ? (
        <ul className="findings">
          {findings.map((finding, index) => (
            <li key={index} className="finding">
              <span className={`finding-tag finding-${tagKey(finding.label)}`}>{finding.label}</span>
              <span>{finding.text}</span>
              {finding.actions?.length ? (
                <span className="finding-actions">
                  {finding.actions.map((action) => (
                    <button
                      key={action.label}
                      className="link-button"
                      onClick={() => navigate(`/verifications/${encodeURIComponent(verification.ItemId ?? "")}?evidence=${action.evidence}`)}
                    >
                      <ExternalLink size={13} /> {action.label}
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
          <span className="ai-subtitle">Warnings</span>
          <ul className="ai-lines">
            {verification.warnings.map((warning, index) => <li key={index}>{warning}</li>)}
          </ul>
        </div>
      ) : null}

      {verification.recommendations?.length ? (
        <div className="ai-subsection">
          <span className="ai-subtitle">Recommendations</span>
          <ul className="ai-lines">
            {verification.recommendations.map((recommendation, index) => <li key={index}>{recommendation}</li>)}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function tagKey(label: Finding["label"]): string {
  if (label === "Confirmed fact") return "confirmed";
  if (label === "Likely cause") return "likely";
  return "possible";
}

function deriveFindings(verification: Verification): Finding[] {
  if (verification.healthStatus === "Healthy" && !verification.warnings?.length) return [];

  const findings: Finding[] = [];
  if (verification.reason) findings.push({ label: "Confirmed fact", text: verification.reason });

  if (verification.healthStatus === "Failed") {
    const loadFailure = (verification.reason ?? "").toLowerCase().includes("load");
    if (loadFailure) {
      findings.push({
        label: "Likely cause",
        text: "The deployment did not return a usable response, so nothing after the load step could be measured.",
        actions: [{ evidence: "Network", label: "View Network" }, { evidence: "Screenshot", label: "View Screenshot" }]
      });
    } else {
      findings.push({
        label: "Likely cause",
        text: "A critical check failed. Review the evidence behind it to find exactly what broke.",
        actions: [{ evidence: "Network", label: "View Network" }, { evidence: "Screenshot", label: "View Screenshot" }]
      });
    }
  } else if (verification.warnings?.length) {
    findings.push({
      label: "Possible cause",
      text: `The evidence only hints at a cause: ${verification.warnings.join(" ")}`,
      actions: [{ evidence: "Network", label: "View Network" }]
    });
  }

  return findings;
}