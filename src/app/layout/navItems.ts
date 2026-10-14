import { Activity, BarChart3, Gauge, ListChecks, Rocket, Settings, TriangleAlert } from "lucide-react";

export type NavItem = {
  href: string;
  labelKey: string;
  label?: string;
  icon: typeof Rocket;
  badgeKey?: "issues";
};

// DeployGuard's real sections. Environments live inside Deployments; Issues
// carries the open-issue count as a badge.
export const navItems: NavItem[] = [
  { href: "/", label: "Overview", labelKey: "nav.overview", icon: Gauge },
  { href: "/deployments", label: "Deployments", labelKey: "nav.deployments", icon: Rocket },
  { href: "/verifications", label: "Verifications", labelKey: "nav.verifications", icon: ListChecks },
  { href: "/issues", label: "Issues", labelKey: "nav.issues", icon: TriangleAlert, badgeKey: "issues" },
  { href: "/analytics", label: "Analytics", labelKey: "nav.analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", labelKey: "nav.settings", icon: Settings }
];

export const environmentNavItems = [
  { environment: "Production", href: "/deployments?environment=Production" },
  { environment: "Staging", href: "/deployments?environment=Staging" },
  { environment: "Development", href: "/deployments?environment=Development" },
  { environment: "Custom", href: "/deployments?environment=Custom" }
] as const;

export const brandIcon = Activity;