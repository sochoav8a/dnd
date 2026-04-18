"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { GameIcon } from "@/components/ui/GameIcon";
import { API_ORIGIN, absoluteUploadUrl } from "@/lib/graphql";

interface Props {
  characterId: string;
  portraitUrl: string | null;
  classSlug: string;
  token: string;
  /** Size in px for the portrait container. Default 96. */
  size?: number;
}

export function CharacterPortrait({
  characterId,
  portraitUrl,
  classSlug,
  token,
  size = 96,
}: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [current, setCurrent] = useState<string | null>(portraitUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_ORIGIN}/upload/portrait/${characterId}`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(body.error || "Upload failed");
      }
      const body = (await res.json()) as { portraitUrl: string };
      setCurrent(body.portraitUrl);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    if (!current) return;
    setUploading(true);
    setError(null);
    try {
      const res = await fetch(`${API_ORIGIN}/upload/portrait/${characterId}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("No se pudo eliminar");
      setCurrent(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setUploading(false);
    }
  }

  const imgUrl = absoluteUploadUrl(current);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        title={current ? "Cambiar retrato" : "Subir retrato"}
        className="group relative flex items-center justify-center overflow-hidden rounded-2xl border border-parchment-800/60 bg-gradient-to-br from-stone-800 to-stone-950 shadow-scroll ring-1 ring-inset ring-stone-900/40 transition-all hover:border-parchment-500 hover:shadow-glow"
        style={{ width: size, height: size }}
      >
        {imgUrl ? (
          // Use regular <img> (not next/image) since URL is from external API origin + is user-uploaded.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgUrl}
            alt="Retrato del personaje"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-parchment-400 drop-shadow-glow">
            <GameIcon kind="class" slug={classSlug} size={Math.floor(size * 0.55)} />
          </div>
        )}

        {/* Bottom gradient overlay with label */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-center bg-gradient-to-t from-black/85 via-black/40 to-transparent pt-6 pb-1.5 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="font-display text-[10px] uppercase tracking-[0.18em] text-parchment-200">
            {uploading ? "Subiendo…" : current ? "Cambiar retrato" : "Subir retrato"}
          </span>
        </div>

        {/* Subtle top glow when empty */}
        {!imgUrl && (
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-parchment-500/5 via-transparent to-transparent" />
        )}
      </button>

      {current && !uploading && (
        <button
          type="button"
          onClick={handleDelete}
          className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-stone-700 bg-stone-900 text-xs text-stone-400 shadow-elevated transition-colors hover:border-red-700 hover:text-red-400"
          title="Quitar retrato"
        >
          ×
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />

      {error && (
        <p className="absolute left-0 top-full mt-1 w-48 text-[10px] text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
