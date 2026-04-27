"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import type { Flashcard, FlashcardInsert, Folder } from "@/lib/types";

function mapRowToFlashcard(row: Record<string, unknown>): Flashcard {
  return {
    id: String(row.id),
    word: String(row.word ?? ""),
    image: String(row.image ?? ""),
    phonetic: String(row.phonetic ?? ""),
    vietnameseMeaning: String(row.vietnamese_meaning ?? ""),
    partOfSpeech: String(row.part_of_speech ?? ""),
    definition: String(row.definition ?? ""),
    example: String(row.example ?? ""),
    exampleVietnamese: String(row.example_vietnamese ?? ""),
    isFavorite: Boolean(row.is_favorite),
    folderId: row.folder_id ? String(row.folder_id) : null,
    createdAt: String(row.created_at ?? "")
  };
}

function mapRowToFolder(row: Record<string, unknown>): Folder {
  const relations = Array.isArray(row.flashcards) ? row.flashcards : [];
  const relation = relations[0] as { count?: number } | undefined;

  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    createdAt: String(row.created_at ?? ""),
    wordCount: relation?.count ?? 0
  };
}

export async function listFlashcards(): Promise<Flashcard[]> {
  const { data, error } = await supabase.from("flashcards").select("*").order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapRowToFlashcard(row));
}

export async function listFlashcardsByFolder(folderId: string): Promise<Flashcard[]> {
  const { data, error } = await supabase
    .from("flashcards")
    .select("*")
    .eq("folder_id", folderId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapRowToFlashcard(row));
}

export async function listFolders(): Promise<Folder[]> {
  const { data, error } = await supabase
    .from("folders")
    .select("id,name,created_at,flashcards(count)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapRowToFolder(row));
}

export async function getFolderById(folderId: string): Promise<Folder | null> {
  const { data, error } = await supabase.from("folders").select("id,name,created_at").eq("id", folderId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    id: String(data.id),
    name: String(data.name ?? ""),
    createdAt: String(data.created_at ?? "")
  };
}

export async function createFolder(name: string): Promise<{ ok: boolean; error?: string }> {
  const normalized = name.trim();
  if (!normalized) return { ok: false, error: "Folder name is required" };

  const { error } = await supabase.from("folders").insert({ name: normalized });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/flashcards");
  revalidatePath("/folders");
  return { ok: true };
}

export async function updateFolder(folderId: string, name: string): Promise<{ ok: boolean; error?: string }> {
  const normalized = name.trim();
  if (!normalized) return { ok: false, error: "Folder name is required" };

  const { error } = await supabase.from("folders").update({ name: normalized }).eq("id", folderId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/flashcards");
  revalidatePath("/folders");
  revalidatePath(`/study/${folderId}`);
  return { ok: true };
}

export async function deleteFolder(folderId: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("folders").delete().eq("id", folderId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/flashcards");
  revalidatePath("/folders");
  revalidatePath("/study");
  return { ok: true };
}

export async function createFlashcard(input: FlashcardInsert): Promise<{ ok: boolean; error?: string }> {
  const normalizedWord = input.word.trim().toLowerCase();
  if (!normalizedWord) return { ok: false, error: "Word is required" };

  const { data: duplicated, error: duplicateError } = await supabase
    .from("flashcards")
    .select("id")
    .ilike("word", normalizedWord)
    .limit(1);

  if (duplicateError) return { ok: false, error: duplicateError.message };
  if ((duplicated ?? []).length > 0) {
    return { ok: false, error: "This English word already exists." };
  }

  const { error } = await supabase.from("flashcards").insert({
    word: normalizedWord,
    image: input.image,
    phonetic: input.phonetic,
    vietnamese_meaning: input.vietnameseMeaning,
    part_of_speech: input.partOfSpeech,
    definition: input.definition,
    example: input.example,
    example_vietnamese: input.exampleVietnamese ?? "",
    is_favorite: input.isFavorite,
    folder_id: input.folderId
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  revalidatePath("/flashcards");
  revalidatePath("/study");
  revalidatePath("/folders");
  if (input.folderId) revalidatePath(`/study/${input.folderId}`);
  return { ok: true };
}

export async function deleteFlashcard(id: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("flashcards").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/flashcards");
  revalidatePath("/study");
  revalidatePath("/folders");
  return { ok: true };
}

export async function updateFlashcard(
  id: string,
  patch: Partial<Omit<Flashcard, "id" | "createdAt">>
): Promise<{ ok: boolean; error?: string }> {
  const updatePayload: Record<string, unknown> = {
    word: patch.word,
    image: patch.image,
    phonetic: patch.phonetic,
    vietnamese_meaning: patch.vietnameseMeaning,
    part_of_speech: patch.partOfSpeech,
    definition: patch.definition,
    example: patch.example,
    example_vietnamese: patch.exampleVietnamese,
    is_favorite: patch.isFavorite,
    folder_id: patch.folderId
  };

  Object.keys(updatePayload).forEach((key) => {
    if (updatePayload[key] === undefined) delete updatePayload[key];
  });

  const { error } = await supabase.from("flashcards").update(updatePayload).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/flashcards");
  revalidatePath("/study");
  revalidatePath("/folders");
  if (typeof patch.folderId === "string") revalidatePath(`/study/${patch.folderId}`);
  return { ok: true };
}

export async function toggleFavorite(id: string, value: boolean): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("flashcards").update({ is_favorite: value }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/flashcards");
  revalidatePath("/study");
  revalidatePath("/folders");
  return { ok: true };
}
