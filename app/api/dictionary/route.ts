import { NextRequest, NextResponse } from "next/server";

type DictionaryApiEntry = {
  phonetic?: string;
  phonetics?: Array<{ text?: string; audio?: string }>;
  meanings?: Array<{
    partOfSpeech?: string;
    definitions?: Array<{ definition?: string; example?: string }>;
  }>;
};

export async function GET(request: NextRequest) {
  const word = request.nextUrl.searchParams.get("word")?.trim();

  if (!word) {
    return NextResponse.json({ error: "Word is required." }, { status: 400 });
  }

  const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Word not found." }, { status: 404 });
  }

  const data = (await response.json()) as DictionaryApiEntry[];
  const first = data[0];

  const firstMeaning = first?.meanings?.[0];
  const firstDefinition = firstMeaning?.definitions?.[0];
  const audioUrl = first?.phonetics?.find((item) => item.audio)?.audio || "";

  return NextResponse.json({
    phonetic: first?.phonetic || first?.phonetics?.find((item) => item.text)?.text || "",
    partOfSpeech: firstMeaning?.partOfSpeech || "",
    definition: firstDefinition?.definition || "",
    example: firstDefinition?.example || "",
    audioUrl
  });
}
