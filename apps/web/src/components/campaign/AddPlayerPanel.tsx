"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  getGqlClient,
  ADD_PLAYER_BY_EMAIL_MUTATION,
  CREATE_PLAYER_AND_ADD_MUTATION,
} from "@/lib/graphql";
import { GameIcon } from "@/components/ui/GameIcon";
import { SectionTitle } from "@/components/ui/SectionTitle";

interface Props {
  campaignId: string;
}

type Mode = "existing" | "new";

export function AddPlayerPanel({ campaignId }: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const token = (session as { apiToken?: string } | null)?.apiToken ?? "";

  const [mode, setMode] = useState<Mode>("existing");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function reset() {
    setEmail("");
    setUsername("");
    setPassword("");
  }

  async function addExisting(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await getGqlClient(token).request(ADD_PLAYER_BY_EMAIL_MUTATION, {
        input: { campaignId, email: email.trim() },
      });
      setSuccess(`Se añadió ${email.trim()} a la campaña.`);
      reset();
      router.refresh();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  async function createAndAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !username.trim() || password.length < 6) {
      setError("Completa todos los campos (contraseña ≥ 6).");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await getGqlClient(token).request(CREATE_PLAYER_AND_ADD_MUTATION, {
        input: {
          campaignId,
          email: email.trim(),
          username: username.trim(),
          password,
        },
      });
      setSuccess(
        `Cuenta creada para ${username.trim()} (${email.trim()}). Password: ${password}`,
      );
      reset();
      router.refresh();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  function randomPassword() {
    const chars = "abcdefghijkmnpqrstuvwxyz23456789";
    let out = "";
    for (let i = 0; i < 10; i++) {
      out += chars[Math.floor(Math.random() * chars.length)];
    }
    setPassword(out);
  }

  return (
    <section className="card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionTitle icon={<GameIcon kind="raw" slug="hood" size={16} />}>
          Agregar jugador
        </SectionTitle>
        <div className="inline-flex overflow-hidden rounded-lg border border-stone-800 bg-stone-950 text-xs">
          <button
            type="button"
            onClick={() => { setMode("existing"); setError(null); setSuccess(null); }}
            className={`px-3 py-1.5 font-medium transition-colors ${
              mode === "existing"
                ? "bg-parchment-600/20 text-parchment-200"
                : "text-stone-500 hover:text-stone-300"
            }`}
          >
            Por email
          </button>
          <button
            type="button"
            onClick={() => { setMode("new"); setError(null); setSuccess(null); }}
            className={`px-3 py-1.5 font-medium transition-colors ${
              mode === "new"
                ? "bg-parchment-600/20 text-parchment-200"
                : "text-stone-500 hover:text-stone-300"
            }`}
          >
            Crear cuenta
          </button>
        </div>
      </div>

      {mode === "existing" && (
        <form onSubmit={addExisting} className="card-compact space-y-3 border-parchment-800/30">
          <p className="font-serif text-xs italic text-stone-500">
            Añade un jugador existente introduciendo su email.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[220px] flex-1">
              <label className="label mb-1 block">Email del jugador</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jugador@correo.com"
                className="input h-9 w-full text-sm"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="btn-primary h-9 text-sm"
            >
              {loading ? "Añadiendo…" : "Añadir"}
            </button>
          </div>
        </form>
      )}

      {mode === "new" && (
        <form onSubmit={createAndAdd} className="card-compact space-y-3 border-parchment-800/30">
          <p className="font-serif text-xs italic text-stone-500">
            Crea una cuenta nueva y añádela a la campaña. Ideal para pruebas locales.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="label mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jugador@correo.com"
                className="input h-9 w-full text-sm"
                required
              />
            </div>
            <div>
              <label className="label mb-1 block">Usuario</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="santiago"
                className="input h-9 w-full text-sm"
                required
                minLength={2}
              />
            </div>
          </div>
          <div>
            <label className="label mb-1 block">Contraseña</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Al menos 6 caracteres"
                className="input h-9 flex-1 text-sm font-mono tracking-wider"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={randomPassword}
                title="Generar contraseña aleatoria"
                className="inline-flex h-9 items-center gap-1 rounded-md border border-stone-700 bg-stone-900 px-3 text-xs text-stone-300 transition-colors hover:border-parchment-700/60"
              >
                🎲 <span>Generar</span>
              </button>
            </div>
            <p className="mt-1 font-serif text-[10px] italic text-stone-600">
              Visible aquí para que puedas compartirla con el jugador.
            </p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary h-9 text-sm"
          >
            {loading ? "Creando…" : "Crear y añadir"}
          </button>
        </form>
      )}

      {error && (
        <p className="rounded-md border border-red-700 bg-red-900/40 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-md border border-emerald-700 bg-emerald-900/30 px-3 py-2 text-xs text-emerald-300">
          {success}
        </p>
      )}
    </section>
  );
}

function friendlyError(err: unknown): string {
  if (err instanceof Error) {
    // graphql-request wraps errors; peek at .response.errors[0].message if present
    const withResp = err as { response?: { errors?: Array<{ message: string }> } };
    const gqlMsg = withResp.response?.errors?.[0]?.message;
    if (gqlMsg) return gqlMsg;
    return err.message;
  }
  return "Error desconocido";
}
