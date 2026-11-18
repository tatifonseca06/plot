import JoinPlan from "@/components/community/join-plan";
export default async function Page({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <JoinPlan code={code} />;
}
