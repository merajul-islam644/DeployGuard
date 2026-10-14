import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDeployments } from "../deployments/useDeployments";
import { useCurrentUser, userDisplayName } from "../profile/useCurrentUser";
import { useNavigate } from "../../app/router/navigation";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { environmentLabel, statusLabel, stepLabel } from "../../lib/i18n/labels";
import { useVerificationRun } from "./useVerificationRun";
import type { LiveStep } from "./useVerificationRun";
import { markRunning, clearRunning, runningVerification } from "./runningRuns";
import { Alert } from "../../shared/ui/Alert";
import { Skeleton } from "../../shared/ui/Skeleton";
import { useToast } from "../../shared/ui/Toast";

export function VerifyPage({ deploymentId }: { deploymentId: string; onNavigate?: (path: string) => void }) {
  const deployments = useDeployments();
  const profile = useCurrentUser();
  const navigate = useNavigate();
  const { notify } = useToast();
  const { t } = useT();
  const run = useVerificationRun();
  const startedRef = useRef(false);

  const deployment = (deployments.data?.items ?? []).find((item) => item.ItemId === deploymentId);
  const [alreadyRunning, setAlreadyRunning] = useState(() => Boolean(runningVerification(deploymentId)));

  useEffect(() => {
    if (startedRef.current || !deployment) return;
    if (runningVerification(deploymentId)) {
      setAlreadyRunning(true);
      return;
    }
    startedRef.current = true;
    const actor = userDisplayName(profile.data?.data) || profile.data?.data?.email || "Staff";
    markRunning(deploymentId, deployment.name ?? "Deployment", deployment.environment ?? "Production");
    void run.start(deployment, actor).then((started) => {
      if (started) notify(t("run.started", "Verification started"), "info");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deployment]);

  useEffect(() => {
    if (run.phase === "finished") {
      clearRunning(deploymentId);
      notify(t("run.completed", "Verification completed successfully"), "success");
    } else if (run.phase === "cancelled") {
      clearRunning(deploymentId);
      notify(t("run.stopped", "Verification stopped."), "info");
    } else if (run.phase === "timedout") {
      clearRunning(deploymentId);
      notify(t("run.failed", "Verification failed"), "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.phase]);

  useEffect(() => () => clearRunning(deploymentId), [deploymentId]);

  if (deployments.isLoading) {
    return <section><Skeleton className="skeleton-card" /></section>;
  }

  if (!deployment) {
    return <section><Alert tone="error">{t("run.missing", "This deployment no longer exists.")}</Alert></section>;
  }

  if (alreadyRunning && run.phase === "idle") {
    return (
      <section>
        <Alert tone="warn">{t("run.alreadyRunning", "A verification is already running for {environment}.", { environment: environmentLabel(t, deployment.environment) })}</Alert>
        <button className="primary-button" onClick={() => navigate(`/deployments/${encodeURIComponent(deploymentId)}`)}>{t("run.backToDeployment", "Back to deployment")}</button>
      </section>
    );
  }

  return (
    <section>
      <header className="run-header">
        <div>
          <h2>{t("run.verifying", "Verifying {environment}", { environment: environmentLabel(t, deployment.environment) })}</h2>
          <a className="deployment-url mono" href={deployment.url} target="_blank" rel="noreferrer">{deployment.url}</a>
        </div>
        <div className="run-header-meta">
          <span className="run-elapsed">{t("run.elapsed", "Elapsed: {seconds}s", { seconds: run.elapsed.toFixed(1) })}</span>
          {run.phase === "running" ? (
            <button className="icon-button" onClick={() => run.cancel()}>{t("run.cancel", "Cancel Verification")}</button>
          ) : null}
        </div>
      </header>

      {run.error ? <Alert tone="error">{run.error}</Alert> : null}

      <RunPanel steps={run.steps} />

      {run.phase === "finished" || run.phase === "cancelled" || run.phase === "timedout" ? (
        <RunComplete
          outcome={run.outcome}
          onOpenReport={() => run.outcome && navigate(`/verifications/${encodeURIComponent(run.outcome.verificationId)}`)}
        />
      ) : null}
    </section>
  );
}

function RunPanel({ steps }: { steps: LiveStep[] }) {
  const { t } = useT();
  return (
    <div className="run-panel">
      {steps.map((entry) => (
        <div className={`run-step run-step-${entry.state}`} key={entry.step}>
          <span className="run-step-icon">{iconFor(entry.state)}</span>
          <span className="run-step-name">{stepLabel(t, entry.step)}</span>
          <span className="run-step-note muted">{entry.note}</span>
        </div>
      ))}
    </div>
  );
}

function iconFor(state: LiveStep["state"]) {
  if (state === "done") return <CheckCircle2 size={16} />;
  if (state === "skipped") return <XCircle size={16} />;
  if (state === "running") return <Loader2 className="spin" size={16} />;
  return <Circle size={16} />;
}

function RunComplete({ outcome, onOpenReport }: { outcome?: { status: string }; onOpenReport: () => void }) {
  const { t } = useT();
  const status = outcome?.status ?? "Completed";
  return (
    <div className="run-complete">
      <h3>{status === "Completed" ? t("run.completeTitle", "Verification Complete") : statusLabel(t, status)}</h3>
      <div className="run-complete-actions">
        <button className="primary-button" onClick={onOpenReport}>{t("run.viewReport", "View Report")}</button>
      </div>
      {status === "Timed Out" ? <p className="muted">{t("run.timedOutNote", "The run passed the 120 second limit and was stopped.")}</p> : null}
      {status === "Cancelled" ? <p className="muted">{t("run.cancelledNote", "Verification stopped. It is kept in History as Cancelled.")}</p> : null}
    </div>
  );
}