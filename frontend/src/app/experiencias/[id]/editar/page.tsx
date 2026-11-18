import { requirePageUser } from "@/lib/server-auth";
import Editor from "@/components/studio/editor";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePageUser(`/experiencias/${id}/editar`);
  return <Editor id={id} />;
}
