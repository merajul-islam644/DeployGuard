import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { CHECK_DEFINITIONS } from "./checks";
import type { CheckKey } from "./checks";
import { ENVIRONMENTS } from "./environments";
import type { Environment } from "./environments";
import type { Deployment } from "./deploymentsApi";
import { enabledChecks } from "./deploymentsApi";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { environmentLabel } from "../../lib/i18n/labels";
import { Modal } from "../../shared/ui/Modal";

export type DeploymentFormValues = { checks: CheckKey[]; environment: Environment; name: string; url: string };

const URL_PATTERN = /^https?:\/\/.+/i;

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
  const { t } = useT();

  useEffect(() => {
    if (error) setLocalError(error);
  }, [error]);

  function toggleCheck(key: CheckKey) {
    setChecks((current) => (current.includes(key) ? current.filter((entry) => entry !== key) : [...current, key]));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !URL_PATTERN.test(url.trim())) {
      setLocalError(t("deployments.invalidNameUrl", "Enter a name and a URL that starts with http:// or https://."));
      return;
    }
    setLocalError("");
    onSubmit({ checks, environment, name: name.trim(), url: url.trim() });
  }

  return (
    <Modal title={deployment ? t("deployments.editTitle", "Edit deployment") : t("deployments.addTitle", "Add deployment")} onClose={onClose}>
      <form className="deployment-form" onSubmit={submit}>
        <label className="form-field">
          <span>{t("deployments.nameLabel", "Name")}</span>
          <input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder={t("deployments.namePlaceholder", "Production")} />
        </label>
        <label className="form-field">
          <span>{t("deployments.environmentLabel", "Environment")}</span>
          <select value={environment} onChange={(event) => setEnvironment(event.target.value as Environment)}>
            {ENVIRONMENTS.map((option) => <option key={option} value={option}>{environmentLabel(t, option)}</option>)}
          </select>
        </label>
        <label className="form-field">
          <span>{t("deployments.urlLabel", "URL")}</span>
          <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder={t("deployments.urlPlaceholder", "https://myapp.com")} />
        </label>
        <fieldset className="checks-fieldset">
          <legend>{t("deployments.checksLabel", "Checks")}</legend>
          <div className="checks-grid">
            {CHECK_DEFINITIONS.map((check) => (
              <label className="check-option" key={check.key}>
                <input type="checkbox" checked={checks.includes(check.key)} onChange={() => toggleCheck(check.key)} />
                <span>{t(`checks.${check.key}`, check.label)}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {localError ? <p className="form-error" role="alert">{localError}</p> : null}
        <div className="modal-actions">
          <button type="button" className="icon-button" onClick={onClose}>{t("common.cancel", "Cancel")}</button>
          <button type="submit" className="primary-button" disabled={submitting}>{submitting ? t("deployments.saving", "Saving...") : deployment ? t("deployments.saveChanges", "Save Changes") : t("deployments.saveDeployment", "Save Deployment")}</button>
        </div>
      </form>
    </Modal>
  );
}

function toEnvironment(value?: string): Environment {
  return (ENVIRONMENTS as readonly string[]).includes(value ?? "") ? (value as Environment) : "Production";
}