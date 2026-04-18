interface Props {
  current: number;
  max: number;
  temp?: number;
  /** "sm" for compact rows, "md" default */
  size?: "sm" | "md";
  label?: boolean;
  className?: string;
}

function hpColor(pct: number, current: number): string {
  if (current <= 0) return "bg-hp-down";
  if (pct > 75) return "bg-hp-full";
  if (pct > 50) return "bg-hp-healthy";
  if (pct > 25) return "bg-hp-wounded";
  if (pct > 10) return "bg-hp-bloodied";
  return "bg-hp-critical";
}

export function HpBar({ current, max, temp = 0, size = "md", label = false, className = "" }: Props) {
  const pct = max > 0 ? Math.min(100, (current / max) * 100) : 0;
  const color = hpColor(pct, current);
  const height = size === "sm" ? "h-1.5" : "h-2.5";
  const dead = current <= 0;

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="mb-1 flex items-baseline justify-between text-[11px]">
          <span className={dead ? "text-hp-critical" : "text-stone-400"}>
            {dead ? "Caído" : "HP"}
          </span>
          <span className="font-mono text-stone-200">
            {current}
            <span className="text-stone-500">/{max}</span>
            {temp > 0 && (
              <span className="ml-1 text-blue-300">+{temp}</span>
            )}
          </span>
        </div>
      )}
      <div className={`${height} relative w-full overflow-hidden rounded-full bg-stone-800 shadow-inset`}>
        <div
          className={`${height} ${color} transition-all duration-500 ease-out`}
          style={{ width: `${pct}%` }}
        />
        {temp > 0 && (
          <div
            className={`${height} absolute top-0 left-0 rounded-full bg-blue-400/30 ring-1 ring-blue-400/60`}
            style={{ width: `${Math.min(100, ((current + temp) / max) * 100)}%` }}
          />
        )}
      </div>
    </div>
  );
}
