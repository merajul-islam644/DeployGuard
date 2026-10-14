import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { roleLabel, personName, listPeople, invitePerson, setPersonRole, setPersonActive } from "./peopleApi";
import type { Person } from "./peopleApi";
import { useChangeRecords, recordChange } from "./changesApi";
import { useIsAdmin } from "../access/useIsAdmin";
import { useCurrentUser, userDisplayName } from "../profile/useCurrentUser";
import { useTheme } from "../../app/layout/ThemeToggle";
import { formatDateTime } from "../../shared/ui/format";
import { PageHeader } from "../../shared/ui/PageHeader";
import { Skeleton } from "../../shared/ui/Skeleton";
import { StatusPill } from "../../shared/ui/StatusPill";
import { useToast } from "../../shared/ui/Toast";
import { Modal } from "../../shared/ui/Modal";

type Tab = "people" | "changes";

export function SettingsPage() {
  const isAdmin = useIsAdmin();
  const [tab, setTab] = useState<Tab>("people");

  return (
    <section>
      <PageHeader
        title="Settings"
        subtitle={isAdmin ? "Manage who can use DeployGuard and review every change." : "The people who use DeployGuard. Only an admin can change this."}
      />
      <div className="tabs">
        <button className={tab === "people" ? "tab active" : "tab"} onClick={() => setTab("people")}>Users and roles</button>
        {isAdmin ? <button className={tab === "changes" ? "tab active" : "tab"} onClick={() => setTab("changes")}>Change log</button> : null}
      </div>
      {tab === "people" ? <PeoplePanel isAdmin={isAdmin} /> : <ChangePanel />}
      <AppearancePanel />
    </section>
  );
}

function PeoplePanel({ isAdmin }: { isAdmin: boolean }) {
  const people = useQuery({ queryFn: () => listPeople(), queryKey: ["iam", "users"] });
  const queryClient = useQueryClient();
  const profile = useCurrentUser();
  const { notify } = useToast();
  const actor = userDisplayName(profile.data?.data) || profile.data?.data?.email || "A staff member";
  const [inviteOpen, setInviteOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | undefined>();

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["iam", "users"] });
  }

  async function changeRole(person: Person, role: "Admin" | "Engineer") {
    if (!person.itemId) return;
    setBusyId(person.itemId);
    try {
      await setPersonRole(person.itemId, role);
      notify("Role saved.", "success");
      void recordChange({ action: "Updated", after: `${personName(person)} \u00b7 ${role}`, before: `${personName(person)} \u00b7 ${roleLabel(person.roles)}`, changedBy: actor, entity: "Person", record: personName(person) });
      refresh();
    } catch (error) {
      notify((error as Error).message, "error");
    } finally {
      setBusyId(undefined);
    }
  }

  async function toggleActive(person: Person) {
    if (!person.itemId) return;
    setBusyId(person.itemId);
    try {
      const next = person.active === false;
      await setPersonActive(person.itemId, next);
      notify(next ? "Person reactivated." : "Person deactivated.", "success");
      void recordChange({ action: "Updated", after: `${personName(person)} \u00b7 ${next ? "Active" : "Inactive"}`, before: `${personName(person)} \u00b7 ${person.active === false ? "Inactive" : "Active"}`, changedBy: actor, entity: "Person", record: personName(person) });
      refresh();
    } catch (error) {
      notify((error as Error).message, "error");
    } finally {
      setBusyId(undefined);
    }
  }

  return (
    <div className="panel">
      <div className="panel-title">
        <Users size={16} />People
        {isAdmin ? (
          <button className="link-button panel-action" onClick={() => setInviteOpen(true)}>
            <Plus size={14} /> Invite
          </button>
        ) : null}
      </div>

      {people.isLoading ? (
        <Skeleton className="skeleton-line" />
      ) : people.isError ? (
        <p className="muted">Could not load the people list.</p>
      ) : (
        <div className="table-shell">
          <table>
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last sign-in</th>{isAdmin ? <th /> : null}</tr>
            </thead>
            <tbody>
              {(people.data ?? []).map((person) => (
                <tr key={person.itemId}>
                  <td>{personName(person)}</td>
                  <td className="mono">{person.email}</td>
                  <td>
                    {isAdmin ? (
                      <select value={roleLabel(person.roles)} disabled={busyId === person.itemId} onChange={(event) => void changeRole(person, event.target.value as "Admin" | "Engineer")}>
                        <option value="Admin">Admin</option>
                        <option value="Engineer">Engineer</option>
                      </select>
                    ) : (
                      roleLabel(person.roles)
                    )}
                  </td>
                  <td><StatusPill tone={person.active === false ? "neutral" : "good"} icon={false}>{person.active === false ? "Inactive" : "Active"}</StatusPill></td>
                  <td className="muted">{person.lastLoggedInTime ? formatDateTime(person.lastLoggedInTime) : "Never"}</td>
                  {isAdmin ? (
                    <td className="row-actions">
                      <button className="link-button" disabled={busyId === person.itemId} onClick={() => void toggleActive(person)}>
                        {person.active === false ? "Reactivate" : "Deactivate"}
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {inviteOpen ? (
        <InviteDialog
          onClose={() => setInviteOpen(false)}
          onInvited={(name, role) => {
            setInviteOpen(false);
            notify("Invitation sent.", "success");
            void recordChange({ action: "Added", after: `${name} \u00b7 ${role}`, changedBy: actor, entity: "Person", record: name });
            refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function InviteDialog({ onClose, onInvited }: { onClose: () => void; onInvited: (name: string, role: string) => void }) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<"Admin" | "Engineer">("Engineer");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!email.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    try {
      await invitePerson({ email: email.trim(), firstName: firstName.trim(), lastName: lastName.trim(), role });
      onInvited(`${firstName} ${lastName}`.trim() || email.trim(), role);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Invite a person" onClose={onClose}>
      <div className="deployment-form">
        <label className="form-field"><span>Email</span><input autoFocus value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" /></label>
        <label className="form-field"><span>First name</span><input value={firstName} onChange={(event) => setFirstName(event.target.value)} /></label>
        <label className="form-field"><span>Last name</span><input value={lastName} onChange={(event) => setLastName(event.target.value)} /></label>
        <label className="form-field">
          <span>Role</span>
          <select value={role} onChange={(event) => setRole(event.target.value as "Admin" | "Engineer")}>
            <option value="Admin">Admin</option>
            <option value="Engineer">Engineer</option>
          </select>
        </label>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className="modal-actions">
          <button className="icon-button" onClick={onClose}>Cancel</button>
          <button className="primary-button" disabled={busy} onClick={() => void submit()}>
            <UserPlus size={16} />{busy ? "Sending\u2026" : "Send invite"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ChangePanel() {
  const changes = useChangeRecords();
  return (
    <div className="panel">
      <div className="panel-title">Change log</div>
      {changes.isLoading ? (
        <Skeleton className="skeleton-line" />
      ) : changes.isError ? (
        <p className="muted">Could not load the change log.</p>
      ) : !changes.data?.length ? (
        <p className="muted">No changes recorded yet.</p>
      ) : (
        <div className="table-shell">
          <table>
            <thead>
              <tr><th>When</th><th>Who</th><th>Change</th><th>Before</th><th>After</th></tr>
            </thead>
            <tbody>
              {changes.data.map((entry) => (
                <tr key={entry.ItemId}>
                  <td className="muted">{formatDateTime(entry.changedAt)}</td>
                  <td>{entry.changedBy}</td>
                  <td>{entry.record} <span className="muted">{entry.action}</span></td>
                  <td className="muted">{entry.before || "\u2014"}</td>
                  <td>{entry.after || "\u2014"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AppearancePanel() {
  const { theme, toggle } = useTheme();
  return (
    <div className="panel">
      <div className="panel-title">Appearance</div>
      <div className="appearance-row">
        <span className="muted">Theme is dark first. Choose the appearance that suits you.</span>
        <button className="primary-button" onClick={toggle}>Switch to {theme === "dark" ? "light" : "dark"} appearance</button>
      </div>
    </div>
  );
}