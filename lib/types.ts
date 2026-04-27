export type DictionaryResult = {
  phonetic: string;
  partOfSpeech: string;
  definition: string;
  example: string;
  exampleVietnamese?: string;
  audioUrl: string;
};

export type Flashcard = {
  id: string;
  word: string;
  image: string;
  phonetic: string;
  vietnameseMeaning: string;
  partOfSpeech: string;
  definition: string;
  example: string;
  exampleVietnamese?: string;
  isFavorite: boolean;
  folderId: string | null;
  createdAt: string;
};

export type FlashcardInsert = Omit<Flashcard, "id" | "createdAt">;

export type Folder = {
  id: string;
  name: string;
  createdAt: string;
  wordCount?: number;
};
