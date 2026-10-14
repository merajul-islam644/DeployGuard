import { LayoutGrid, PanelLeft, Search } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { brandIcon, environmentNavItems, navItems } from "./navItems";
import { NotificationsMenu } from "./NotificationsMenu";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { useIssueCount } from "../../features/issues/issuesApi";

const COLLAPSED_KEY = "deployguard:sidebar-collapsed";
const MOBILE_QUERY = "(max-width: 880px)";

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = () => setIsMobile(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}

export function AppShell({
  activePath,
  activeSearch,
  children,
  onNavigate
}: {
  activePath: string;
  activeSearch: string;
  children: ReactNode;
  onNavigate: (path: string) => void;
}) {
  const isMobile = useIsMobile();
  const [collapsedPref, setCollapsedPref] = useState(() => localStorage.getItem(COLLAPSED_KEY) === "true");
  const { t } = useT();
  const openIssues = useIssueCount();

  const collapsed = collapsedPref || isMobile;
  const currentEnvironment = new URLSearchParams(activeSearch).get("environment");

  function go(href: string) {
    onNavigate(href);
  }

  return (
    <div className="shell">
      <aside className={collapsed ? "collapsed" : ""}>
        <div className="sidebar-header">
          {collapsed ? null : (
            <a className="brand" href="/" onClick={(event) => { event.preventDefault(); go("/"); }}>
              <span className="brand-mark"><LayoutGrid size={17} /></span>
              <span>DeployGuard</span>
            </a>
          )}
          <button
            className="icon-button sidebar-collapse-toggle"
            onClick={() => setCollapsedPref((value) => !value)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <PanelLeft size={16} />
          </button>
        </div>
        <nav>
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              active={activePath === item.href && !isEnvironmentView(item, currentEnvironment)}
              badge={item.badgeKey === "issues" ? openIssues : undefined}
              collapsed={collapsed}
              icon={<item.icon size={18} />}
              label={t(item.labelKey, item.label)}
              tooltip={item.label ?? t(item.labelKey)}
              onSelect={() => go(item.href)}
            />
          ))}
          {activePath.startsWith("/deployments") && !collapsed ? (
            <div className="nav-subitems">
              {environmentNavItems.map((entry) => (
                <button
                  key={entry.environment}
                  className={currentEnvironment === entry.environment ? "nav-subitem active" : "nav-subitem"}
                  onClick={() => go(entry.href)}
                >
                  {entry.environment}
                </button>
              ))}
            </div>
          ) : null}
        </nav>
        {collapsed ? null : (
          <p className="sidebar-tagline">Automated deployment verification for modern web apps.</p>
        )}
      </aside>
      <div className="content">
        <header className="topbar">
          <label className="topbar-search">
            <Search size={16} />
            <input
              type="search"
              placeholder="Search deployments..."
              aria-label="Search deployments"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  const value = (event.target as HTMLInputElement).value.trim();
                  go(value ? `/deployments?q=${encodeURIComponent(value)}` : "/deployments");
                }
              }}
            />
          </label>
          <div className="topbar-spacer" />
          <NotificationsMenu openIssues={openIssues} onNavigate={onNavigate} />
          <ThemeToggle />
          <UserMenu onNavigate={onNavigate} />
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}

function isEnvironmentView(item: { href: string }, environment: string | null): boolean {
  return item.href === "/deployments" && Boolean(environment);
}

function NavLink({
  active,
  badge,
  collapsed,
  icon,
  label,
  onSelect,
  tooltip
}: {
  active: boolean;
  badge?: number;
  collapsed: boolean;
  icon: ReactNode;
  label: string;
  onSelect: () => void;
  tooltip: string;
}) {
  return (
    <a
      href="#"
      data-tooltip={tooltip}
      className={active ? "active" : ""}
      onClick={(event) => {
        event.preventDefault();
        onSelect();
      }}
    >
      {icon}
      {collapsed ? null : (
        <span className="nav-label">
          {label}
          {badge ? <span className="nav-badge">{badge}</span> : null}
        </span>
      )}
    </a>
  );
}