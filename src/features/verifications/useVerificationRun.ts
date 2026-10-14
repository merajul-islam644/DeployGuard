import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Deployment } from "../deployments/deploymentsApi";
import { enabledChecks, deploymentId } from "../deployments/deploymentsApi";
import { createIssues, resolveIssues, issueId, listIssues } from "../issues/issuesApi";
import { RUN_STEPS } from "./engine";
import type { EngineResult, RunStep } from "./engine";
import { runVerification } from "./engine";
import {
  clearInFlight,
  createActivity,
  createCheckResults,
  createEvidence,
  createVerification,
  markInFlight,
  updateVerification
} from "./verificationsApi";

export type LiveStep = { note: string; state: "pending" | "running" | "done" | "skipped"; step: RunStep };

export type RunPhase = "idle" | "running" | "finished" | "cancelled" | "timedout";
export type RunStatus = "Completed" | "Failed" | "Cancelled" | "Timed Out";
export type RunOutcome = { status: RunStatus; verificationId: string };

const RUN_LIMIT_MS = 120_000;

export function useVerificationRun() {
  const queryClient = useQueryClient();
  const [steps, setSteps] = useState<LiveStep[]>(() => RUN_STEPS.map((step) => ({ note: "", state: "pending", step })));
  const [phase, setPhase] = useState<RunPhase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [outcome, setOutcome] = useState<RunOutcome | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [deployment, setDeployment] = useState<Deployment | undefined>();

  const cancelled = useRef(false);
  const running = useRef(false);
  const timerRef = useRef<number>();

  const stopTimer = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = undefined;
  }, []);

  const cancel = useCallback(() => {
    cancelled.current = true;
  }, []);

  const start = useCallback(
    async (target: Deployment, triggeredBy: string): Promise<boolean> => {
      const id = deploymentId(target);
      if (running.current || !markInFlight(id)) return false;

      running.current = true;
      cancelled.current = false;
      setError(undefined);
      setOutcome(undefined);
      setPhase("running");
      setDeployment(target);
      setElapsed(0);
      setSteps(RUN_STEPS.map((step) => ({ note: "", state: "pending", step })));

      const startedAt = Date.now();
      const deadline = startedAt + RUN_LIMIT_MS;
      let timedOut = false;

      timerRef.current = window.setInterval(() => {
        const seconds = (Date.now() - startedAt) / 1000;
        setElapsed(seconds);
        if (Date.now() >= deadline) timedOut = true;
      }, 200);

      const onStep = (step: RunStep, note: string, state: "Running" | "Done" | "Skipped") => {
        setSteps((current) =>
          current.map((entry) =>
            entry.step === step
              ? { ...entry, note, state: state === "Running" ? "running" : state === "Done" ? "done" : "skipped" }
              : entry
          )
        );
      };

      let createdId: string | undefined;
      try {
        createdId = await createVerification({
          checks: enabledChecks(target),
          deploymentId: id,
          deploymentName: target.name,
          environment: target.environment,
          healthStatus: "Needs Attention",
          score: 0,
          startedAt: new Date(startedAt).toISOString(),
          status: "Failed",
          triggerType: "Manual",
          triggeredBy,
          url: target.url
        });

        await createActivity({
          notedAt: new Date().toISOString(),
          order: 0,
          state: "Running",
          stepName: "Opening browser",
          verificationId: createdId
        });

        const result = await runVerification(target.url ?? "", {
          isCancelled: () => cancelled.current,
          onStep,
          startedAt
        });

        const duration = (Date.now() - startedAt) / 1000;
        const terminal: RunStatus = timedOut ? "Timed Out" : cancelled.current ? "Cancelled" : result.status === "Failed" ? "Failed" : "Completed";

        if (terminal === "Cancelled" || terminal === "Timed Out") {
          stopTimer();
          await finalize(queryClient, target, { duration, id: createdId, result: undefined, terminal });
          setPhase(terminal === "Cancelled" ? "cancelled" : "timedout");
          setOutcome({ status: terminal, verificationId: createdId });
          return true;
        }

        stopTimer();
        await finalize(queryClient, target, { duration, id: createdId, result, terminal });
        setPhase("finished");
        setOutcome({ status: terminal, verificationId: createdId });
        return true;
      } catch (caught) {
        stopTimer();
        setError((caught as Error).message);
        setPhase("idle");
        if (createdId) {
          await updateVerification(createdId, { healthStatus: "Failed", reason: "The run could not be completed.", status: "Failed" }).catch(() => undefined);
        }
        return true;
      } finally {
        running.current = false;
        clearInFlight(id);
      }
    },
    [queryClient, stopTimer]
  );

  return { cancel, deployment, elapsed, error, outcome, phase, start, steps };
}

async function finalize(
  queryClient: ReturnType<typeof useQueryClient>,
  target: Deployment,
  payload: { duration: number; id: string; result: EngineResult | undefined; terminal: RunStatus }
): Promise<void> {
  const { duration, id, result, terminal } = payload;

  if (!result || terminal === "Cancelled" || terminal === "Timed Out") {
    await updateVerification(id, {
      durationSeconds: Number(duration.toFixed(1)),
      healthStatus: "Failed",
      reason: terminal === "Cancelled" ? "The run was cancelled." : "The run passed the 120 second limit.",
      score: 0,
      status: terminal
    });
    await createActivity({
      notedAt: new Date().toISOString(),
      note: terminal === "Cancelled" ? "Stopped by the operator" : "Reached the 120 second limit",
      order: 99,
      state: "Skipped",
      stepName: terminal === "Cancelled" ? "Cancelled" : "Timed out",
      verificationId: id
    });
    await invalidate(queryClient);
    return;
  }

  await createCheckResults(result.checks.map((entry) => ({ ...entry, verificationId: id })));
  if (result.evidence.length) {
    await createEvidence(result.evidence.map((entry) => ({ ...entry, verificationId: id })));
  }
  await createActivity({
    notedAt: new Date().toISOString(),
    note: `${result.checks.length} checks recorded`,
    order: 90,
    state: "Done",
    stepName: "Running AI analysis",
    verificationId: id
  });
  await updateVerification(id, {
    analysisSeverity: result.severity,
    durationSeconds: Number(duration.toFixed(1)),
    healthStatus: result.healthStatus,
    reason: result.reason,
    recommendations: result.recommendations,
    score: result.score,
    status: result.status,
    summary: result.summary,
    warnings: result.warnings
  });

  try {
    const failed = result.checks.filter((entry) => entry.outcome === "Failed");
    if (failed.length) {
      await createIssues(
        failed.map((entry) => ({
          checkKey: entry.checkKey,
          checkName: entry.checkName,
          deploymentId: deploymentId(target),
          deploymentName: target.name,
          open: true,
          raisedAt: new Date().toISOString(),
          summary: entry.detail[0] ?? `${entry.checkName} failed.`,
          verificationId: id
        }))
      );
    } else if (result.healthStatus === "Healthy") {
      const existing = await listIssues();
      const open = existing.filter((issue) => issue.open !== false && issue.deploymentId === deploymentId(target)).map(issueId);
      if (open.length) await resolveIssues(open);
    }
  } catch {
    // Issue bookkeeping is best-effort; the run itself is already saved.
  }

  await invalidate(queryClient);
}

async function invalidate(queryClient: ReturnType<typeof useQueryClient>): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: ["verifications"] });
  await queryClient.invalidateQueries({ queryKey: ["issues"] });
}