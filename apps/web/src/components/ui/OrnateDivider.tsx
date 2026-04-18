interface Props {
  className?: string;
  /** Optional center ornament (defaults to a diamond). */
  ornament?: "diamond" | "fleur" | "none";
}

export function OrnateDivider({ className = "", ornament = "diamond" }: Props) {
  return (
    <div
      className={`flex items-center gap-3 text-parchment-800/70 ${className}`}
    >
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-parchment-800/60 to-transparent" />
      {ornament !== "none" && (
        <span className="flex items-center justify-center">
          {ornament === "diamond" ? (
            <svg width="10" height="10" viewBox="0 0 10 10" className="opacity-70">
              <path d="M5 0l5 5-5 5-5-5z" fill="currentColor" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" className="opacity-70">
              <path
                d="M12 2c1 4 4 5 7 5-2 2-4 5-4 8-2-2-5-3-8-3 2-2 4-5 5-10z"
                fill="currentColor"
              />
            </svg>
          )}
        </span>
      )}
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-parchment-800/60 to-transparent" />
    </div>
  );
}
