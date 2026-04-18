"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { getGqlClient, JOIN_CAMPAIGN_MUTATION } from "@/lib/graphql";

export default function JoinCampaignPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const token = (session as { apiToken?: string } | null)?.apiToken ?? "";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await getGqlClient(token).request(JOIN_CAMPAIGN_MUTATION, {
        inviteCode: code.trim().toUpperCase(),
      });
      router.push("/campaigns");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Código inválido o campaña no encontrada");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6">
        <Link href="/campaigns" className="text-sm text-stone-500 hover:text-stone-300">
          ← Volver a campañas
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-stone-100">Unirse a campaña</h1>
        <p className="text-stone-400 text-sm">Ingresá el código de invitación que te dio tu DM.</p>
      </div>

      <div className="card space-y-5">
        {error && (
          <div className="rounded-md border border-red-700 bg-red-900/50 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div>
          <label className="label mb-1 block">Código de invitación</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="input w-full font-mono text-lg tracking-widest text-center"
            placeholder="AB12CD34"
            maxLength={8}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          />
          <p className="mt-1 text-xs text-stone-600">8 caracteres, mayúsculas y números</p>
        </div>

        <div className="flex gap-3">
          <Link href="/campaigns" className="btn-secondary flex-1 text-center">
            Cancelar
          </Link>
          <button
            onClick={handleJoin}
            disabled={loading || code.trim().length < 4}
            className="btn-primary flex-1"
          >
            {loading ? "Uniéndose..." : "Unirse"}
          </button>
        </div>
      </div>
    </div>
  );
}
