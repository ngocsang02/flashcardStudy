import { listFlashcards, listFolders } from "@/app/actions";
import { FlashcardGrid } from "@/components/FlashcardGrid";

export const dynamic = "force-dynamic";

export default async function FlashcardsPage() {
  const [cards, folders] = await Promise.all([listFlashcards(), listFolders()]);

  return (
    <div className="space-y-4 pb-10">
      <div className="card-shell p-5 sm:p-6">
        <h1 className="text-2xl font-bold text-slate-900">My Flashcards</h1>
        <p className="mt-1 text-sm text-slate-600">Review, flip, edit, favorite and delete your vocabulary cards.</p>
      </div>
      <FlashcardGrid cards={cards} folders={folders} />
    </div>
  );
}
