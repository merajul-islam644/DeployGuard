import { Clock, Mail, RefreshCw, ShieldCheck, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { ActionButton } from "../../shared/ui/ActionButton";
import { ChipList } from "../../shared/ui/Chip";
import { PageHeader } from "../../shared/ui/PageHeader";
import { Skeleton } from "../../shared/ui/Skeleton";
import { StatusPill } from "../../shared/ui/StatusPill";
import { useCurrentUser, userDisplayName, userInitials } from "./useCurrentUser";

export function ProfilePage() {
  const me = useCurrentUser();
  const { t } = useT();
  const profile = me.data?.data;
  const name = userDisplayName(profile);

  return (
    <section>
      <PageHeader
        title={t("profile.title")}
        subtitle={t("profile.subtitle")}
        actions={<ActionButton variant="icon" onClick={() => me.refetch()} title="Refresh profile" icon={<RefreshCw size={18} />} />}
      />

      {me.isLoading ? (
        <div className="profile-card">
          <Skeleton className="skeleton-avatar-lg" />
          <div className="profile-heading">
            <Skeleton className="skeleton-line-lg" />
            <Skeleton className="skeleton-line" />
          </div>
        </div>
      ) : (
        <div className="profile-card">
          <span className="avatar avatar-lg">{userInitials(profile)}</span>
          <div className="profile-heading">
            <h3>{name || (me.isError ? "Session unavailable" : "Unknown user")}</h3>
            {profile?.email ? <span className="muted"><Mail size={14} /> {profile.email}</span> : null}
            <StatusPill tone={me.isSuccess ? "good" : "warn"}>
              {me.isSuccess ? "Signed in" : "Session unavailable"}
            </StatusPill>
          </div>
        </div>
      )}

      <div className="grid">
        <DetailCard icon={<UserRound size={16} />} label="Name" loading={me.isLoading} value={name} />
        <DetailCard icon={<Mail size={16} />} label="Email" loading={me.isLoading} value={profile?.email} />
        <DetailCard icon={<Clock size={16} />} label="Last sign-in" loading={me.isLoading} value={stringValue(profile?.lastSignIn)} />
      </div>

      <div className="panel">
        <div className="panel-title"><ShieldCheck size={16} /><span>Roles</span></div>
        {me.isLoading ? <Skeleton className="skeleton-line" /> : <ChipList empty="No roles assigned" items={profile?.roles} />}
      </div>
    </section>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function stringValue(value: unknown): string | undefined {
  if (typeof value !== "string" || !value) return undefined;
  return formatDate(value);
}

function DetailCard({ icon, label, loading, value }: { icon: ReactNode; label: string; loading?: boolean; value?: string }) {
  return (
    <div className="panel">
      <div className="panel-title">{icon}<span>{label}</span></div>
      {loading ? <Skeleton className="skeleton-line" /> : <strong className="mono">{value || "Not available"}</strong>}
    </div>
  );
}