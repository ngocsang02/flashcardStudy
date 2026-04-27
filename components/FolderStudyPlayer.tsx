"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { fetchPronunciationAudio } from "@/lib/api";
import type { Flashcard } from "@/lib/types";

type Props = {
  folderName: string;
  cards: Flashcard[];
};

function shuffleCards(cards: Flashcard[]) {
  const cloned = [...cards];
  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
}

export function FolderStudyPlayer({ folderName, cards }: Props) {
  const [deck, setDeck] = useState(cards);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(false);
  const [audioMap, setAudioMap] = useState<Record<string, string>>({});

  const total = deck.length;
  const current = deck[index];
  const progress = useMemo(() => (total === 0 ? 0 : ((index + 1) / total) * 100), [index, total]);

  useEffect(() => {
    setDeck(cards);
    setIndex(0);
    setFlipped(false);
  }, [cards]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") setIndex((prev) => Math.min(prev + 1, total - 1));
      if (event.key === "ArrowLeft") setIndex((prev) => Math.max(prev - 1, 0));
      if (event.key === " " || event.key.toLowerCase() === "f") {
        event.preventDefault();
        setFlipped((prev) => !prev);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [total]);

  if (total === 0) {
    return (
      <div className="card-shell p-8 text-center text-slate-600">
        No cards in this folder yet. <Link href="/" className="font-semibold text-blue-700">Add new word</Link>.
      </div>
    );
  }

  const pronunciationUrl = `https://elsaspeak.com/en/learn-english/how-to-pronounce/?word=${encodeURIComponent(current.word)}`;

  const playAudio = async () => {
    try {
      setPlayingAudio(true);
      let audioUrl = audioMap[current.word];

      if (!audioUrl) {
        audioUrl = await fetchPronunciationAudio(current.word);
        setAudioMap((prev) => ({ ...prev, [current.word]: audioUrl }));
      }

      if (!audioUrl) {
        toast.error("No pronunciation audio found for this word");
        return;
      }

      const audio = new Audio(audioUrl);
      await audio.play();
    } catch {
      toast.error("Cannot play pronunciation audio");
    } finally {
      setPlayingAudio(false);
    }
  };

  return (
    <div className="space-y-4 pb-10">
      <div className="card-shell p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Folder</p>
            <h1 className="text-xl font-bold text-slate-900">{folderName}</h1>
          </div>
          <div className="text-sm font-medium text-slate-700">
            Card {index + 1} / {total}
          </div>
          <Link href="/folders" className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
            Exit
          </Link>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="flashcard-container min-h-[420px]">
        <button
          type="button"
          onClick={() => setFlipped((prev) => !prev)}
          className={`flashcard-inner w-full text-left ${flipped ? "is-flipped" : ""}`}
        >
          <div className="flashcard-face card-shell flashcard-front relative flex min-h-[420px] flex-col items-center justify-center bg-gradient-to-br from-white to-slate-50 p-8">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                window.open(pronunciationUrl, "_blank", "noopener,noreferrer");
              }}
              className="absolute right-4 top-4 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Reference Link
            </button>
            <p className="text-xs uppercase tracking-wide text-slate-500">Click to flip</p>
            <h2 className="mt-4 text-center text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">{current.word}</h2>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  void playAudio();
                }}
                disabled={playingAudio}
                className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700 disabled:opacity-60"
              >
                {playingAudio ? "Playing..." : "🔊 Pronunciation"}
              </button>
            </div>
          </div>

          <div className="flashcard-face flashcard-back card-shell min-h-[420px] overflow-hidden">
            <div className="grid min-h-[420px] gap-0 md:grid-cols-2">
              <div className="relative h-56 md:h-full">
                <Image src={current.image} alt={current.word} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
              </div>
              <div className="space-y-3 p-5 text-sm text-slate-700 sm:p-6">
                <p><span className="font-semibold text-slate-900">Vietnamese:</span> {current.vietnameseMeaning || "N/A"}</p>
                <p><span className="font-semibold text-slate-900">Phonetic:</span> {current.phonetic || "N/A"}</p>
                <p><span className="font-semibold text-slate-900">Example:</span> {current.example || "N/A"}</p>
                <p><span className="font-semibold text-slate-900">Example (VI):</span> {current.exampleVietnamese || "N/A"}</p>
                <p><span className="font-semibold text-slate-900">Definition:</span> {current.definition || "N/A"}</p>
              </div>
            </div>
          </div>
        </button>
      </div>

      <div className="card-shell flex flex-wrap items-center justify-center gap-2 p-3">
        <button
          type="button"
          onClick={() => {
            setFlipped(false);
            setIndex((prev) => Math.max(prev - 1, 0));
          }}
          className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => setFlipped((prev) => !prev)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Flip
        </button>
        <button
          type="button"
          onClick={() => {
            setFlipped(false);
            setIndex((prev) => Math.min(prev + 1, total - 1));
          }}
          className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700"
        >
          Next
        </button>
        <button
          type="button"
          onClick={() => {
            setDeck(shuffleCards(deck));
            setIndex(0);
            setFlipped(false);
          }}
          className="rounded-lg bg-violet-100 px-4 py-2 text-sm font-semibold text-violet-700"
        >
          Shuffle
        </button>
        <button
          type="button"
          onClick={() => {
            setDeck(cards);
            setIndex(0);
            setFlipped(false);
          }}
          className="rounded-lg bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-700"
        >
          Restart
        </button>
      </div>
    </div>
  );
}
