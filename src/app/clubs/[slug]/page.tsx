import { doc, getDoc, collection, query, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  clubConverter,
  bookConverter,
  clubMemberConverter,
  type ClubDoc,
  type BookDoc,
  type ClubMemberDoc,
} from "@/types/firestore";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import ClubChat from "@/components/ClubChat";

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const ref = doc(db, "clubs", params.slug).withConverter(clubConverter);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    return { title: "Club Not Found" };
  }

  const club = snap.data();

  return {
    title: club.name,
    description: club.description || "A Booklyverse reading club",
    openGraph: {
      title: club.name,
      description: club.description || "",
      images: club.coverUrl ? [club.coverUrl] : undefined,
    },
  };
}

async function getClubData(slug: string) {
  const clubRef = doc(db, "clubs", slug).withConverter(clubConverter);
  const clubSnap = await getDoc(clubRef);

  if (!clubSnap.exists()) return null;

  const club = clubSnap.data();

  const booksRef = collection(db, "clubs", slug, "books").withConverter(bookConverter);
  const booksSnap = await getDocs(query(booksRef, limit(12)));
  const books = booksSnap.docs.map((d) => d.data());

  const membersRef = collection(db, "clubs", slug, "members").withConverter(clubMemberConverter);
  const membersSnap = await getDocs(query(membersRef, limit(12)));
  const members = membersSnap.docs.map((d) => d.data());

  return { club, books, members };
}

export default async function ClubPage({ params }: PageProps) {
  const data = await getClubData(params.slug);
  if (!data) notFound();

  const { club, books, members } = data;

  return (
    <main>
      {/* Small Banner */}
      <div style={{ 
        position: 'relative', 
        height: '120px', 
        background: 'linear-gradient(135deg, #667eea, #764ba2)',
        marginBottom: '3rem'
      }}>
        {club.coverUrl && (
          <Image
            src={club.coverUrl}
            alt=""
            fill
            style={{ objectFit: 'cover' }}
            priority
          />
        )}
      </div>

      <div className="container">
        {/* Club Header */}
        <header className="panel" style={{ padding: '2rem', marginTop: '-5rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {club.iconUrl ? (
              <Image
                src={club.iconUrl}
                alt={club.name}
                width={80}
                height={80}
                style={{ borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--bg)' }}
              />
            ) : (
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '2rem',
                fontWeight: 'bold',
                border: '4px solid var(--bg)'
              }}>
                {club.name.charAt(0).toUpperCase()}
              </div>
            )}

            <div style={{ flex: 1 }}>
              <h1 className="h1" style={{ marginBottom: '0.5rem' }}>{club.name}</h1>
              <p className="muted">{club.description}</p>
              <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.9rem', marginTop: '0.75rem' }}>
                <span><strong>{club.membersCount}</strong> members</span>
                <span><strong>{club.booksCount}</strong> books</span>
              </div>
            </div>

            <button className="btn btn-primary">Join Club</button>
          </div>
        </header>

        {/* Books Section */}
        <section style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 className="h2">Books</h2>
            {books.length > 0 && <Link href={`/clubs/${club.slug}/books`}>View all →</Link>}
          </div>

          {books.length === 0 ? (
            <div className="panel" style={{ padding: '3rem', textAlign: 'center' }}>
              <p className="muted">No books yet</p>
            </div>
          ) : (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: '1.5rem' 
            }}>
              {books.map((book) => (
                <Link key={book.id} href={`/books/${book.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ 
                    position: 'relative', 
                    aspectRatio: '2/3',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    marginBottom: '0.5rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    {book.coverUrl ? (
                      <Image
                        src={book.coverUrl}
                        alt={book.title}
                        fill
                        style={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        background: '#e0e0e0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1rem'
                      }}>
                        <p style={{ fontSize: '0.8rem', textAlign: 'center' }}>{book.title}</p>
                      </div>
                    )}
                  </div>
                  <h3 style={{ fontSize: '0.85rem', lineHeight: '1.3' }}>{book.title}</h3>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Members Section */}
        <section style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 className="h2">Members</h2>
            {members.length > 0 && <Link href={`/clubs/${club.slug}/members`}>View all →</Link>}
          </div>

          {members.length === 0 ? (
            <div className="panel" style={{ padding: '3rem', textAlign: 'center' }}>
              <p className="muted">No members yet</p>
            </div>
          ) : (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: '1rem' 
            }}>
              {members.map((member) => (
                <div key={member.userId} className="panel" style={{ padding: '1rem', textAlign: 'center' }}>
                  {member.userPhoto ? (
                    <Image
                      src={member.userPhoto}
                      alt={member.userName}
                      width={60}
                      height={60}
                      style={{ borderRadius: '50%', margin: '0 auto', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #667eea, #764ba2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '1.25rem',
                      margin: '0 auto'
                    }}>
                      {member.userName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', fontWeight: '500' }}>{member.userName}</p>
                  {member.role !== "member" && (
                    <p className="muted" style={{ fontSize: '0.7rem', textTransform: 'capitalize' }}>{member.role}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Chat Section */}
        <section>
          <h2 className="h2" style={{ marginBottom: '1rem' }}>Chat</h2>
          <ClubChat slug={club.slug} />
        </section>
      </div>
    </main>
  );
}