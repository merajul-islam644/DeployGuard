import { Fragment, useMemo, useState } from "react";
import type { EvidenceRecord } from "./verificationsApi";
import { maskRow, maskSecrets } from "./mask";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { evidenceLabel } from "../../lib/i18n/labels";
import { formatDateTime } from "../../shared/ui/format";
import { Modal } from "../../shared/ui/Modal";

export function EvidenceViewer({ evidence, onClose }: { evidence: EvidenceRecord; onClose: () => void }) {
  const { language, t } = useT();
  const kind = evidence.kind ?? "Evidence";
  const kindName = evidenceLabel(t, kind);

  return (
    <Modal title={t("evidence.kind", "{kind} evidence", { kind: kindName })} onClose={onClose}>
      <div className="evidence-meta">
        <span className="mono">{evidence.url}</span>
        <span className="muted">{formatDateTime(evidence.capturedAt, language)} \u00b7 {evidence.viewport} \u00b7 {evidence.browser}</span>
      </div>
      {evidence.notCaptured ? (
        <p className="evidence-missing">{kind === "Trace" ? t("report.traceMissing", "Trace not captured for this run.") : t("report.notCapturedRun", "{kind} was not captured for this run.", { kind: kindName })}</p>
      ) : kind === "Network" ? (
        <NetworkViewer rows={evidence.rows ?? []} />
      ) : kind === "Console" ? (
        <ConsoleViewer rows={evidence.rows ?? []} />
      ) : kind === "Screenshot" ? (
        <ScreenshotViewer evidence={evidence} />
      ) : kind === "DOM" ? (
        <DomViewer rows={evidence.rows ?? []} />
      ) : kind === "Timeline" ? (
        <TimelineViewer rows={evidence.rows ?? []} />
      ) : (
        <p className="muted">{maskSecrets(evidence.capture ?? "No capture was recorded.")}</p>
      )}
    </Modal>
  );
}

const FILTERS = ["All", "Critical", "Warning", "Info"] as const;

type NetworkRow = { durationMs?: number; method?: string; status?: number; url?: string };

function NetworkViewer({ rows }: { rows: string[] }) {
  const { t } = useT();
  const [search, setSearch] = useState("");
  const [failedOnly, setFailedOnly] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const parsed = useMemo(() => rows.map(parseRow<NetworkRow>), [rows]);
  const visible = parsed.filter((row) => {
    if (failedOnly && !(row.status === 0 || (row.status ?? 0) >= 400)) return false;
    if (!search) return true;
    return maskSecrets(row.url ?? "").toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="evidence-viewer">
      <div className="viewer-toolbar">
        <input className="search-box-input" placeholder={t("evidence.searchRequests", "Search requests...")} value={search} onChange={(event) => setSearch(event.target.value)} />
        <label className="check-option">
          <input type="checkbox" checked={failedOnly} onChange={() => setFailedOnly((value) => !value)} />
          <span>{t("evidence.failedOnly", "Failed only")}</span>
        </label>
        <span className="muted">{t("evidence.showingCount", "{shown} of {total}", { shown: visible.length, total: parsed.length })}</span>
      </div>
      <div className="table-shell">
        <table>
          <thead>
            <tr><th>{t("evidence.method", "Method")}</th><th>{t("evidence.url", "URL")}</th><th>{t("evidence.status", "Status")}</th><th>{t("evidence.duration", "Duration")}</th></tr>
          </thead>
          <tbody>
            {visible.map((row, index) => (
              <Fragment key={index}>
                <tr onClick={() => setOpenIndex(openIndex === index ? null : index)} className="clickable">
                  <td className="mono">{row.method ?? "GET"}</td>
                  <td className="mono url-cell">{maskSecrets(row.url ?? "")}</td>
                  <td className={statusClass(row.status)}>{row.status ?? "\u2014"}</td>
                  <td className="mono">{t("evidence.durationMs", "{value} ms", { value: row.durationMs ?? 0 })}</td>
                </tr>
                {openIndex === index ? (
                  <tr>
                    <td colSpan={4}>
                      <dl className="details-list">
                        <div className="details-row"><dt>{t("evidence.method", "Method")}</dt><dd className="mono">{row.method ?? "GET"}</dd></div>
                        <div className="details-row"><dt>{t("evidence.url", "URL")}</dt><dd className="mono">{maskSecrets(row.url ?? "")}</dd></div>
                        <div className="details-row"><dt>{t("evidence.statusCode", "Status code")}</dt><dd className="mono">{row.status ?? "\u2014"}</dd></div>
                        <div className="details-row"><dt>{t("evidence.duration", "Duration")}</dt><dd className="mono">{t("evidence.durationMs", "{value} ms", { value: row.durationMs ?? 0 })}</dd></div>
                      </dl>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
        {!visible.length ? <p className="muted viewer-empty">{t("evidence.noRequests", "No requests match.")}</p> : null}
      </div>
    </div>
  );
}

type ConsoleRow = { at?: string; level?: string; message?: string };

function ConsoleViewer({ rows }: { rows: string[] }) {
  const { t } = useT();
  const [filter, setFilter] = useState<"All" | "Critical" | "Warning" | "Info">("All");
  const parsed = rows.map(parseRow<ConsoleRow>);
  const visible = parsed.filter((row) => filter === "All" || row.level === filter);
  const filterKeys: Record<(typeof FILTERS)[number], string> = {
    All: "evidence.all",
    Critical: "evidence.critical",
    Warning: "evidence.warning",
    Info: "evidence.info"
  };

  if (!parsed.length) {
    return <p className="evidence-missing">{t("evidence.consolePrivate", "Console output is private to the deployment's own origin and was not captured.")}</p>;
  }

  return (
    <div className="evidence-viewer">
      <div className="viewer-toolbar">
        {FILTERS.map((level) => (
          <button key={level} className={filter === level ? "chip active-chip" : "chip"} onClick={() => setFilter(level)}>{t(filterKeys[level], level)}</button>
        ))}
      </div>
      <pre className="console-log">
        {visible.map((row, index) => (
          <div key={index} className={`console-line console-${(row.level ?? "Info").toLowerCase()}`}>
            {row.at ? <span className="console-time">{row.at}</span> : null}
            <span className="console-level">{(row.level ?? "Info").toUpperCase()}</span>
            <span>{maskSecrets(row.message ?? "")}</span>
          </div>
        ))}
      </pre>
    </div>
  );
}

function ScreenshotViewer({ evidence }: { evidence: EvidenceRecord }) {
  const { language, t } = useT();
  return (
    <div className="screenshot-view">
      <div className="screenshot-frame">
        <div className="screenshot-placeholder">
          <span className="mono">{maskSecrets(evidence.url ?? "")}</span>
          <span>{t("evidence.workingCapture", "Working capture")}</span>
        </div>
      </div>
      <dl className="details-list">
        <div className="details-row"><dt>{t("evidence.captured", "Captured")}</dt><dd>{formatDateTime(evidence.capturedAt, language)}</dd></div>
        <div className="details-row"><dt>{t("evidence.url", "URL")}</dt><dd className="mono">{maskSecrets(evidence.url ?? "")}</dd></div>
        <div className="details-row"><dt>{t("evidence.viewport", "Viewport")}</dt><dd className="mono">{evidence.viewport}</dd></div>
        <div className="details-row"><dt>{t("evidence.browser", "Browser")}</dt><dd>{evidence.browser}</dd></div>
      </dl>
    </div>
  );
}

function DomViewer({ rows }: { rows: string[] }) {
  return (
    <pre className="code-view">
      {rows.map((row, index) => <div key={index}>{maskSecrets(row)}</div>)}
    </pre>
  );
}

type TimelineRow = { at?: number; event?: string; url?: string };

function TimelineViewer({ rows }: { rows: string[] }) {
  const parsed = rows.map(parseRow<TimelineRow>);
  return (
    <ol className="timeline">
      {parsed.map((row, index) => (
        <li key={index}>
          <span className="timeline-time mono">{row.at ?? 0} ms</span>
          <span className="timeline-dot" />
          <span className="timeline-event">{row.event ?? "event"}</span>
          {row.url ? <span className="timeline-url mono">{maskSecrets(row.url)}</span> : null}
        </li>
      ))}
    </ol>
  );
}

function parseRow<T>(row: string): T {
  try {
    return JSON.parse(maskRow(row)) as T;
  } catch {
    return {} as T;
  }
}

function statusClass(status?: number): string {
  if (!status || status >= 400) return "status-bad mono";
  if (status >= 300) return "status-warn mono";
  return "status-good mono";
}