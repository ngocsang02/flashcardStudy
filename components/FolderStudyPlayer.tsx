"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { fetchPronunciationAudio } from "@/lib/api";
import type { Flashcard } from "@/lib/types";

type Props = {
  folderName: string;
  cards: Flashcard[];
};

type StudyMode = "flashcard" | "quiz";
type QuizOption = { id: string; text: string; isCorrect: boolean };
type QuizQuestion = { id: string; word: string; correctMeaning: string; explanation: string; options: QuizOption[] };
type QuizAnswer = {
  questionId: string;
  word: string;
  selectedOptionId: string;
  selectedText: string;
  correctOptionId: string;
  correctText: string;
  isCorrect: boolean;
  explanation: string;
};

function shuffleCards<T>(cards: T[]) {
  const cloned = [...cards];
  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
}

function formatTime(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function buildQuizQuestions(sourceCards: Flashcard[]): QuizQuestion[] {
  return shuffleCards(sourceCards).map((card) => {
    const correctMeaning = card.vietnameseMeaning || card.word;
    const used = new Set([correctMeaning.trim().toLowerCase()]);
    const distractors: QuizOption[] = [];
    for (const candidate of shuffleCards(sourceCards.filter((item) => item.id !== card.id))) {
      const text = (candidate.vietnameseMeaning || candidate.word).trim();
      const normalized = text.toLowerCase();
      if (!text || used.has(normalized)) continue;
      distractors.push({ id: `${card.id}-${candidate.id}`, text, isCorrect: false });
      used.add(normalized);
      if (distractors.length === 3) break;
    }
    return {
      id: card.id,
      word: card.word,
      correctMeaning,
      explanation: card.definition || "No additional explanation.",
      options: shuffleCards([{ id: card.id, text: correctMeaning, isCorrect: true }, ...distractors])
    };
  });
}

export function FolderStudyPlayer({ folderName, cards }: Props) {
  const [mode, setMode] = useState<StudyMode>("flashcard");
  const [deck, setDeck] = useState(cards);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(false);
  const [audioMap, setAudioMap] = useState<Record<string, string>>({});

  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<QuizAnswer[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState("");
  const [quizStartedAt, setQuizStartedAt] = useState<number | null>(null);
  const [quizCompletedAt, setQuizCompletedAt] = useState<number | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [reviewOnlyIncorrect, setReviewOnlyIncorrect] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [currentTimeMs, setCurrentTimeMs] = useState(Date.now());

  const total = deck.length;
  const current = deck[index];
  const progress = useMemo(() => (total === 0 ? 0 : ((index + 1) / total) * 100), [index, total]);

  const canStartQuiz = cards.length >= 4;
  const quizTotal = quizQuestions.length;
  const quizCurrent = quizQuestions[quizIndex];
  const quizAnswered = selectedOptionId.length > 0;
  const quizScore = quizAnswers.filter((answer) => answer.isCorrect).length;
  const quizProgress = useMemo(() => (quizTotal === 0 ? 0 : (Math.min(quizIndex + 1, quizTotal) / quizTotal) * 100), [quizIndex, quizTotal]);
  const elapsedMs = useMemo(() => {
    if (!quizStartedAt) return 0;
    if (quizCompletedAt) return quizCompletedAt - quizStartedAt;
    return currentTimeMs - quizStartedAt;
  }, [quizStartedAt, quizCompletedAt, currentTimeMs]);
  const accuracy = quizTotal === 0 ? 0 : Math.round((quizScore / quizTotal) * 100);
  const filteredReviewAnswers = reviewOnlyIncorrect ? quizAnswers.filter((answer) => !answer.isCorrect) : quizAnswers;

  useEffect(() => {
    const stored = window.localStorage.getItem(`quiz-high-score:${folderName}`);
    if (stored) setHighScore(Number(stored) || 0);
  }, [folderName]);

  useEffect(() => {
    setDeck(cards);
    setIndex(0);
    setFlipped(false);
    setMode("flashcard");
    setQuizQuestions([]);
    setQuizIndex(0);
    setQuizAnswers([]);
    setSelectedOptionId("");
    setQuizStartedAt(null);
    setQuizCompletedAt(null);
    setShowReview(false);
    setReviewOnlyIncorrect(false);
  }, [cards]);

  useEffect(() => {
    if (mode !== "quiz" || quizCompletedAt) return;
    const timer = window.setInterval(() => setCurrentTimeMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [mode, quizCompletedAt]);

  useEffect(() => {
    if (mode !== "quiz" || !quizAnswered || quizCompletedAt || quizIndex >= quizTotal - 1) return;
    const timeout = window.setTimeout(() => {
      setQuizIndex((prev) => prev + 1);
      setSelectedOptionId("");
    }, 1000);
    return () => window.clearTimeout(timeout);
  }, [mode, quizAnswered, quizCompletedAt, quizIndex, quizTotal]);

  const startQuiz = () => {
    if (!canStartQuiz) return;
    setQuizQuestions(buildQuizQuestions(cards));
    setQuizIndex(0);
    setQuizAnswers([]);
    setSelectedOptionId("");
    setQuizStartedAt(Date.now());
    setQuizCompletedAt(null);
    setShowReview(false);
    setReviewOnlyIncorrect(false);
  };

  const answerQuiz = useCallback((option: QuizOption) => {
    if (!quizCurrent || quizAnswered || quizCompletedAt) return;
    const correctOptionId = quizCurrent.options.find((item) => item.isCorrect)?.id || "";
    setSelectedOptionId(option.id);
    setQuizAnswers((prev) => [
      ...prev,
      {
        questionId: quizCurrent.id,
        word: quizCurrent.word,
        selectedOptionId: option.id,
        selectedText: option.text,
        correctOptionId,
        correctText: quizCurrent.correctMeaning,
        isCorrect: option.isCorrect,
        explanation: quizCurrent.explanation
      }
    ]);

    if (quizIndex >= quizTotal - 1) {
      const completedAt = Date.now();
      setQuizCompletedAt(completedAt);
      const finalScore = quizScore + (option.isCorrect ? 1 : 0);
      if (finalScore > highScore) {
        setHighScore(finalScore);
        window.localStorage.setItem(`quiz-high-score:${folderName}`, String(finalScore));
      }
    }
  }, [folderName, highScore, quizAnswered, quizCompletedAt, quizCurrent, quizIndex, quizScore, quizTotal]);

  const nextQuiz = () => {
    if (!quizAnswered || quizIndex >= quizTotal - 1) return;
    setQuizIndex((prev) => prev + 1);
    setSelectedOptionId("");
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (mode === "flashcard") {
        if (event.key === "ArrowRight") setIndex((prev) => Math.min(prev + 1, total - 1));
        if (event.key === "ArrowLeft") setIndex((prev) => Math.max(prev - 1, 0));
        if (event.key === " " || event.key.toLowerCase() === "f") {
          event.preventDefault();
          setFlipped((prev) => !prev);
        }
        return;
      }

      if (mode === "quiz" && quizCurrent && !quizAnswered && !quizCompletedAt) {
        const key = Number(event.key);
        if (!Number.isNaN(key) && key >= 1 && key <= 4) {
          const option = quizCurrent.options[key - 1];
          if (option) {
            event.preventDefault();
            answerQuiz(option);
          }
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, total, quizCurrent, quizAnswered, quizCompletedAt, answerQuiz]);

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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setMode("flashcard")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${mode === "flashcard" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}
            >
              Flashcard Mode
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("quiz");
                startQuiz();
              }}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${mode === "quiz" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}
            >
              Quiz Mode
            </button>
          </div>
          <Link href="/folders" className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
            Exit
          </Link>
        </div>
      </div>

      {mode === "flashcard" ? (
        <>
          <div className="card-shell p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Folder</p>
                <h1 className="text-xl font-bold text-slate-900">{folderName}</h1>
              </div>
              <div className="text-sm font-medium text-slate-700">Card {index + 1} / {total}</div>
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
            <button type="button" onClick={() => { setFlipped(false); setIndex((prev) => Math.max(prev - 1, 0)); }} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
              Previous
            </button>
            <button type="button" onClick={() => setFlipped((prev) => !prev)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
              Flip
            </button>
            <button type="button" onClick={() => { setFlipped(false); setIndex((prev) => Math.min(prev + 1, total - 1)); }} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
              Next
            </button>
            <button type="button" onClick={() => { setDeck(shuffleCards(deck)); setIndex(0); setFlipped(false); }} className="rounded-lg bg-violet-100 px-4 py-2 text-sm font-semibold text-violet-700">
              Shuffle
            </button>
            <button type="button" onClick={() => { setDeck(cards); setIndex(0); setFlipped(false); }} className="rounded-lg bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-700">
              Restart
            </button>
          </div>
        </>
      ) : !canStartQuiz ? (
        <div className="card-shell p-8 text-center">
          <h2 className="text-xl font-bold text-slate-900">Quiz mode unavailable</h2>
          <p className="mt-2 text-slate-600">Chế độ kiểm tra cần ít nhất 4 từ trong folder này.</p>
          <Link href="/" className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Thêm từ mới</Link>
        </div>
      ) : quizCompletedAt && showReview ? (
        <div className="space-y-4">
          <div className="card-shell p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-slate-900">Quiz Review</h2>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={reviewOnlyIncorrect} onChange={(event) => setReviewOnlyIncorrect(event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                Only incorrect answers
              </label>
            </div>
          </div>
          <div className="space-y-3">
            {filteredReviewAnswers.map((answer, idx) => (
              <div key={answer.questionId} className="card-shell p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">Question {idx + 1}: {answer.word}</p>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${answer.isCorrect ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                    {answer.isCorrect ? "Correct" : "Incorrect"}
                  </span>
                </div>
                <p className={`text-sm ${answer.isCorrect ? "text-emerald-700" : "text-red-600"}`}>Your answer: {answer.selectedText}</p>
                <p className="text-sm text-emerald-700">Correct answer: {answer.correctText}</p>
                <p className="mt-1 text-sm text-slate-600">Explanation: {answer.explanation}</p>
              </div>
            ))}
          </div>
          <div className="card-shell flex flex-wrap items-center gap-2 p-3">
            <button type="button" onClick={startQuiz} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Làm lại bài quiz</button>
            <button type="button" onClick={() => setMode("flashcard")} className="rounded-lg bg-violet-100 px-4 py-2 text-sm font-semibold text-violet-700">Học Flashcard</button>
            <Link href="/folders" className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">Quay về Folder</Link>
          </div>
        </div>
      ) : quizCompletedAt ? (
        <div className="space-y-4">
          <div className="card-shell p-6 text-center">
            <h2 className="text-2xl font-bold text-slate-900">Quiz Completed</h2>
            <p className="mt-2 text-slate-600">Folder: {folderName}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-emerald-50 p-4"><p className="text-sm text-slate-600">Correct</p><p className="text-2xl font-bold text-emerald-700">{quizScore}</p></div>
              <div className="rounded-xl bg-red-50 p-4"><p className="text-sm text-slate-600">Incorrect</p><p className="text-2xl font-bold text-red-700">{quizTotal - quizScore}</p></div>
              <div className="rounded-xl bg-blue-50 p-4"><p className="text-sm text-slate-600">Accuracy</p><p className="text-2xl font-bold text-blue-700">{accuracy}%</p></div>
              <div className="rounded-xl bg-violet-50 p-4"><p className="text-sm text-slate-600">Time</p><p className="text-2xl font-bold text-violet-700">{formatTime(elapsedMs)}</p></div>
            </div>
            <p className="mt-3 text-sm text-slate-600">High score: {highScore} / {quizTotal}</p>
          </div>
          <div className="card-shell flex flex-wrap items-center justify-center gap-2 p-3">
            <button type="button" onClick={() => setShowReview(true)} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Xem lại đáp án</button>
            <button type="button" onClick={startQuiz} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Làm lại</button>
            <Link href="/folders" className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">Quay về Folder</Link>
            <button type="button" onClick={() => setMode("flashcard")} className="rounded-lg bg-violet-100 px-4 py-2 text-sm font-semibold text-violet-700">Chuyển sang Flashcard Mode</button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="card-shell p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Folder</p>
                <h1 className="text-xl font-bold text-slate-900">{folderName}</h1>
              </div>
              <div className="text-sm font-medium text-slate-700">Question {Math.min(quizIndex + 1, quizTotal)} / {quizTotal} | Score {quizScore}</div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-blue-600 transition-all" style={{ width: `${quizProgress}%` }} />
            </div>
          </div>

          <div className="card-shell p-6">
            <p className="text-sm uppercase tracking-wide text-slate-500">Pick the Vietnamese meaning</p>
            <h2 className="mt-2 text-4xl font-extrabold text-slate-900">{quizCurrent?.word}</h2>
            <p className="mt-2 text-sm text-slate-500">Tip: use keyboard 1, 2, 3, 4.</p>
            <div className="mt-5 grid gap-3">
              {quizCurrent?.options.map((option, optionIndex) => {
                const isSelected = selectedOptionId === option.id;
                const showCorrect = quizAnswered && option.isCorrect;
                const showWrong = quizAnswered && isSelected && !option.isCorrect;
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={quizAnswered}
                    onClick={() => answerQuiz(option)}
                    className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                      showCorrect
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                        : showWrong
                          ? "border-red-300 bg-red-50 text-red-700"
                          : "border-slate-200 bg-white text-slate-800 hover:border-blue-300 hover:bg-blue-50"
                    }`}
                  >
                    <span className="mr-2 text-slate-500">{optionIndex + 1}.</span>
                    {option.text}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card-shell flex flex-wrap items-center justify-between gap-2 p-3">
            <div className="text-sm text-slate-600">Time: {formatTime(elapsedMs)}</div>
            <button type="button" onClick={nextQuiz} disabled={!quizAnswered || quizIndex >= quizTotal - 1} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
