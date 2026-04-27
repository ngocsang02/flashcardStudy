const translationFallback: Record<string, string> = {
  cat: "con meo",
  dog: "con cho",
  apple: "qua tao",
  book: "quyen sach",
  house: "ngoi nha"
};

export async function translateToVietnamese(word: string): Promise<string> {
  const normalized = word.trim().toLowerCase();
  if (!normalized) return "";

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=${encodeURIComponent(normalized)}`;
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      return translationFallback[normalized] ?? "";
    }

    const data = (await response.json()) as unknown;
    const translatedText = Array.isArray(data)
      ? (data[0] as Array<[string?, string?]> | undefined)
          ?.map((item) => item?.[0] ?? "")
          .join("")
          .trim()
      : "";

    return translatedText || translationFallback[normalized] || "";
  } catch {
    return translationFallback[normalized] ?? "";
  }
}
