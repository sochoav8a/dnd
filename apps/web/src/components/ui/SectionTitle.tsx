import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

/** Section title with optional ornate divider beneath and right-aligned action. */
export function SectionTitle({ children, action, icon, className = "" }: Props) {
  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      <h2 className="section-title flex items-center gap-2">
        {icon && <span className="text-parchment-500">{icon}</span>}
        {children}
      </h2>
      {action}
    </div>
  );
}
