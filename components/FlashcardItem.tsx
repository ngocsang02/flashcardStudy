"use client";

import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import type { Flashcard, Folder } from "@/lib/types";

type Props = {
  card: Flashcard;
  folders: Folder[];
  onDelete: (id: string) => Promise<{ ok: boolean; error?: string }>;
  onUpdate: (id: string, patch: Partial<Omit<Flashcard, "id" | "createdAt">>) => Promise<{ ok: boolean; error?: string }>;
  onToggleFavorite: (id: string, value: boolean) => Promise<{ ok: boolean; error?: string }>;
};

export function FlashcardItem({ card, folders, onDelete, onUpdate, onToggleFavorite }: Props) {
  const [flipped, setFlipped] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    word: card.word,
    vietnameseMeaning: card.vietnameseMeaning,
    phonetic: card.phonetic,
    partOfSpeech: card.partOfSpeech,
    definition: card.definition,
    example: card.example,
    exampleVietnamese: card.exampleVietnamese ?? "",
    folderId: card.folderId ?? ""
  });

  return (
    <div className="space-y-2">
      <div className="flashcard-container">
        <div className={`flashcard-inner ${flipped ? "is-flipped" : ""}`}>
          <div className="flashcard-face card-shell flashcard-front overflow-hidden">
            <Image src={card.image} alt={card.word} width={480} height={320} className="h-52 w-full object-cover" />
            <div className="space-y-2 p-4">
              <h3 className="text-xl font-bold text-slate-900">{card.word}</h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFlipped(true)}
                  className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
                >
                  Flip
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const result = await onToggleFavorite(card.id, !card.isFavorite);
                    if (!result.ok) toast.error(result.error || "Cannot update favorite");
                    else toast.success(!card.isFavorite ? "Added to favorites" : "Removed favorite");
                  }}
                  className="rounded-lg bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-700"
                >
                  {card.isFavorite ? "Unfavorite" : "Favorite"}
                </button>
              </div>
            </div>
          </div>

          <div className="flashcard-face flashcard-back card-shell p-4">
            {!editing ? (
              <div className="space-y-2 text-sm text-slate-700">
                <p><span className="font-semibold">Vietnamese:</span> {card.vietnameseMeaning || "N/A"}</p>
                <p><span className="font-semibold">Phonetic:</span> {card.phonetic || "N/A"}</p>
                <p><span className="font-semibold">Type:</span> {card.partOfSpeech || "N/A"}</p>
                <p><span className="font-semibold">Definition:</span> {card.definition || "N/A"}</p>
                <p><span className="font-semibold">Example:</span> {card.example || "N/A"}</p>
                <p><span className="font-semibold">Example (VI):</span> {card.exampleVietnamese || "N/A"}</p>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setFlipped(false)} className="rounded-lg bg-slate-100 px-3 py-2">
                    Flip Back
                  </button>
                  <button type="button" onClick={() => setEditing(true)} className="rounded-lg bg-blue-100 px-3 py-2 text-blue-700">
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const result = await onDelete(card.id);
                      if (!result.ok) toast.error(result.error || "Delete failed");
                      else toast.success("Deleted flashcard");
                    }}
                    className="rounded-lg bg-red-100 px-3 py-2 text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <form
                className="space-y-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const result = await onUpdate(card.id, {
                    ...form,
                    folderId: form.folderId || null
                  });
                  if (!result.ok) toast.error(result.error || "Update failed");
                  else {
                    toast.success("Updated flashcard");
                    setEditing(false);
                  }
                }}
              >
                <input className="w-full rounded border px-2 py-1" value={form.word} onChange={(e) => setForm({ ...form, word: e.target.value })} />
                <input className="w-full rounded border px-2 py-1" value={form.vietnameseMeaning} onChange={(e) => setForm({ ...form, vietnameseMeaning: e.target.value })} />
                <input className="w-full rounded border px-2 py-1" value={form.phonetic} onChange={(e) => setForm({ ...form, phonetic: e.target.value })} />
                <input className="w-full rounded border px-2 py-1" value={form.partOfSpeech} onChange={(e) => setForm({ ...form, partOfSpeech: e.target.value })} />
                <textarea className="w-full rounded border px-2 py-1" value={form.definition} onChange={(e) => setForm({ ...form, definition: e.target.value })} />
                <textarea className="w-full rounded border px-2 py-1" value={form.example} onChange={(e) => setForm({ ...form, example: e.target.value })} />
                <textarea
                  className="w-full rounded border px-2 py-1"
                  value={form.exampleVietnamese}
                  onChange={(e) => setForm({ ...form, exampleVietnamese: e.target.value })}
                />
                <select
                  className="w-full rounded border px-2 py-1"
                  value={form.folderId}
                  onChange={(e) => setForm({ ...form, folderId: e.target.value })}
                >
                  <option value="">No folder</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button type="submit" className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white">Save</button>
                  <button type="button" onClick={() => setEditing(false)} className="rounded-lg bg-slate-100 px-3 py-2 text-sm">Cancel</button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
