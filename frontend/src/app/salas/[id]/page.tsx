import { requirePageUser } from "@/lib/server-auth";
import View from "@/components/community/room-detail";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePageUser(`/salas/${id}`);
  return <View id={id} />;
}
