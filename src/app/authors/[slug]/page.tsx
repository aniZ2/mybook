import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import type { AuthorDoc } from '@/types/firestore';
import type { Metadata } from 'next';

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const ref = doc(db, 'authors', params.slug);
  const snap = await getDoc(ref);
  
  if (!snap.exists()) {
    return {
      title: 'Author Not Found',
    };
  }
  
  const author = snap.data() as AuthorDoc;
  
  return {
    title: author.name,
    description: author.about,
    openGraph: {
      title: author.name,
      description: author.about,
      images: author.photoUrl ? [author.photoUrl] : undefined,
    },
    twitter: {
      card: 'summary',
      title: author.name,
      description: author.about,
      images: author.photoUrl ? [author.photoUrl] : undefined,
    },
  };
}

export default async function AuthorPage({ params }: PageProps) {
  const ref = doc(db, 'authors', params.slug);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    notFound();
  }

  const author = snap.data() as AuthorDoc;

  return (
    <main className="panel">
      <div className="flex flex-col items-center gap-6">
        {author.photoUrl && (
          <Image
            src={author.photoUrl}
            alt={`${author.name}'s profile`}
            width={200}
            height={200}
            className="rounded-full object-cover"
            priority
          />
        )}
        
        <div className="text-center">
          <h1 className="h1">{author.name}</h1>
          {author.about && (
            <p className="muted mt-2">{author.about}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="font-semibold">{author.followersCount.toLocaleString()}</span>
          <span className="muted">
            {author.followersCount === 1 ? 'Follower' : 'Followers'}
          </span>
        </div>
      </div>
    </main>
  );
}