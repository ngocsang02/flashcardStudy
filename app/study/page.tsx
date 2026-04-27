import Link from "next/link";
import { listFolders } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function StudyPage() {
  const folders = await listFolders();

  return (
    <div className="space-y-4 pb-10">
      <div className="card-shell p-5 sm:p-6">
        <h1 className="text-2xl font-bold text-slate-900">Study by Folder</h1>
        <p className="mt-1 text-sm text-slate-600">Choose a folder to review with premium flashcard player.</p>
      </div>

      {folders.length === 0 ? (
        <div className="card-shell p-8 text-center text-slate-600">
          You do not have folders yet. <Link href="/folders" className="font-semibold text-blue-700">Create your first folder</Link>.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {folders.map((folder) => (
            <div key={folder.id} className="card-shell p-4">
              <p className="text-sm text-slate-500">Folder</p>
              <h2 className="text-lg font-semibold text-slate-900">{folder.name}</h2>
              <p className="mt-1 text-sm text-slate-600">{folder.wordCount ?? 0} cards</p>
              <Link
                href={`/study/${folder.id}`}
                className="mt-3 inline-flex rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
              >
                Study now
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
