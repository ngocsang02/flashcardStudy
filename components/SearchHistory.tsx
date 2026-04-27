"use client";

type Props = {
  history: string[];
  onPick: (term: string) => void;
};

export function SearchHistory({ history, onPick }: Props) {
  if (history.length === 0) return null;

  return (
    <div className="card-shell p-5 sm:p-6">
      <h3 className="mb-3 text-sm font-semibold text-slate-700">Recent searches</h3>
      <div className="flex flex-wrap gap-2">
        {history.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onPick(item)}
            className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700 transition hover:bg-slate-200"
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
