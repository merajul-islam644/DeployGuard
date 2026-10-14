import type { Verification } from "../verifications/verificationsApi";

export function successRate(verifications: Verification[]): number {
  if (!verifications.length) return 0;
  const healthy = verifications.filter((verification) => verification.healthStatus === "Healthy").length;
  return Math.round((healthy / verifications.length) * 100);
}

export function dailyBuckets(verifications: Verification[], days = 7): { label: string; healthy: number; failed: number; total: number }[] {
  const buckets: { date: Date; label: string; healthy: number; failed: number; total: number }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    buckets.push({ date, healthy: 0, failed: 0, label: date.toLocaleDateString(undefined, { weekday: "short" }), total: 0 });
  }

  for (const verification of verifications) {
    if (!verification.startedAt) continue;
    const date = new Date(verification.startedAt);
    const day = new Date(date);
    day.setHours(0, 0, 0, 0);
    const bucket = buckets.find((entry) => entry.date.getTime() === day.getTime());
    if (!bucket) continue;
    bucket.total += 1;
    if (verification.healthStatus === "Healthy") bucket.healthy += 1;
    else bucket.failed += 1;
  }

  return buckets;
}

export function SuccessChart({ verifications, compact = false }: { verifications: Verification[]; compact?: boolean }) {
  const buckets = dailyBuckets(verifications);
  const max = Math.max(1, ...buckets.map((bucket) => bucket.total));
  const rate = successRate(verifications);

  return (
    <div className={compact ? "success-chart compact" : "success-chart"}>
      <div className="success-chart-rate">
        <strong>{verifications.length ? `${rate}%` : "\u2014"}</strong>
        {compact ? null : <span className="muted">Success rate, last 7 days</span>}
      </div>
      <div className="success-bars" role="img" aria-label={`Daily verifications over the last 7 days; success rate ${rate} percent`}>
        {buckets.map((bucket, index) => (
          <div className="success-bar-column" key={index}>
            <div className="success-bar-track">
              {bucket.healthy ? <div className="success-bar healthy" style={{ height: `${(bucket.healthy / max) * 100}%` }} /> : null}
              {bucket.failed ? <div className="success-bar failed" style={{ height: `${(bucket.failed / max) * 100}%` }} /> : null}
            </div>
            <span className="success-bar-label">{bucket.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}