"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  getGqlClient,
  CONTENT_ITEMS_QUERY,
  QUICK_CREATE_CAMPAIGN_CHARACTER_MUTATION,
} from "@/lib/graphql";
import type { RaceData, SubraceData, ClassData } from "@dnd/shared";
import { GameIcon } from "@/components/ui/GameIcon";
import { SectionTitle } from "@/components/ui/SectionTitle";

interface Member {
  user: { id: string; username: string };
  role: string;
}

interface Props {
  campaignId: string;
  members: Member[];
}

interface Option {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  data: unknown;
}

export function QuickCreateCharacterPanel({ campaignId, members }: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const token = (session as { apiToken?: string } | null)?.apiToken ?? "";

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [ownerId, setOwnerId] = useState(members[0]?.user.id ?? "");
  const [raceId, setRaceId] = useState("");
  const [subraceId, setSubraceId] = useState<string>("");
  const [classId, setClassId] = useState("");
  const [backgroundId, setBackgroundId] = useState("");

  const [races, setRaces] = useState<Option[]>([]);
  const [subraces, setSubraces] = useState<Option[]>([]);
  const [classes, setClasses] = useState<Option[]>([]);
  const [backgrounds, setBackgrounds] = useState<Option[]>([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !token || races.length > 0) return;
    const client = getGqlClient(token);
    Promise.all([
      client.request<{ contentItems: Option[] }>(CONTENT_ITEMS_QUERY, { type: "race" }),
      client.request<{ contentItems: Option[] }>(CONTENT_ITEMS_QUERY, { type: "subrace" }),
      client.request<{ contentItems: Option[] }>(CONTENT_ITEMS_QUERY, { type: "class" }),
      client.request<{ contentItems: Option[] }>(CONTENT_ITEMS_QUERY, { type: "background" }),
    ])
      .then(([r, sr, c, b]) => {
        setRaces(r.contentItems);
        setSubraces(sr.contentItems);
        setClasses(c.contentItems);
        setBackgrounds(b.contentItems);
      })
      .catch(() => setError("Error al cargar contenido"));
  }, [open, token, races.length]);

  const selectedRace = races.find((r) => r.id === raceId);
  const selectedClass = classes.find((c) => c.id === classId);
  const subraceOptions = selectedRace
    ? subraces.filter(
        (s) => (s.data as SubraceData)?.parent_race === selectedRace.slug,
      )
    : [];

  function randomPick() {
    if (races.length === 0 || classes.length === 0 || backgrounds.length === 0) return;
    const r = races[Math.floor(Math.random() * races.length)];
    const c = classes[Math.floor(Math.random() * classes.length)];
    const b = backgrounds[Math.floor(Math.random() * backgrounds.length)];
    if (!r || !c || !b) return;
    setRaceId(r.id);
    setClassId(c.id);
    setBackgroundId(b.id);

    const subs = subraces.filter((s) => (s.data as SubraceData)?.parent_race === r.slug);
    const pickedSub = subs[Math.floor(Math.random() * subs.length)];
    setSubraceId(pickedSub?.id ?? "");

    if (!name.trim()) {
      setName(generateName());
    }
  }

  function generateName() {
    const first = ["Aric", "Beren", "Cora", "Dain", "Elda", "Finn", "Gwen", "Halric", "Ithil", "Jora", "Kael", "Liora", "Maeve", "Nym", "Orin", "Pael", "Quen", "Rhea", "Sorin", "Tavi", "Umbra", "Vale", "Wren", "Xan", "Yara", "Zaric"];
    const last = ["Aesir", "Blackwood", "Caelum", "Drayven", "Elmroot", "Frost", "Gilead", "Hallow", "Ironfoot", "Jademoor"];
    const f = first[Math.floor(Math.random() * first.length)];
    const l = last[Math.floor(Math.random() * last.length)];
    return `${f} ${l}`;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !ownerId || !raceId || !classId || !backgroundId) {
      setError("Completa nombre, propietario, raza, clase y trasfondo.");
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await getGqlClient(token).request(QUICK_CREATE_CAMPAIGN_CHARACTER_MUTATION, {
        input: {
          campaignId,
          ownerId,
          name: name.trim(),
          raceId,
          subraceId: subraceId || null,
          classId,
          backgroundId,
        },
      });
      setSuccess(`Personaje "${name.trim()}" creado.`);
      setName("");
      setRaceId("");
      setSubraceId("");
      setClassId("");
      setBackgroundId("");
      router.refresh();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionTitle icon={<GameIcon kind="raw" slug="swords-emblem" size={16} />}>
          Crear personaje rápido
          <span className="ml-2 font-serif text-[10px] font-normal normal-case italic tracking-normal text-stone-600">
            testing
          </span>
        </SectionTitle>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="text-xs text-parchment-400 transition-colors hover:text-parchment-300"
        >
          {open ? "Cerrar ↑" : "Abrir ↓"}
        </button>
      </div>

      {!open ? (
        <p className="font-serif text-xs italic text-stone-500">
          Crea PJs de prueba directamente. Array estándar automático según la clase, inventario vacío, nivel 1.
          Usa "Subir de nivel" en la hoja para ajustarlo.
        </p>
      ) : (
        <form onSubmit={submit} className="card-compact space-y-4 border-parchment-800/30">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label mb-1 block">Nombre</label>
              <div className="flex gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Aric Blackwood"
                  className="input h-9 flex-1 text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setName(generateName())}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-stone-700 bg-stone-900 text-stone-400 transition-colors hover:border-parchment-700/60"
                  title="Generar nombre"
                >
                  🎲
                </button>
              </div>
            </div>
            <div>
              <label className="label mb-1 block">Propietario</label>
              <select
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                className="input h-9 w-full text-sm"
                required
              >
                {members.map((m) => (
                  <option key={m.user.id} value={m.user.id}>
                    {m.user.username} {m.role === "dm" ? "(DM)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label mb-1 flex items-center gap-1">
                <GameIcon kind="raw" slug="hood" size={11} className="text-stone-500" />
                Raza
              </label>
              <select
                value={raceId}
                onChange={(e) => { setRaceId(e.target.value); setSubraceId(""); }}
                className="input h-9 w-full text-sm"
                required
              >
                <option value="">—</option>
                {races.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            {subraceOptions.length > 0 && (
              <div>
                <label className="label mb-1 block">Sub-raza</label>
                <select
                  value={subraceId}
                  onChange={(e) => setSubraceId(e.target.value)}
                  className="input h-9 w-full text-sm"
                >
                  <option value="">—</option>
                  {subraceOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="label mb-1 flex items-center gap-1">
                <GameIcon kind="raw" slug="crossed-swords" size={11} className="text-stone-500" />
                Clase
              </label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="input h-9 w-full text-sm"
                required
              >
                <option value="">—</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (d{(c.data as ClassData).hit_die})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label mb-1 flex items-center gap-1">
                <GameIcon kind="raw" slug="scroll-quill" size={11} className="text-stone-500" />
                Trasfondo
              </label>
              <select
                value={backgroundId}
                onChange={(e) => setBackgroundId(e.target.value)}
                className="input h-9 w-full text-sm"
                required
              >
                <option value="">—</option>
                {backgrounds.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(selectedRace || selectedClass) && (
            <div className="flex flex-wrap items-center gap-3 rounded-md border border-stone-800 bg-stone-950/60 px-3 py-2 text-xs text-stone-400">
              {selectedRace && (
                <span className="flex items-center gap-1.5">
                  <GameIcon kind="race" slug={selectedRace.slug} size={14} className="text-parchment-400" />
                  {Object.entries((selectedRace.data as RaceData).ability_bonuses ?? {})
                    .map(([k, v]) => `+${v} ${k}`)
                    .join(", ")}
                </span>
              )}
              {selectedRace && selectedClass && <span className="text-stone-700">·</span>}
              {selectedClass && (
                <span className="flex items-center gap-1.5">
                  <GameIcon kind="class" slug={selectedClass.slug} size={14} className="text-parchment-400" />
                  d{(selectedClass.data as ClassData).hit_die} ·{" "}
                  {(selectedClass.data as ClassData).primary_ability.join("/")}
                </span>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={busy}
              className="btn-primary h-9 text-sm"
            >
              {busy ? "Creando…" : "Crear personaje"}
            </button>
            <button
              type="button"
              onClick={randomPick}
              disabled={races.length === 0}
              className="inline-flex h-9 items-center gap-1 rounded-md border border-stone-700 bg-stone-900 px-3 text-xs text-parchment-400 transition-colors hover:border-parchment-700/60 disabled:opacity-50"
            >
              🎲 <span>Aleatorio</span>
            </button>
            <p className="ml-auto font-serif text-[10px] italic text-stone-500">
              Array estándar auto-asignado a las habilidades primarias.
            </p>
          </div>

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
        </form>
      )}
    </section>
  );
}

function friendlyError(err: unknown): string {
  if (err instanceof Error) {
    const withResp = err as { response?: { errors?: Array<{ message: string }> } };
    const gqlMsg = withResp.response?.errors?.[0]?.message;
    if (gqlMsg) return gqlMsg;
    return err.message;
  }
  return "Error desconocido";
}
