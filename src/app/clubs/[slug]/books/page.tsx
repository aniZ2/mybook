import { db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, query, limit } from 'firebase/firestore';
import { clubConverter, bookConverter, type ClubDoc, type BookDoc } from '@/types/firestore';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

interface PageProps {
  params: { slug: string };
}

async function getClubBooks(slug: string) {
  const clubRef = doc(db, 'clubs', slug).withConverter(clubConverter);
  const clubSnap = await getDoc(clubRef);

  if (!clubSnap.exists()) return null;
  const club = clubSnap.data();

  const booksRef = collection(db, 'clubs', slug, 'books').withConverter(bookConverter);
  const booksSnap = await getDocs(query(booksRef, limit(50)));
  const books = booksSnap.docs.map(d => d.data());

  return { club, books };
}

export default async function ClubBooksPage({ params }: PageProps) {
  const data = await getClubBooks(params.slug);
  if (!data) notFound();

  const { club, books } = data;

  return (
    <main className="container py-8">
      <h1 className="h1 mb-6">Books in {club.name}</h1>

      {books.length === 0 ? (
        <div className="panel text-center py-12">
          <p className="muted">This club hasn’t added any books yet.</p>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {books.map((book: BookDoc) => (
            <Link key={book.id} href={`/books/${book.slug}`} className="group">
              <div className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-md group-hover:shadow-xl transition-shadow">
                {book.coverUrl ? (
                  <Image
                    src={book.coverUrl}
                    alt={book.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center p-4">
                    <p className="text-center text-sm font-medium text-gray-700">
                      {book.title}
                    </p>
                  </div>
                )}
              </div>
              <h3 className="mt-2 text-sm font-medium line-clamp-2">{book.title}</h3>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
