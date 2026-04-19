"use client";

import { useState } from "react";
import type { Character } from "@dnd/shared";
import {
  getGqlClient,
  CONTENT_ITEMS_QUERY,
  absoluteUploadUrl,
} from "@/lib/graphql";
import type { SpellData } from "@dnd/shared";

interface Props {
  character: Character & {
    race?: { name: string; slug: string };
    subrace?: { name: string } | null;
    class?: { name: string; slug: string };
    subclass?: { name: string } | null;
    background?: { name: string };
    portraitUrl?: string | null;
  };
  inventory?: Array<{
    id: string;
    name: string;
    quantity: number;
    equipped: boolean;
    notes?: string | null;
  }>;
  token: string;
  className?: string;
}

interface SpellOption {
  id: string;
  slug: string;
  name: string;
  data: SpellData;
}

/**
 * Fetches a remote image and converts to data URL so @react-pdf/renderer
 * can embed it without CORS issues.
 */
async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export function DownloadPDFButton({
  character,
  inventory,
  token,
  className,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setBusy(true);
    setError(null);
    try {
      // Fetch spells used by the character to embed them in the PDF
      const knownSlugs = new Set([
        ...(character.state.known_spells ?? []),
        ...(character.state.prepared_spells ?? []),
      ]);

      let spells: SpellOption[] = [];
      if (knownSlugs.size > 0) {
        const res = await getGqlClient(token).request<{
          contentItems: SpellOption[];
        }>(CONTENT_ITEMS_QUERY, { type: "spell" });
        spells = res.contentItems.filter((sp) => knownSlugs.has(sp.slug));
      }

      const portraitUrl = absoluteUploadUrl(character.portraitUrl ?? null);
      const portraitDataUrl = portraitUrl
        ? await urlToDataUrl(portraitUrl)
        : null;

      // Dynamic import — react-pdf is client-only
      const [{ pdf }, { CharacterSheetPDF }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./CharacterSheetPDF"),
      ]);

      const blob = await pdf(
        <CharacterSheetPDF
          character={character}
          portraitDataUrl={portraitDataUrl}
          spells={spells}
          inventory={inventory ?? []}
        />,
      ).toBlob();

      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      const safeName = character.name.replace(/[^a-z0-9]+/gi, "_");
      a.download = `${safeName}_character_sheet.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar PDF");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-start">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className={
          className ??
          "text-parchment-400 hover:text-parchment-300 underline disabled:opacity-50"
        }
        title="Descargar hoja de personaje en PDF"
      >
        {busy ? "Generando PDF…" : "Descargar PDF"}
      </button>
      {error && (
        <span className="mt-1 text-[10px] text-red-400">{error}</span>
      )}
    </div>
  );
}
