"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { getGqlClient, LEAVE_CAMPAIGN_MUTATION, DELETE_CAMPAIGN_MUTATION } from "@/lib/graphql";

interface Props {
  campaignId: string;
  inviteCode: string | null;
  isDm: boolean;
}

export function CampaignActions({ campaignId, inviteCode, isDm }: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const token = (session as { apiToken?: string } | null)?.apiToken ?? "";
  const [copied, setCopied] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function copyInvite() {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  async function leave() {
    if (!confirm("¿Seguro que quieres salir de esta campaña?")) return;
    setLeaving(true);
    setError(null);
    try {
      await getGqlClient(token).request(LEAVE_CAMPAIGN_MUTATION, { campaignId });
      router.push("/campaigns");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al salir");
      setLeaving(false);
    }
  }

  async function destroyCampaign() {
    if (!confirm("¿Borrar la campaña completa? Se borrarán encuentros y membresías. Los personajes quedarán sin campaña pero no se eliminan.")) return;
    setDeleting(true);
    setError(null);
    try {
      await getGqlClient(token).request(DELETE_CAMPAIGN_MUTATION, { id: campaignId });
      router.push("/campaigns");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al borrar");
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {inviteCode && (
          <button
            type="button"
            onClick={copyInvite}
            className="group inline-flex items-center gap-2 rounded-lg border border-stone-700 bg-stone-900 px-3 py-1.5 text-xs transition-colors hover:border-parchment-700/60"
            title="Copiar código de invitación"
          >
            <span className="text-[10px] uppercase tracking-[0.14em] text-stone-500">
              Invitación
            </span>
            <span className="badge-neutral font-mono tracking-wider">
              {inviteCode}
            </span>
            <span className="text-[10px] font-medium text-parchment-400">
              {copied ? "Copiado ✓" : "Copiar"}
            </span>
          </button>
        )}
        {isDm && (
          <>
            <Link
              href="/dm/encounters"
              className="btn-secondary text-sm"
            >
              Encuentros
            </Link>
            <button
              type="button"
              onClick={destroyCampaign}
              disabled={deleting}
              className="btn-danger text-sm"
            >
              {deleting ? "Borrando…" : "Borrar"}
            </button>
          </>
        )}
        {!isDm && (
          <button
            type="button"
            onClick={leave}
            disabled={leaving}
            className="btn-danger text-sm"
          >
            {leaving ? "Saliendo…" : "Salir"}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
