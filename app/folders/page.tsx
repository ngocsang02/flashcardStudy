import { listFolders } from "@/app/actions";
import { FolderManager } from "@/components/FolderManager";

export const dynamic = "force-dynamic";

export default async function FoldersPage() {
  const folders = await listFolders();
  return <FolderManager initialFolders={folders} />;
}
