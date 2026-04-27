"use client";

import type { DictionaryResult } from "@/lib/types";

type Props = {
  dictionary: DictionaryResult | null;
  vietnameseMeaning: string;
  onMeaningChange: (value: string) => void;
  exampleVietnamese: string;
  onExampleVietnameseChange: (value: string) => void;
};

export function DictionaryPanel({
  dictionary,
  vietnameseMeaning,
  onMeaningChange,
  exampleVietnamese,
  onExampleVietnameseChange
}: Props) {
  return (
    <div className="card-shell p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-slate-900">Word Details</h2>
      {dictionary ? (
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <p>
            <span className="font-semibold">Phonetic:</span> {dictionary.phonetic || "N/A"}
          </p>
          <p>
            <span className="font-semibold">Part of speech:</span> {dictionary.partOfSpeech || "N/A"}
          </p>
          <p>
            <span className="font-semibold">Definition:</span> {dictionary.definition || "N/A"}
          </p>
          <p>
            <span className="font-semibold">Example:</span> {dictionary.example || "N/A"}
          </p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-500">Dictionary info will appear here.</p>
      )}

      <label className="mt-5 block text-sm font-medium text-slate-700">Vietnamese meaning</label>
      <input
        value={vietnameseMeaning}
        onChange={(e) => onMeaningChange(e.target.value)}
        placeholder="Example: con meo"
        className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-blue-200 focus:ring"
      />
      <p className="mt-2 text-xs text-slate-500">You can edit manually if auto-translation is not accurate.</p>

      <label className="mt-5 block text-sm font-medium text-slate-700">Example (Vietnamese)</label>
      <input
        value={exampleVietnamese}
        onChange={(e) => onExampleVietnameseChange(e.target.value)}
        placeholder="Example translation for sentence"
        className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-blue-200 focus:ring"
      />
    </div>
  );
}
