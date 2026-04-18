"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { getGqlClient, CREATE_CAMPAIGN_MUTATION } from "@/lib/graphql";

export default function NewCampaignPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const token = (session as { apiToken?: string } | null)?.apiToken ?? "";

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getGqlClient(token).request<{
        createCampaign: { id: string; inviteCode: string };
      }>(CREATE_CAMPAIGN_MUTATION, { input: { name: name.trim() } });
      router.push(`/campaigns`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear la campaña");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6">
        <Link href="/campaigns" className="text-sm text-stone-500 hover:text-stone-300">
          ← Volver a campañas
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-stone-100">Nueva campaña</h1>
        <p className="text-stone-400 text-sm">Creá una campaña y compartí el código de invitación con tus jugadores.</p>
      </div>

      <div className="card space-y-5">
        {error && (
          <div className="rounded-md border border-red-700 bg-red-900/50 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div>
          <label className="label mb-1 block">Nombre de la campaña</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input w-full"
            placeholder="La Maldición de Strahd..."
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
        </div>

        <div className="flex gap-3">
          <Link href="/campaigns" className="btn-secondary flex-1 text-center">
            Cancelar
          </Link>
          <button
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            className="btn-primary flex-1"
          >
            {loading ? "Creando..." : "Crear campaña"}
          </button>
        </div>
      </div>
    </div>
  );
}
