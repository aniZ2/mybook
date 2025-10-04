import { Suspense } from 'react';
import AuthorsGrid from '@/components/AuthorsGrid';
import AuthorsLoading from './loading';

export const metadata = {
  title: 'Discover Authors',
  description: 'Browse and discover amazing authors on our platform',
};

export default function AuthorsPage() {
  return (
    <main className="container py-8">
      <div className="mb-8">
        <h1 className="h1">Discover Authors</h1>
        <p className="muted mt-2">
          Explore our community of talented authors and find your next favorite writer
        </p>
      </div>

      <Suspense fallback={<AuthorsLoading />}>
        <AuthorsGrid />
      </Suspense>
    </main>
  );
}