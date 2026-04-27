import { DictionaryResult } from "@/lib/types";

export async function fetchImages(word: string): Promise<string[]> {
  const res = await fetch(`/api/search-images?word=${encodeURIComponent(word)}`);
  const payload = (await res.json()) as { images?: string[]; error?: string };

  if (!res.ok) {
    throw new Error(payload.error || "Could not load image suggestions.");
  }

  return payload.images ?? [];
}

export async function fetchDictionary(word: string): Promise<DictionaryResult> {
  const res = await fetch(`/api/dictionary?word=${encodeURIComponent(word)}`);
  if (!res.ok) {
    throw new Error("Word not found in dictionary.");
  }

  return (await res.json()) as DictionaryResult;
}

export async function fetchPronunciationAudio(word: string): Promise<string> {
  const data = await fetchDictionary(word);
  return data.audioUrl || "";
}

export async function translateVietnamese(word: string): Promise<string> {
  const res = await fetch(`/api/translate?word=${encodeURIComponent(word)}`);
  if (!res.ok) {
    return "";
  }

  const payload = (await res.json()) as { translatedText: string };
  return payload.translatedText;
}
