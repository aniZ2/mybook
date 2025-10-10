// src/app/clubs/create/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";
import CreateClubForm from "@/components/CreateClubForm";

export const metadata = {
  title: "Create a Book Club",
  description: "Start your own book club and build a community of readers",
};

export default async function CreateClubPage() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/auth/verify`, {
    cache: "no-store",
  });

  if (!res.ok) redirect("/login");

  const { authenticated } = await res.json();
  if (!authenticated) redirect("/login");

  return (
    <main className="container py-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="h1">Create a Book Club</h1>
        <p className="muted mt-2">
          Start your own community and connect with readers who share your interests
        </p>
      </div>

      <CreateClubForm />
    </main>
  );
}
