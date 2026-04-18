import type { ReactNode } from "react";

interface Props {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  /** Visual accent */
  tone?: "default" | "primary" | "magic" | "danger" | "success";
  className?: string;
}

const TONE_BORDER: Record<NonNullable<Props["tone"]>, string> = {
  default: "border-stone-800",
  primary: "border-parchment-700/40",
  magic: "border-ink-700/40",
  danger: "border-red-900/50",
  success: "border-emerald-800/50",
};

const TONE_TEXT: Record<NonNullable<Props["tone"]>, string> = {
  default: "text-stone-100",
  primary: "text-parchment-200",
  magic: "text-ink-200",
  danger: "text-red-200",
  success: "text-emerald-200",
};

export function StatCard({ label, value, hint, icon, tone = "default", className = "" }: Props) {
  return (
    <div
      className={`group flex flex-col items-center justify-center rounded-xl border ${TONE_BORDER[tone]} bg-gradient-to-b from-stone-900 to-stone-950 p-3 text-center shadow-elevated transition-colors hover:border-parchment-700/60 ${className}`}
    >
      <div className="mb-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">
        {icon && <span className="text-stone-500">{icon}</span>}
        {label}
      </div>
      <div className={`font-display text-2xl leading-none ${TONE_TEXT[tone]}`}>
        {value}
      </div>
      {hint && <div className="mt-1 text-[10px] text-stone-500">{hint}</div>}
    </div>
  );
}
