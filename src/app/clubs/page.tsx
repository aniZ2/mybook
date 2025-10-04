import { Suspense } from 'react';
import ClubsGrid from '@/components/ClubsGrid';
import ClubsLoading from './loading';
import Link from 'next/link';

export const metadata = {
  title: 'Book Clubs',
  description: 'Join book clubs and connect with readers who share your interests',
};

export default function ClubsPage() {
  return (
    <main className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="h1">Book Clubs</h1>
          <p className="muted mt-2">
            Join communities of readers and discover your next great read together
          </p>
        </div>
        
        <Link
          href="/clubs/create"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Create Club
        </Link>
      </div>

      <Suspense fallback={<ClubsLoading />}>
        <ClubsGrid />
      </Suspense>
    </main>
  );
}