import { requirePageUser } from "@/lib/server-auth";
import type { Metadata } from "next";
import ExperiencesView from "@/components/experiences-view";

export const metadata: Metadata = { title: "Mis experiencias | Plot" };

export default async function ExperiencesPage() {
  await requirePageUser("/experiencias");

  return <ExperiencesView />;
}
