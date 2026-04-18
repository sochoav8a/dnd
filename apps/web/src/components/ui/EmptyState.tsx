import type { ReactNode } from "react";

interface Props {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="card-ghost flex flex-col items-center justify-center py-16 text-center">
      {icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-stone-700 bg-stone-900 text-parchment-400 shadow-inset">
          {icon}
        </div>
      )}
      <h2 className="mb-1 font-display text-lg text-stone-200">{title}</h2>
      {description && (
        <p className="mb-5 max-w-sm text-sm text-stone-500">{description}</p>
      )}
      {action}
    </div>
  );
}
