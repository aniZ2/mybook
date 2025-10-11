'use client';

import CreateClubForm from "@/components/CreateClubForm";

export default function CreateClubPage() {
  return (
    <main className="container py-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="h1">Create a Book Club</h1>
        <p className="muted mt-2">
          Start your own community and connect with readers who share your interests.
        </p>
      </div>

      <CreateClubForm />
    </main>
  );
}