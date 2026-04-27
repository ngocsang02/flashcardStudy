"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createFlashcard, listFolders } from "@/app/actions";
import { DictionaryPanel } from "@/components/DictionaryPanel";
import { ImagePicker } from "@/components/ImagePicker";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { SearchHistory } from "@/components/SearchHistory";
import { WordSearchForm } from "@/components/WordSearchForm";
import { fetchDictionary, fetchImages, translateVietnamese } from "@/lib/api";
import { saveSearchTerm, loadSearchHistory } from "@/lib/history";
import type { DictionaryResult, Folder } from "@/lib/types";

export default function HomePage() {
  const [word, setWord] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState("");
  const [dictionary, setDictionary] = useState<DictionaryResult | null>(null);
  const [vietnameseMeaning, setVietnameseMeaning] = useState("");
  const [exampleVietnamese, setExampleVietnamese] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [folderId, setFolderId] = useState<string>("");

  useEffect(() => {
    setHistory(loadSearchHistory());
    void listFolders()
      .then(setFolders)
      .catch(() => {
        toast.error("Cannot load folders");
      });
  }, []);

  const doSearch = async (customWord?: string) => {
    const term = (customWord ?? word).trim().toLowerCase();
    if (!term) {
      toast.error("Please enter a word");
      return;
    }

    setWord(term);
    setLoading(true);
    try {
      const [imageRes, dictRes] = await Promise.all([
        fetchImages(term),
        fetchDictionary(term)
      ]);

      // Keep auto-fill resilient: if translation service is down,
      // still provide prefilled values instead of leaving blank fields.
      let viMeaningRes = await translateVietnamese(term);
      if (!viMeaningRes && dictRes.definition) {
        const translatedDefinition = await translateVietnamese(dictRes.definition);
        if (translatedDefinition) viMeaningRes = translatedDefinition;
      }
      if (!viMeaningRes) viMeaningRes = term;

      let viExampleRes = "";
      if (dictRes.example) {
        viExampleRes = await translateVietnamese(dictRes.example);
        if (!viExampleRes) viExampleRes = dictRes.example;
      }

      setImages(imageRes);
      setSelectedImage(imageRes[0] || "");
      setDictionary(dictRes);
      setVietnameseMeaning(viMeaningRes);
      setExampleVietnamese(viExampleRes);
      setHistory(saveSearchTerm(term));
      toast.success("Word data loaded");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Search failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const pronunciationUrl = `https://elsaspeak.com/en/learn-english/how-to-pronounce/?word=${encodeURIComponent(word || "cat")}`;

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-10">
      <WordSearchForm value={word} onChange={setWord} onSearch={() => void doSearch()} loading={loading} />
      <SearchHistory history={history} onPick={(term) => void doSearch(term)} />

      <div className="card-shell p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Select image</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={playingAudio || !dictionary?.audioUrl}
              onClick={async () => {
                if (!dictionary?.audioUrl) {
                  toast.error("No pronunciation audio for this word");
                  return;
                }
                try {
                  setPlayingAudio(true);
                  const audio = new Audio(dictionary.audioUrl);
                  await audio.play();
                } catch {
                  toast.error("Cannot play pronunciation audio");
                } finally {
                  setPlayingAudio(false);
                }
              }}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {playingAudio ? "Playing..." : "🔊 Play Audio"}
            </button>
            <button
              type="button"
              onClick={() => window.open(pronunciationUrl, "_blank", "noopener,noreferrer")}
              className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700"
            >
              Reference Link
            </button>
          </div>
        </div>

        {loading ? <LoadingSpinner /> : <ImagePicker images={images} selectedImage={selectedImage} onSelect={setSelectedImage} />}
      </div>

      <DictionaryPanel
        dictionary={dictionary}
        vietnameseMeaning={vietnameseMeaning}
        onMeaningChange={setVietnameseMeaning}
        exampleVietnamese={exampleVietnamese}
        onExampleVietnameseChange={setExampleVietnamese}
      />

      <div className="card-shell p-4">
        <label className="mb-2 block text-sm font-medium text-slate-700">Folder (optional)</label>
        <select
          value={folderId}
          onChange={(e) => setFolderId(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none ring-blue-500 transition focus:ring-2"
        >
          <option value="">No folder</option>
          {folders.map((folder) => (
            <option key={folder.id} value={folder.id}>
              {folder.name}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        disabled={submitting || !word || !selectedImage || !dictionary}
        onClick={async () => {
          if (!dictionary || !selectedImage || !word) {
            toast.error("Please search word and choose image first");
            return;
          }

          setSubmitting(true);
          const result = await createFlashcard({
            word,
            image: selectedImage,
            phonetic: dictionary.phonetic,
            vietnameseMeaning,
            partOfSpeech: dictionary.partOfSpeech,
            definition: dictionary.definition,
            example: dictionary.example,
            exampleVietnamese,
            isFavorite: false,
            folderId: folderId || null
          });

          if (!result.ok) {
            toast.error(result.error || "Cannot create flashcard");
          } else {
            toast.success("Flashcard created");
            setWord("");
          }
          setSubmitting(false);
        }}
        className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Creating..." : "Create Flashcard"}
      </button>
    </div>
  );
}
