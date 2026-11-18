import { requirePageUser } from "@/lib/server-auth";
import View from "@/components/community/rooms";
export default async function Page() {
  await requirePageUser("/salas");

  return <View />;
}
