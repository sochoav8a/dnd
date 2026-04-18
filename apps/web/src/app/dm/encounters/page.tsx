"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  getGqlClient,
  CAMPAIGNS_QUERY,
  ENCOUNTERS_QUERY,
  CREATE_ENCOUNTER_MUTATION,
} from "@/lib/graphql";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { GameIcon } from "@/components/ui/GameIcon";

interface Campaign {
  id: string;
  name: string;
  dm: { username: string };
}

interface Encounter {
  id: string;
  name: string;
  status: "prep" | "active" | "completed";
  round: number;
  participants: Array<{ id: string }>;
}

export default function EncountersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const token = (session as { apiToken?: string } | null)?.apiToken ?? "";

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    getGqlClient(token)
      .request<{ campaigns: Campaign[] }>(CAMPAIGNS_QUERY)
      .then((d) => {
        // Only show campaigns where user is DM
        const session_any = session as { user?: { name?: string } } | null;
        const username = session_any?.user?.name;
        const dmCampaigns = d.campaigns.filter((c) => c.dm.username === username);
        setCampaigns(dmCampaigns);
        if (dmCampaigns[0]) setSelectedCampaignId(dmCampaigns[0].id);
      })
      .catch(() => setError("Error al cargar campañas"));
  }, [token, session]);

  useEffect(() => {
    if (!token || !selectedCampaignId) return;
    setLoading(true);
    getGqlClient(token)
      .request<{ encounters: Encounter[] }>(ENCOUNTERS_QUERY, { campaignId: selectedCampaignId })
      .then((d) => setEncounters(d.encounters))
      .catch(() => setError("Error al cargar encuentros"))
      .finally(() => setLoading(false));
  }, [token, selectedCampaignId]);

  async function createEncounter() {
    if (!newName.trim() || !selectedCampaignId) return;
    setCreating(true);
    try {
      const data = await getGqlClient(token).request<{ createEncounter: { id: string } }>(
        CREATE_ENCOUNTER_MUTATION,
        { input: { campaignId: selectedCampaignId, name: newName.trim() } },
      );
      router.push(`/dm/encounters/${data.createEncounter.id}`);
    } catch {
      setError("Error al crear el encuentro");
      setCreating(false);
    }
  }

  const statusLabel: Record<string, string> = {
    prep: "Preparación",
    active: "Activo",
    completed: "Completado",
  };
  const statusBadgeClass: Record<string, string> = {
    prep: "badge-neutral",
    active: "badge-success animate-pulse-soft",
    completed: "badge-neutral opacity-60",
  };
  const statusIconSlug: Record<string, string> = {
    prep: "hourglass",
    active: "crossed-swords",
    completed: "divert",
  };

  const activeCount = encounters.filter((e) => e.status === "active").length;
  const prepCount = encounters.filter((e) => e.status === "prep").length;
  const subtitle = loading
    ? "Cargando encuentros…"
    : encounters.length === 0
      ? "Sin encuentros todavía"
      : `${encounters.length} encuentro${encounters.length !== 1 ? "s" : ""} · ${activeCount} activo${activeCount !== 1 ? "s" : ""} · ${prepCount} en preparación`;

  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-fade-in">
      <PageHeader
        variant="hero"
        icon={<GameIcon kind="raw" slug="crossed-swords" size={26} />}
        title="Encuentros"
        subtitle={subtitle}
      />

      {error && (
        <div className="rounded-md border border-red-700 bg-red-900/50 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {campaigns.length === 0 ? (
        <EmptyState
          icon={<GameIcon kind="raw" slug="crossed-swords" size={28} />}
          title="No tenés campañas como DM"
          description="Creá o unite a una campaña como Dungeon Master para empezar a preparar encuentros."
        />
      ) : (
        <>
          {/* Campaign selector + new encounter row */}
          <div className="card space-y-3 p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-0 flex-1">
                <label className="label mb-1 block">Campaña</label>
                <select
                  value={selectedCampaignId}
                  onChange={(e) => setSelectedCampaignId(e.target.value)}
                  className="input h-10 w-full"
                >
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex min-w-[260px] flex-1 items-end gap-2">
                <div className="flex-1">
                  <label className="label mb-1 block">Nuevo encuentro</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Emboscada en el bosque…"
                    className="input h-10 w-full"
                    onKeyDown={(e) => e.key === "Enter" && createEncounter()}
                  />
                </div>
                <button
                  onClick={createEncounter}
                  disabled={creating || !newName.trim()}
                  className="btn-primary h-10 whitespace-nowrap"
                >
                  {creating ? "Creando…" : "+ Nuevo encuentro"}
                </button>
              </div>
            </div>
          </div>

          {/* Encounter grid */}
          {loading ? (
            <div className="py-12 text-center text-sm text-stone-500">Cargando…</div>
          ) : encounters.length === 0 ? (
            <EmptyState
              icon={<GameIcon kind="raw" slug="hourglass" size={28} />}
              title="Sin encuentros"
              description="Todavía no creaste un encuentro para esta campaña. Empezá por arriba."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {encounters.map((enc) => {
                const campaign = campaigns.find((c) => c.id === selectedCampaignId);
                const badgeClass = statusBadgeClass[enc.status] ?? "badge-neutral";
                const iconSlug = statusIconSlug[enc.status] ?? "crossed-swords";
                const isActive = enc.status === "active";
                return (
                  <button
                    key={enc.id}
                    onClick={() => router.push(`/dm/encounters/${enc.id}`)}
                    className={`card group w-full text-left transition-all hover:-translate-y-0.5 hover:border-parchment-700/60 ${
                      isActive ? "border-parchment-700/60 shadow-glow" : ""
                    }`}
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 truncate text-[11px] uppercase tracking-wider text-stone-500">
                          {campaign?.name ?? "—"}
                        </div>
                        <h3 className="font-display text-lg font-semibold text-stone-100 group-hover:text-parchment-200">
                          {enc.name}
                        </h3>
                      </div>
                      <span className={badgeClass}>
                        <GameIcon kind="raw" slug={iconSlug} size={10} />
                        {statusLabel[enc.status]}
                      </span>
                    </div>
                    <div className="divider mb-3" />
                    <div className="flex items-center justify-between text-xs text-stone-400">
                      <span className="flex items-center gap-1.5">
                        <GameIcon kind="raw" slug="hourglass" size={12} className="text-stone-500" />
                        {isActive ? `Ronda ${enc.round}` : enc.status === "completed" ? "Finalizado" : "Sin iniciar"}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <GameIcon kind="raw" slug="crossed-swords" size={12} className="text-stone-500" />
                        {enc.participants.length} participante{enc.participants.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
