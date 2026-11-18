import { requirePageUser } from "@/lib/server-auth";
import View from "@/components/community/reservations";
export default async function Page() {
  await requirePageUser("/reservas");

  return <View />;
}
