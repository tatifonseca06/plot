import { requirePageUser } from "@/lib/server-auth";
import View from "@/components/community/manage";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePageUser(`/gestionar/${id}`);
  return <View id={id} />;
}
