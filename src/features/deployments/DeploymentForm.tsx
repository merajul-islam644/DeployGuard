import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { CHECK_DEFINITIONS } from "./checks";
import type { CheckKey } from "./checks";
import { ENVIRONMENTS } from "./environments";
import type { Environment } from "./environments";
import type { Deployment } from "./deploymentsApi";
import { enabledChecks } from "./deploymentsApi";
import { Modal } from "../../shared/ui/Modal";

export type DeploymentFormValues = { checks: CheckKey[]; environment: Environment; name: string; url: string };

const URL_PATTERN = /^https?:\/\/.+/i;
const NAME_URL_ERROR = "Enter a name and a URL that starts with http:// or https://.";

export function DeploymentForm({
  deployment,
  onClose,
  onSubmit,
  submitting,
  error
}: {
  deployment?: Deployment;
  error?: string;
  onClose: () => void;
  onSubmit: (values: DeploymentFormValues) => void;
  submitting: boolean;
}) {
  const [name, setName] = useState(deployment?.name ?? "");
  const [environment, setEnvironment] = useState<Environment>(toEnvironment(deployment?.environment));
  const [url, setUrl] = useState(deployment?.url ?? "");
  const [checks, setChecks] = useState<CheckKey[]>(deployment ? enabledChecks(deployment) : CHECK_DEFINITIONS.map((check) => check.key));
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (error) setLocalError(error);
  }, [error]);

  function toggleCheck(key: CheckKey) {
    setChecks((current) => (current.includes(key) ? current.filter((entry) => entry !== key) : [...current, key]));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !URL_PATTERN.test(url.trim())) {
      setLocalError(NAME_URL_ERROR);
      return;
    }
    setLocalError("");
    onSubmit({ checks, environment, name: name.trim(), url: url.trim() });
  }

  return (
    <Modal title={deployment ? "Edit deployment" : "Add deployment"} onClose={onClose}>
      <form className="deployment-form" onSubmit={submit}>
        <label className="form-field">
          <span>Name</span>
          <input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Production" />
        </label>
        <label className="form-field">
          <span>Environment</span>
          <select value={environment} onChange={(event) => setEnvironment(event.target.value as Environment)}>
            {ENVIRONMENTS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <label className="form-field">
          <span>URL</span>
          <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://myapp.com" />
        </label>
        <fieldset className="checks-fieldset">
          <legend>Checks</legend>
          <div className="checks-grid">
            {CHECK_DEFINITIONS.map((check) => (
              <label className="check-option" key={check.key}>
                <input type="checkbox" checked={checks.includes(check.key)} onChange={() => toggleCheck(check.key)} />
                <span>{check.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {localError ? <p className="form-error" role="alert">{localError}</p> : null}
        <div className="modal-actions">
          <button type="button" className="icon-button" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary-button" disabled={submitting}>{submitting ? "Saving..." : deployment ? "Save Changes" : "Save Deployment"}</button>
        </div>
      </form>
    </Modal>
  );
}

function toEnvironment(value?: string): Environment {
  return (ENVIRONMENTS as readonly string[]).includes(value ?? "") ? (value as Environment) : "Production";
}