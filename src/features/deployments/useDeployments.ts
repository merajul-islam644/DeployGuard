import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createDeployment, deleteDeployment, listDeployments, updateDeployment, deploymentId } from "./deploymentsApi";
import type { Deployment, DeploymentInput } from "./deploymentsApi";

const KEY = ["deployments"];

export function useDeployments() {
  return useQuery({ queryFn: listDeployments, queryKey: KEY });
}

export function useDeploymentMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: KEY });

  return {
    create: useMutation({ mutationFn: (input: DeploymentInput) => createDeployment(input), onSuccess: invalidate }),
    remove: useMutation({ mutationFn: (deployment: Deployment) => deleteDeployment(deploymentId(deployment)), onSuccess: invalidate }),
    update: useMutation({ mutationFn: ({ deployment, input }: { deployment: Deployment; input: Omit<DeploymentInput, "addedBy"> }) => updateDeployment(deploymentId(deployment), input), onSuccess: invalidate })
  };
}