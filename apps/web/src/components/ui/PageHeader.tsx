import Link from "next/link";
import type { ReactNode } from "react";

interface Breadcrumb {
  href: string;
  label: string;
}

interface Props {
  title: string;
  subtitle?: string | ReactNode;
  breadcrumbs?: Breadcrumb[];
  actions?: ReactNode;
  icon?: ReactNode;
  /** Adds a parchment glow and ornament styling. Use for the main page header. */
  variant?: "default" | "hero";
}

export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
  icon,
  variant = "default",
}: Props) {
  const isHero = variant === "hero";
  return (
    <header className={isHero ? "card-hero" : "mb-6"}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-2 flex items-center gap-1.5 text-[11px] text-stone-500">
          {breadcrumbs.map((b, i) => (
            <span key={b.href} className="flex items-center gap-1.5">
              <Link
                href={b.href}
                className="transition-colors hover:text-parchment-300"
              >
                {b.label}
              </Link>
              {i < breadcrumbs.length - 1 && (
                <span className="text-stone-700">›</span>
              )}
            </span>
          ))}
        </nav>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          {icon && (
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-parchment-800/50 bg-stone-900 text-parchment-400 shadow-inset">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h1
              className={`font-display text-balance font-semibold text-stone-100 ${
                isHero ? "text-3xl sm:text-4xl" : "text-2xl"
              }`}
            >
              {title}
            </h1>
            {subtitle && (
              <div className="mt-1 text-sm text-stone-400">{subtitle}</div>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
    </header>
  );
}
