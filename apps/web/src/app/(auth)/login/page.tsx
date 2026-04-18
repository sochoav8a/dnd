"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GameIcon } from "@/components/ui/GameIcon";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Email o contraseña incorrectos");
      } else {
        router.push("/characters");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md animate-slide-up">
      {/* Sigil / crest */}
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-parchment-700/70 bg-stone-950 text-parchment-300 shadow-glow">
          <div className="absolute inset-0 rounded-full bg-parchment-500/5 blur-md" />
          <GameIcon kind="raw" slug="wizard-staff" size={28} />
        </div>
        <p className="font-display text-[10px] uppercase tracking-[0.4em] text-parchment-500/80">
          Compendio arcano
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold uppercase tracking-[0.14em] text-parchment-100 text-balance">
          Bienvenido de vuelta
        </h1>
        <p className="mt-3 max-w-sm font-serif text-sm italic text-stone-400">
          El tomo se abre de nuevo para ti, aventurero.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card-hero space-y-5">
        {/* Decorative corner flourish */}
        <div className="divider-ornate -mt-1">
          <span className="font-display text-[10px] uppercase tracking-[0.28em] text-parchment-500/80">
            Identifícate
          </span>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-red-800/60 bg-red-950/50 px-3 py-2 text-sm text-red-200"
          >
            <span className="badge-danger mt-0.5 shrink-0">Error</span>
            <span>{error}</span>
          </div>
        )}

        <div>
          <label htmlFor="email" className="label mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="input"
            placeholder="tu@email.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="label mb-1.5">
            Palabra de paso
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="input"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-2.5 text-sm font-semibold uppercase tracking-[0.14em]"
        >
          {loading ? "Abriendo el portal…" : "Cruzar el umbral"}
        </button>

        <div className="divider" />

        <p className="text-center text-sm text-stone-400">
          ¿Aún no eres parte del círculo?{" "}
          <Link href="/register" className="link-subtle font-medium text-parchment-300">
            Crea tu pergamino
          </Link>
        </p>
      </form>

      <p className="mt-6 text-center font-serif text-[11px] italic text-stone-600">
        SRD 5.1 — pensado para mesa, dados físicos y humo de vela.
      </p>
    </div>
  );
}
