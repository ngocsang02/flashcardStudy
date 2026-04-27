import type { Metadata } from "next";
import Link from "next/link";
import { Toaster } from "sonner";
import "./globals.css";
import "@/styles/flip-card.css";

export const metadata: Metadata = {
  title: "Vocab Flashcard",
  description: "Create vocabulary flashcards with image and meaning."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="page-gradient min-h-screen">
          <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 md:px-8">
            <Link href="/" className="text-lg font-semibold text-blue-700">
              Vocab Flashcard
            </Link>
            <nav className="flex gap-2 text-sm">
              <Link href="/" className="rounded-lg px-3 py-2 text-slate-700 transition hover:bg-slate-100">
                Home
              </Link>
              <Link
                href="/flashcards"
                className="rounded-lg px-3 py-2 text-slate-700 transition hover:bg-slate-100"
              >
                My Flashcards
              </Link>
              <Link href="/folders" className="rounded-lg px-3 py-2 text-slate-700 transition hover:bg-slate-100">
                Folders
              </Link>
              <Link href="/study" className="rounded-lg px-3 py-2 text-slate-700 transition hover:bg-slate-100">
                Study
              </Link>
            </nav>
          </header>
          <main className="mx-auto w-full max-w-6xl px-4 pb-10 md:px-8">{children}</main>
        </div>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
