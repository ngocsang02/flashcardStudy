"use client";

import { deleteFlashcard, toggleFavorite, updateFlashcard } from "@/app/actions";
import type { Flashcard, Folder } from "@/lib/types";
import { FlashcardItem } from "@/components/FlashcardItem";

type Props = {
  cards: Flashcard[];
  folders: Folder[];
};

export function FlashcardGrid({ cards, folders }: Props) {
  if (cards.length === 0) {
    return (
      <div className="card-shell p-8 text-center text-slate-600">
        No flashcards yet. Create one from the home page.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <FlashcardItem
          key={card.id}
          card={card}
          folders={folders}
          onDelete={deleteFlashcard}
          onUpdate={updateFlashcard}
          onToggleFavorite={toggleFavorite}
        />
      ))}
    </div>
  );
}
