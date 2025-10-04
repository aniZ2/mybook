import CreateClubForm from '@/components/CreateClubForm';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/firebase';

export const metadata = {
  title: 'Create a Book Club',
  description: 'Start your own book club and build a community of readers',
};

export default function CreateClubPage() {
  // Note: In a real app, you'd check auth on the server side
  // For now, the form component will handle auth check
  
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