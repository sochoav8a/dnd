"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { getGqlClient, REMOVE_PLAYER_FROM_CAMPAIGN_MUTATION } from "@/lib/graphql";

interface Props {
  campaignId: string;
  userId: string;
  username: string;
}

export function RemovePlayerButton({ campaignId, userId, username }: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const token = (session as { apiToken?: string } | null)?.apiToken ?? "";
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!confirm(`¿Quitar a ${username} de la campaña? Sus personajes quedarán sin campaña asignada.`)) return;
    setLoading(true);
    try {
      await getGqlClient(token).request(REMOVE_PLAYER_FROM_CAMPAIGN_MUTATION, {
        input: { campaignId, userId },
      });
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al quitar jugador");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      title={`Quitar a ${username}`}
      className="rounded-md border border-stone-800 bg-stone-900 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-stone-500 transition-colors hover:border-red-700/60 hover:bg-red-900/20 hover:text-red-300 disabled:opacity-50"
    >
      {loading ? "…" : "Quitar"}
    </button>
  );
}
