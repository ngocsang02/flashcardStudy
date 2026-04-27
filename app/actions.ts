"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import type { Flashcard, FlashcardInsert, Folder } from "@/lib/types";

const DEFAULT_FLASHCARD_IMAGE = "/flashcard-default.svg";

function normalizeImageSrc(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return DEFAULT_FLASHCARD_IMAGE;
  if (raw.includes("placehold.co")) return DEFAULT_FLASHCARD_IMAGE;
  return raw;
}

function mapRowToFlashcard(row: Record<string, unknown>): Flashcard {
  return {
    id: String(row.id),
    word: String(row.word ?? ""),
    image: normalizeImageSrc(row.image),
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

function escapeCsvValue(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      i += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function splitCsvRows(content: string): string[] {
  const rows: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      i += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
      continue;
    }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (current.trim()) rows.push(current);
      current = "";
      if (char === "\r" && nextChar === "\n") i += 1;
      continue;
    }
    current += char;
  }
  if (current.trim()) rows.push(current);
  return rows;
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

export async function exportFolderToCsv(
  folderId: string,
  folderNameFallback?: string
): Promise<{ ok: boolean; filename?: string; csv?: string; error?: string }> {
  const cards = await listFlashcardsByFolder(folderId);
  const header = [
    "word",
    "image",
    "phonetic",
    "vietnameseMeaning",
    "partOfSpeech",
    "definition",
    "example",
    "exampleVietnamese",
    "isFavorite"
  ].join(",");

  const rows = cards.map((card) =>
    [
      card.word,
      card.image,
      card.phonetic,
      card.vietnameseMeaning,
      card.partOfSpeech,
      card.definition,
      card.example,
      card.exampleVietnamese ?? "",
      card.isFavorite ? "true" : "false"
    ]
      .map((value) => escapeCsvValue(value))
      .join(",")
  );

  const rawName = (folderNameFallback ?? folderId).trim();
  const safeName = rawName.replace(/[^\w-]+/g, "_").toLowerCase();
  return {
    ok: true,
    filename: `folder_${safeName || folderId}.csv`,
    csv: [header, ...rows].join("\n")
  };
}

export async function importFlashcardsFromCsv(
  folderId: string,
  csvText: string
): Promise<{ ok: boolean; imported?: number; skipped?: number; errorLines?: string[]; error?: string }> {
  if (!csvText.trim()) return { ok: false, error: "CSV content is empty" };

  const rows = splitCsvRows(csvText);
  if (rows.length < 2) return { ok: false, error: "CSV must include header and at least one data row" };

  const header = parseCsvLine(rows[0]).map((item) => item.toLowerCase());
  const required = ["word"];
  const missing = required.filter((key) => !header.includes(key));
  if (missing.length > 0) return { ok: false, error: `Missing required column(s): ${missing.join(", ")}` };

  const indexOf = (name: string) => header.indexOf(name.toLowerCase());
  const rowErrors: string[] = [];
  const pendingRows: Array<Record<string, unknown>> = [];
  let skipped = 0;

  for (let i = 1; i < rows.length; i += 1) {
    const cells = parseCsvLine(rows[i]);
    const get = (name: string) => {
      const idx = indexOf(name);
      return idx >= 0 ? String(cells[idx] ?? "").trim() : "";
    };

    const word = get("word").toLowerCase();
    if (!word) {
      rowErrors.push(`Line ${i + 1}: word is required`);
      continue;
    }

    pendingRows.push({
      word,
      image: get("image"),
      phonetic: get("phonetic"),
      vietnamese_meaning: get("vietnameseMeaning"),
      part_of_speech: get("partOfSpeech"),
      definition: get("definition"),
      example: get("example"),
      example_vietnamese: get("exampleVietnamese"),
      is_favorite: get("isFavorite").toLowerCase() === "true",
      folder_id: folderId
    });
  }

  if (pendingRows.length === 0) {
    return { ok: false, error: "No valid rows to import", errorLines: rowErrors };
  }

  const words = pendingRows.map((item) => String(item.word));
  const { data: existingRows, error: existingError } = await supabase
    .from("flashcards")
    .select("word")
    .in("word", words);

  if (existingError) return { ok: false, error: existingError.message };
  const existingWords = new Set((existingRows ?? []).map((item) => String(item.word).toLowerCase()));

  const insertRows = pendingRows.filter((item) => {
    const word = String(item.word);
    if (existingWords.has(word)) {
      skipped += 1;
      return false;
    }
    existingWords.add(word);
    return true;
  });

  if (insertRows.length > 0) {
    const { error: insertError } = await supabase.from("flashcards").insert(insertRows);
    if (insertError) return { ok: false, error: insertError.message };
  }

  revalidatePath("/");
  revalidatePath("/flashcards");
  revalidatePath("/study");
  revalidatePath("/folders");
  revalidatePath(`/study/${folderId}`);

  return {
    ok: true,
    imported: insertRows.length,
    skipped,
    errorLines: rowErrors
  };
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
  if (!input.folderId) return { ok: false, error: "Folder is required" };

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
    image: input.image?.trim() || DEFAULT_FLASHCARD_IMAGE,
    phonetic: input.phonetic?.trim() || "",
    vietnamese_meaning: input.vietnameseMeaning?.trim() || normalizedWord,
    part_of_speech: input.partOfSpeech?.trim() || "",
    definition: input.definition?.trim() || "",
    example: input.example?.trim() || "",
    example_vietnamese: input.exampleVietnamese ?? "",
    is_favorite: input.isFavorite ?? false,
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
