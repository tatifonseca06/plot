import { requirePageUser } from "@/lib/server-auth";
import CreatePlan from "@/components/studio/create-plan";
export default async function Page() {
  await requirePageUser("/experiencias/nueva");
  return <CreatePlan />;
}
