import { GameIcon } from "@/components/ui/GameIcon";

/**
 * Auth layout — "arcane study / ancient tome" ambience.
 * Split-screen on md+ (form | ambient art), single column stacked on mobile.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
      {/* Background constellation of faint runic icons (decorative, non-interactive). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 select-none opacity-[0.06]"
      >
        <div className="absolute left-[6%] top-[12%] text-[6rem] text-parchment-300">
          <GameIcon kind="raw" slug="scroll-quill" size="1em" />
        </div>
        <div className="absolute right-[8%] top-[18%] rotate-12 text-[5rem] text-ink-300">
          <GameIcon kind="raw" slug="crystal-ball" size="1em" />
        </div>
        <div className="absolute bottom-[14%] left-[10%] -rotate-6 text-[5.5rem] text-parchment-300">
          <GameIcon kind="raw" slug="magic-gate" size="1em" />
        </div>
        <div className="absolute bottom-[8%] right-[12%] rotate-6 text-[6.5rem] text-parchment-300">
          <GameIcon kind="raw" slug="dragon-head" size="1em" />
        </div>
      </div>

      <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl grid-cols-1 gap-8 px-4 py-10 md:grid-cols-[1fr_1fr] md:items-center md:gap-12 md:px-8 md:py-16">
        {/* Left — form slot */}
        <div className="flex items-center justify-center">{children}</div>

        {/* Right — ambient flavor panel (decorative only, hidden on mobile) */}
        <aside
          aria-hidden
          className="relative hidden h-full min-h-[560px] overflow-hidden rounded-2xl border border-parchment-800/40 bg-gradient-to-br from-stone-900 via-stone-950 to-black shadow-scroll md:block"
        >
          {/* Radial glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(200,144,42,0.18),transparent_60%)]" />
          {/* Grain */}
          <div className="absolute inset-0 bg-grain" />

          {/* Central sigil */}
          <div className="relative flex h-full flex-col items-center justify-between px-10 py-14">
            <div className="text-center">
              <p className="font-display text-xs uppercase tracking-[0.4em] text-parchment-500/80">
                Compendio de
              </p>
              <h2 className="mt-3 font-display text-4xl font-semibold uppercase tracking-[0.12em] text-parchment-200 drop-shadow-[0_0_12px_rgba(221,168,74,0.25)]">
                Arcana
              </h2>
              <div className="divider-ornate mx-auto mt-5 w-48">
                <GameIcon kind="raw" slug="swords-emblem" size={14} />
              </div>
            </div>

            {/* Central glowing sigil */}
            <div className="relative flex items-center justify-center">
              <div className="absolute h-56 w-56 rounded-full bg-parchment-500/10 blur-3xl" />
              <div className="absolute h-40 w-40 rounded-full border border-parchment-700/40" />
              <div className="absolute h-28 w-28 rounded-full border border-parchment-700/30" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-parchment-700/60 bg-stone-950/80 text-parchment-300 shadow-glow animate-pulse-soft">
                <GameIcon kind="raw" slug="wizard-staff" size={36} />
              </div>
            </div>

            <blockquote className="max-w-xs text-center font-serif text-base italic leading-relaxed text-parchment-300/80">
              &ldquo;El tomo recuerda a cada aventurero que cruza su umbral.&rdquo;
              <footer className="mt-2 font-sans text-[10px] uppercase tracking-[0.2em] text-stone-500">
                — Grimorio del Archivista
              </footer>
            </blockquote>
          </div>
        </aside>
      </div>
    </div>
  );
}
