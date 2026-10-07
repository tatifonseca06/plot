import type { Metadata } from "next";
import ExperiencesView from "@/components/experiences-view";

export const metadata: Metadata = { title: "Mis experiencias | Plot" };

export default function ExperiencesPage() {
  return <ExperiencesView />;
}
