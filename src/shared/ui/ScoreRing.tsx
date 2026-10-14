import { useEffect, useState } from "react";
import { scoreTone } from "./format";

// The score ring animates to its number on mount; reduced-motion is handled
// by the global animation-duration reset in styles.css.
export function ScoreRing({ score, size = 180 }: { score: number; size?: number }) {
  const [display, setDisplay] = useState(0);
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const target = Math.max(0, Math.min(100, score));

  useEffect(() => {
    let frame = 0;
    const startedAt = performance.now();
    const duration = 900;
    function tick(now: number) {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  const offset = circumference - (display / 100) * circumference;

  return (
    <div className="score-ring" style={{ height: size, width: size }} role="img" aria-label={`Health score ${target} out of 100`}>
      <svg height={size} width={size}>
        <circle className="score-ring-track" cx={size / 2} cy={size / 2} fill="none" r={radius} strokeWidth={stroke} />
        <circle
          className="score-ring-value"
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          stroke={scoreTone(target)}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          strokeWidth={stroke}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="score-ring-label">
        <strong style={{ color: scoreTone(target) }}>{target}</strong>
        <span className="muted">/100</span>
      </div>
    </div>
  );
}