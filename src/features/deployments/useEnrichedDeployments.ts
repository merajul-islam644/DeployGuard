import { useMemo } from "react";
import { useDeployments } from "../deployments/useDeployments";
import { latestByDeployment, useVerifications } from "../verifications/useVerifications";
import type { Verification } from "../verifications/verificationsApi";
import type { Deployment } from "../deployments/deploymentsApi";

export type EnrichedDeployment = Deployment & { latest?: Verification };

export function useEnrichedDeployments() {
  const deployments = useDeployments();
  const verifications = useVerifications();

  const items = useMemo<EnrichedDeployment[]>(() => {
    const latest = latestByDeployment(verifications.data ?? []);
    return (deployments.data?.items ?? []).map((deployment) => ({
      ...deployment,
      latest: deployment.ItemId ? latest.get(deployment.ItemId) : undefined
    }));
  }, [deployments.data, verifications.data]);

  return {
    deployments: items,
    isError: deployments.isError || verifications.isError,
    isLoading: deployments.isLoading || verifications.isLoading,
    refetch: () => {
      void deployments.refetch();
      void verifications.refetch();
    },
    verifications: verifications.data ?? []
  };
}