const HISTORY_KEY = "vocab_history";

export function loadSearchHistory(): string[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(HISTORY_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSearchTerm(term: string): string[] {
  if (typeof window === "undefined") return [];

  const normalized = term.trim().toLowerCase();
  if (!normalized) return loadSearchHistory();

  const next = [normalized, ...loadSearchHistory().filter((item) => item !== normalized)].slice(0, 8);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return next;
}
