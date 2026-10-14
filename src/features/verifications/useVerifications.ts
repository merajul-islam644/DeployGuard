import { useQuery } from "@tanstack/react-query";
import { getVerification, listCheckResults, listEvidence, listVerifications } from "./verificationsApi";
import type { CheckResultRecord, EvidenceRecord, Verification } from "./verificationsApi";

export function useVerifications() {
  return useQuery({ queryFn: listVerifications, queryKey: ["verifications", "list"] });
}

export function useVerification(id: string) {
  return useQuery({ enabled: Boolean(id), queryFn: () => getVerification(id), queryKey: ["verifications", id] });
}

export function useCheckResults(verificationId: string) {
  return useQuery({
    enabled: Boolean(verificationId),
    queryFn: () => listCheckResults(verificationId),
    queryKey: ["verifications", verificationId, "checks"]
  });
}

export function useEvidence(verificationId: string) {
  return useQuery({
    enabled: Boolean(verificationId),
    queryFn: () => listEvidence(verificationId),
    queryKey: ["verifications", verificationId, "evidence"]
  });
}

export type ReportData = {
  checks: CheckResultRecord[];
  evidence: EvidenceRecord[];
  verification: Verification;
};

export function latestByDeployment(verifications: Verification[]): Map<string, Verification> {
  const map = new Map<string, Verification>();
  for (const verification of verifications) {
    const key = verification.deploymentId ?? "";
    if (!key) continue;
    if (!map.has(key)) map.set(key, verification);
  }
  return map;
}