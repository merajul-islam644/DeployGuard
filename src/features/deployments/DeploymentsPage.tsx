import { useMemo, useState } from "react";
import { Plus, Rocket, TriangleAlert } from "lucide-react";
import { useCurrentUser, userDisplayName } from "../profile/useCurrentUser";
import { useIsAdmin } from "../access/useIsAdmin";
import { useEnrichedDeployments } from "./useEnrichedDeployments";
import type { EnrichedDeployment } from "./useEnrichedDeployments";
import { useDeploymentMutations } from "./useDeployments";
import { recordChange } from "../settings/changesApi";
import { runningVerification } from "../verifications/runningRuns";
import { DeploymentCard } from "./DeploymentCard";
import { DeploymentForm } from "./DeploymentForm";
import type { DeploymentFormValues } from "./DeploymentForm";
import { ENVIRONMENT_ORDER } from "./environments";
import type { Environment } from "./environments";
import { useNavigate } from "../../app/router/navigation";
import { useQueryParam } from "../../app/router/useSearchParams";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { environmentLabel } from "../../lib/i18n/labels";
import { ConfirmDialog } from "../../shared/ui/ConfirmDialog";
import { EmptyState } from "../../shared/ui/EmptyState";
import { ErrorState } from "../../shared/ui/ErrorState";
import { PageHeader } from "../../shared/ui/PageHeader";
import { Skeleton } from "../../shared/ui/Skeleton";
import { useToast } from "../../shared/ui/Toast";

export function DeploymentsPage() {
  const enriched = useEnrichedDeployments();
  const mutations = useDeploymentMutations();
  const profile = useCurrentUser();
  const isAdmin = useIsAdmin();
  const { notify } = useToast();
  const { t } = useT();
  const navigate = useNavigate();
  const environmentParam = useQueryParam("environment");
  const searchTerm = (useQueryParam("q") ?? "").trim().toLowerCase();

  const [editing, setEditing] = useState<EnrichedDeployment | undefined>();
  const [formOpen, setFormOpen] = useState(false);
  const [removing, setRemoving] = useState<EnrichedDeployment | undefined>();
  const [formError, setFormError] = useState("");

  const actor = userDisplayName(profile.data?.data) || profile.data?.data?.email || "A staff member";
  const visible = useMemo(
    () =>
      enriched.deployments.filter((deployment) =>
        !searchTerm ? true : `${deployment.name ?? ""} ${deployment.url ?? ""}`.toLowerCase().includes(searchTerm)
      ),
    [enriched.deployments, searchTerm]
  );
  const grouped = useMemo(() => groupByEnvironment(visible), [visible]);
  const hasAny = enriched.deployments.length > 0;
  const environment = (ENVIRONMENT_ORDER as string[]).includes(environmentParam ?? "")
    ? (environmentParam as Environment)
    : undefined;
  const environments = environment ? [environment] : ENVIRONMENT_ORDER;

  function openCreate() {
    setEditing(undefined);
    setFormError("");
    setFormOpen(true);
  }

  function openEdit(deployment: EnrichedDeployment) {
    setEditing(deployment);
    setFormError("");
    setFormOpen(true);
  }

  function submit(values: DeploymentFormValues) {
    setFormError("");
    if (editing) {
      const before = describeDeployment(editing);
      mutations.update.mutate(
        { deployment: editing, input: values },
        {
          onError: () => setFormError(t("deployments.saveFailed", "Could not save the deployment. Please try again.")),
          onSuccess: () => {
            setFormOpen(false);
            setEditing(undefined);
            notify(t("deployments.saved", "Deployment saved."), "success");
            void recordChange({ action: "Updated", after: describeValues(values), before, changedBy: actor, entity: "Deployment", record: values.name });
          }
        }
      );
      return;
    }
    mutations.create.mutate(
      { ...values, addedBy: actor },
      {
        onError: () => setFormError(t("deployments.saveFailed", "Could not save the deployment. Please try again.")),
        onSuccess: () => {
          setFormOpen(false);
          notify(t("deployments.saved", "Deployment saved."), "success");
          void recordChange({ action: "Added", after: describeValues(values), changedBy: actor, entity: "Deployment", record: values.name });
        }
      }
    );
  }

  function confirmRemove() {
    if (!removing) return;
    const target = removing;
    mutations.remove.mutate(target, {
      onError: () => notify(t("deployments.removeFailed", "Could not remove the deployment."), "error"),
      onSuccess: () => {
        setRemoving(undefined);
        notify(t("deployments.removed", "Deployment removed."), "success");
        void recordChange({ action: "Removed", before: describeDeployment(target), changedBy: actor, entity: "Deployment", record: target.name ?? "Deployment" });
      }
    });
  }

  function verifyNow(deployment: EnrichedDeployment) {
    const id = deployment.ItemId;
    if (!id) return;
    if (runningVerification(id)) {
      notify(t("deployments.alreadyRunning", "A verification is already running for {environment}.", { environment: environmentLabel(t, deployment.environment) }), "info");
      return;
    }
    navigate(`/deployments/${encodeURIComponent(id)}/verify`);
  }

  const actions = hasAny ? (
    <button className="primary-button" onClick={openCreate}>
      <Plus size={16} />
      {t("deployments.addDeployment", "Add Deployment")}
    </button>
  ) : null;

  return (
    <section>
      <PageHeader
        title={t("deployments.title", "Deployments")}
        subtitle={t("deployments.subtitle", "Every web application address DeployGuard verifies, grouped by environment.")}
        actions={actions}
      />

      {enriched.isLoading ? (
        <DeploymentsSkeleton />
      ) : enriched.isError ? (
        <ErrorState message={t("deployments.couldNotLoad", "Could not load deployments.")} onRetry={enriched.refetch} />
      ) : !hasAny ? (
        <EmptyState
          icon={<Rocket size={28} />}
          title={t("deployments.noDeployments", "No deployments yet")}
          description={t("overview.addFirst", "Add your first deployment and run your first automated verification.")}
          action={<button className="primary-button" onClick={openCreate}><Plus size={16} />{t("deployments.addDeployment", "Add Deployment")}</button>}
        />
      ) : (
        <div className="environment-groups">
          {environments.map((env) => {
            const items = grouped[env] ?? [];
            return (
              <div className="environment-group" key={env}>
                <div className="environment-heading">
                  <h3>{environmentLabel(t, env)}</h3>
                  <span className="muted">{items.length}</span>
                </div>
                {items.length ? (
                  <div className="deployment-grid">
                    {items.map((deployment) => (
                      <DeploymentCard
                        key={deployment.ItemId}
                        deployment={deployment}
                        isAdmin={isAdmin}
                        running={Boolean(deployment.ItemId && runningVerification(deployment.ItemId))}
                        onEdit={() => openEdit(deployment)}
                        onOpen={() => navigate(`/deployments/${encodeURIComponent(deployment.ItemId ?? "")}`)}
                        onRemove={() => setRemoving(deployment)}
                        onVerify={() => verifyNow(deployment)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="environment-empty muted">{t("overview.noDeploymentsIn", "No deployments in {environment}.", { environment: environmentLabel(t, env) })}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {formOpen ? (
        <DeploymentForm
          deployment={editing}
          error={formError}
          onClose={() => { setFormOpen(false); setEditing(undefined); }}
          onSubmit={submit}
          submitting={mutations.create.isPending || mutations.update.isPending}
        />
      ) : null}

      {removing ? (
        <ConfirmDialog
          title={t("deployments.removeTitle", "Remove deployment")}
          confirmLabel={t("deployments.removeLabel", "Remove")}
          message={t("deployments.removeMessage", "Remove \"{name}\"? Its past verifications stay readable under Verifications.", { name: removing.name ?? "" })}
          onCancel={() => setRemoving(undefined)}
          onConfirm={confirmRemove}
        />
      ) : null}

      {!isAdmin && removing ? (
        <div className="not-allowed" role="alert">
          <TriangleAlert size={16} />
          {t("deployments.onlyAdminsRemove", "Only admins can remove a deployment.")}
        </div>
      ) : null}
    </section>
  );
}

function describeDeployment(deployment: EnrichedDeployment): string {
  return `${deployment.name} \u00b7 ${deployment.environment} \u00b7 ${deployment.url}`;
}

function describeValues(values: DeploymentFormValues): string {
  return `${values.name} \u00b7 ${values.environment} \u00b7 ${values.url} \u00b7 ${values.checks.length} checks`;
}

function groupByEnvironment(items: EnrichedDeployment[]): Record<string, EnrichedDeployment[]> {
  const result: Record<string, EnrichedDeployment[]> = {};
  for (const item of items) {
    const environment: Environment = (ENVIRONMENT_ORDER as string[]).includes(item.environment ?? "") ? (item.environment as Environment) : "Custom";
    (result[environment] ??= []).push(item);
  }
  return result;
}

function DeploymentsSkeleton() {
  return (
    <div className="deployment-grid">
      {[0, 1, 2, 3].map((key) => <Skeleton className="skeleton-card" key={key} />)}
    </div>
  );
}