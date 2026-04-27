import Link from "next/link";
import { getFolderById, listFlashcardsByFolder } from "@/app/actions";
import { FolderStudyPlayer } from "@/components/FolderStudyPlayer";

export const dynamic = "force-dynamic";

type Props = {
  params: { folderId: string };
};

export default async function FolderStudyPage({ params }: Props) {
  const folder = await getFolderById(params.folderId);

  if (!folder) {
    return (
      <div className="card-shell p-8 text-center text-slate-600">
        Folder not found. <Link href="/folders" className="font-semibold text-blue-700">Go back</Link>.
      </div>
    );
  }

  const cards = await listFlashcardsByFolder(params.folderId);
  return <FolderStudyPlayer folderName={folder.name} cards={cards} />;
}
