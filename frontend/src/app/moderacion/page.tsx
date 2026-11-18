import { requirePageUser } from "@/lib/server-auth";
import View from "@/components/community/moderation";
export default async function Page() {
  await requirePageUser("/moderacion", true);

  return <View />;
}
