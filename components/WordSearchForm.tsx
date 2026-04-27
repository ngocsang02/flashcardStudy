"use client";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  loading: boolean;
};

export function WordSearchForm({ value, onChange, onSearch, loading }: Props) {
  return (
    <div className="card-shell p-5 sm:p-6">
      <h1 className="mb-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Build Vocabulary Flashcards</h1>
      <p className="mb-5 text-sm text-slate-600">Type an English word to get image, pronunciation and meaning.</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSearch();
          }}
          placeholder="Example: cat"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none ring-blue-200 transition focus:ring"
        />
        <button
          type="button"
          onClick={onSearch}
          disabled={loading}
          className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>
    </div>
  );
}
