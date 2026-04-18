"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { GameIcon } from "@/components/ui/GameIcon";

const navLinks = [
  { href: "/characters", label: "Personajes", icon: "rogue" },
  { href: "/campaigns", label: "Campañas", icon: "scroll-quill" },
  { href: "/bestiary", label: "Bestiario", icon: "animal-skull" },
  { href: "/dm/encounters", label: "Panel DM", icon: "crossed-swords" },
];

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const username = session?.user?.name ?? "Aventurero";
  const role = (session?.user as { role?: string } | undefined)?.role ?? "player";

  return (
    <nav className="sticky top-0 z-30 border-b border-stone-900/80 bg-stone-950/70 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/characters"
          className="group flex items-center gap-2 whitespace-nowrap"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-parchment-800/60 bg-gradient-to-br from-parchment-900 to-stone-950 text-parchment-400 shadow-inset transition-transform group-hover:scale-105">
            <GameIcon kind="raw" slug="wizard-staff" size={18} />
          </span>
          <span className="font-display text-base font-semibold uppercase tracking-[0.12em] text-parchment-300">
            Arcana
          </span>
        </Link>

        <div className="hidden items-center gap-1 sm:flex">
          {navLinks.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`group relative flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "text-parchment-300"
                    : "text-stone-400 hover:text-stone-100"
                }`}
              >
                <GameIcon
                  kind="raw"
                  slug={link.icon}
                  size={14}
                  className={active ? "text-parchment-400" : "text-stone-600 group-hover:text-stone-400"}
                />
                {link.label}
                {active && (
                  <span className="absolute inset-x-2 -bottom-[9px] h-[2px] rounded-t bg-gradient-to-r from-transparent via-parchment-500 to-transparent" />
                )}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden text-right text-xs leading-tight sm:block">
            <div className="text-stone-200">{username}</div>
            <div className="text-[10px] uppercase tracking-wide text-stone-500">
              {role === "admin" ? "Admin" : role === "dm" ? "DM" : "Jugador"}
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="btn-ghost py-1.5 text-xs"
            title="Cerrar sesión"
          >
            Salir
          </button>
        </div>
      </div>

      <div className="flex gap-0 border-t border-stone-900 sm:hidden">
        {navLinks.map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                active
                  ? "border-b border-parchment-500 text-parchment-300"
                  : "border-b border-transparent text-stone-500"
              }`}
            >
              <GameIcon kind="raw" slug={link.icon} size={16} />
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
