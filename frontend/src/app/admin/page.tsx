import { requirePageUser } from "@/lib/server-auth";
import type { Metadata } from "next";
import AdminView from "@/components/admin-view";

export const metadata: Metadata = { title: "Administración | Plot" };

export default async function AdminPage() {
  await requirePageUser("/admin", true);

  return <AdminView />;
}
