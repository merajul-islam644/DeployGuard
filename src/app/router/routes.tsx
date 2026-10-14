import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import { AppShell } from "../layout/AppShell";
import { RedirectIfAuthenticated, RequireAuth } from "./guards";
import { NavigationProvider } from "./navigation";
import { SearchProvider } from "./useSearchParams";
import { CallbackPage } from "../../features/auth/CallbackPage";
import { ErrorPage } from "../../features/auth/ErrorPage";
import { LoginPage } from "../../features/auth/LoginPage";
import { NotFoundPage } from "../../features/auth/NotFoundPage";
import { AnalyticsPage } from "../../features/analytics/AnalyticsPage";
import { DeploymentDetailPage } from "../../features/deployments/DeploymentDetailPage";
import { DeploymentsPage } from "../../features/deployments/DeploymentsPage";
import { IssuesPage } from "../../features/issues/IssuesPage";
import { OverviewPage } from "../../features/overview/OverviewPage";
import { ProfilePage } from "../../features/profile/ProfilePage";
import { SettingsPage } from "../../features/settings/SettingsPage";
import { VerificationReportPage } from "../../features/verifications/VerificationReportPage";
import { VerificationsPage } from "../../features/verifications/VerificationsPage";
import { VerifyPage } from "../../features/verifications/VerifyPage";

const staticRoutes: Record<string, ComponentType> = {
  "/": OverviewPage,
  "/deployments": DeploymentsPage,
  "/verifications": VerificationsPage,
  "/issues": IssuesPage,
  "/analytics": AnalyticsPage,
  "/settings": SettingsPage,
  "/profile": ProfilePage,
  "/error": ErrorPage
};

export type Route =
  | { name: "static"; path: string }
  | { name: "deployment-detail"; id: string }
  | { name: "verify"; id: string }
  | { name: "report"; id: string }
  | { name: "not-found" };

export function resolveRoute(pathname: string): Route {
  if (staticRoutes[pathname]) return { name: "static", path: pathname };

  const verify = /^\/deployments\/([^/]+)\/verify$/.exec(pathname);
  if (verify) return { name: "verify", id: decodeURIComponent(verify[1]!) };

  const detail = /^\/deployments\/([^/]+)$/.exec(pathname);
  if (detail) return { name: "deployment-detail", id: decodeURIComponent(detail[1]!) };

  const report = /^\/verifications\/([^/]+)$/.exec(pathname);
  if (report) return { name: "report", id: decodeURIComponent(report[1]!) };

  return { name: "not-found" };
}

export function AppRouter() {
  const [path, setPath] = useState(() => window.location.pathname);
  const [search, setSearch] = useState(() => window.location.search);

  useEffect(() => {
    const onPopState = () => {
      setPath(window.location.pathname);
      setSearch(window.location.search);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function navigate(nextPath: string) {
    const [nextPathname = "/", queryString = ""] = nextPath.split("?");
    window.history.pushState({}, "", nextPath);
    setPath(nextPathname);
    setSearch(queryString ? `?${queryString}` : "");
  }

  if (path === "/login/callback") {
    return <CallbackPage onNavigate={navigate} />;
  }

  if (path === "/login") {
    const returnTo = new URLSearchParams(search).get("returnTo") || undefined;
    return (
      <RedirectIfAuthenticated onNavigate={navigate}>
        <LoginPage returnTo={returnTo} />
      </RedirectIfAuthenticated>
    );
  }

  const route = resolveRoute(path);

  return (
    <RequireAuth currentPath={path} onNavigate={navigate}>
      <NavigationProvider value={navigate}>
        <SearchProvider value={search}>
          <AppShell activePath={path} activeSearch={search} onNavigate={navigate}>
            <RouteView route={route} />
          </AppShell>
        </SearchProvider>
      </NavigationProvider>
    </RequireAuth>
  );
}

function RouteView({ route }: { route: Route }) {
  if (route.name === "static") {
    const Page = staticRoutes[route.path]!;
    return <Page />;
  }
  if (route.name === "deployment-detail") return <DeploymentDetailPage deploymentId={route.id} />;
  if (route.name === "verify") return <VerifyPage deploymentId={route.id} />;
  if (route.name === "report") return <VerificationReportPage verificationId={route.id} />;
  return <NotFoundPage />;
}