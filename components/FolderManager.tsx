"use client";

import Link from "next/link";
import { useRef } from "react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { createFolder, deleteFolder, exportFolderToCsv, importFlashcardsFromCsv, listFolders, updateFolder } from "@/app/actions";
import type { Folder } from "@/lib/types";

type Props = {
  initialFolders: Folder[];
};

export function FolderManager({ initialFolders }: Props) {
  const [folders, setFolders] = useState(initialFolders);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [loading, setLoading] = useState(false);
  const [transferLoadingId, setTransferLoadingId] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const sortedFolders = useMemo(
    () => [...folders].sort((a, b) => (b.wordCount ?? 0) - (a.wordCount ?? 0) || a.name.localeCompare(b.name)),
    [folders]
  );

  const createNewFolder = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      toast.error("Please enter folder name");
      return;
    }

    setLoading(true);
    const result = await createFolder(trimmed);
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error || "Cannot create folder");
      return;
    }

    setFolders(await listFolders());
    setNewName("");
    toast.success("Folder created");
  };

  const saveRename = async (folderId: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      toast.error("Folder name cannot be empty");
      return;
    }

    const result = await updateFolder(folderId, trimmed);
    if (!result.ok) {
      toast.error(result.error || "Cannot rename folder");
      return;
    }

    setFolders(await listFolders());
    setEditingId(null);
    setEditingName("");
    toast.success("Folder updated");
  };

  const removeFolder = async (folderId: string) => {
    const confirmed = window.confirm("Delete this folder? Cards in it will become uncategorized.");
    if (!confirmed) return;

    const result = await deleteFolder(folderId);
    if (!result.ok) {
      toast.error(result.error || "Cannot delete folder");
      return;
    }

    setFolders(await listFolders());
    toast.success("Folder deleted");
  };

  const downloadCsv = async (folderId: string, folderName: string) => {
    setTransferLoadingId(folderId);
    const result = await exportFolderToCsv(folderId, folderName);
    setTransferLoadingId(null);
    if (!result.ok || !result.csv) {
      toast.error(result.error || "Cannot export CSV");
      return;
    }

    const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = result.filename || `${folderName}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const importCsv = async (folderId: string, file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Please select a .csv file");
      return;
    }

    setTransferLoadingId(folderId);
    const text = await file.text();
    const result = await importFlashcardsFromCsv(folderId, text);
    setTransferLoadingId(null);

    if (!result.ok) {
      toast.error(result.error || "Cannot import CSV");
      return;
    }

    setFolders(await listFolders());
    const imported = result.imported ?? 0;
    const skipped = result.skipped ?? 0;
    const errors = result.errorLines?.length ?? 0;
    toast.success(`Imported ${imported} row(s). Skipped ${skipped}. ${errors > 0 ? `${errors} line error(s).` : ""}`);
    if (errors > 0) {
      toast.warning(`CSV has ${errors} invalid line(s).`);
    }
  };

  return (
    <div className="space-y-5 pb-10">
      <div className="card-shell p-5 sm:p-6">
        <h1 className="text-2xl font-bold text-slate-900">Folders</h1>
        <p className="mt-1 text-sm text-slate-600">Organize your words by topic and study by each folder.</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Folder name (Animals, Food, Travel...)"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none ring-blue-500 transition focus:ring-2"
          />
          <button
            type="button"
            onClick={() => void createNewFolder()}
            disabled={loading}
            className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create Folder"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sortedFolders.map((folder) => (
          <div key={folder.id} className="card-shell group p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-xl">📁</div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                {folder.wordCount ?? 0} words
              </span>
            </div>

            {editingId === folder.id ? (
              <div className="space-y-2">
                <input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void saveRename(folder.id)}
                    className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setEditingName("");
                    }}
                    className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-slate-900">{folder.name}</h3>
                <p className="mt-1 text-sm text-slate-500">{folder.wordCount ?? 0} cards in this folder</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={`/study/${folder.id}`}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                  >
                    Study
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(folder.id);
                      setEditingName(folder.name);
                    }}
                    className="rounded-lg bg-blue-100 px-3 py-2 text-xs font-semibold text-blue-700"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => void downloadCsv(folder.id, folder.name)}
                    disabled={transferLoadingId === folder.id}
                    className="rounded-lg bg-indigo-100 px-3 py-2 text-xs font-semibold text-indigo-700 disabled:opacity-60"
                  >
                    {transferLoadingId === folder.id ? "Working..." : "Export CSV"}
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRefs.current[folder.id]?.click()}
                    disabled={transferLoadingId === folder.id}
                    className="rounded-lg bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-700 disabled:opacity-60"
                  >
                    Import CSV
                  </button>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    ref={(el) => {
                      fileInputRefs.current[folder.id] = el;
                    }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.currentTarget.value = "";
                      if (!file) return;
                      void importCsv(folder.id, file);
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => void removeFolder(folder.id)}
                    className="rounded-lg bg-rose-100 px-3 py-2 text-xs font-semibold text-rose-700"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {sortedFolders.length === 0 && (
        <div className="card-shell p-8 text-center text-slate-600">No folder yet. Create your first folder above.</div>
      )}
    </div>
  );
}
