import { AlertTriangle, CircleCheck, CircleX } from "lucide-react";
import type { PillTone } from "./format";

// Status is never colour alone: Healthy, Needs Attention and Failed each
// carry a word and an icon.
const ICONS: Record<PillTone, typeof CircleCheck | undefined> = {
  bad: CircleX,
  good: CircleCheck,
  neutral: undefined,
  warn: AlertTriangle
};

export function StatusPill({ tone, children, icon = true }: { tone: PillTone; children: string; icon?: boolean }) {
  const Icon = ICONS[tone];
  return (
    <span className={`pill pill-${tone}`}>
      {icon && Icon ? <Icon size={12} /> : null}
      {children}
    </span>
  );
}