import { db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, query, limit } from 'firebase/firestore';
import { clubConverter, clubMemberConverter, type ClubDoc, type ClubMemberDoc } from '@/types/firestore';
import { notFound } from 'next/navigation';
import Image from 'next/image';

interface PageProps {
  params: { slug: string };
}

async function getClubMembers(slug: string) {
  const clubRef = doc(db, 'clubs', slug).withConverter(clubConverter);
  const clubSnap = await getDoc(clubRef);

  if (!clubSnap.exists()) return null;
  const club = clubSnap.data();

  const membersRef = collection(db, 'clubs', slug, 'members').withConverter(clubMemberConverter);
  const membersSnap = await getDocs(query(membersRef, limit(50)));
  const members = membersSnap.docs.map(d => d.data());

  return { club, members };
}

export default async function ClubMembersPage({ params }: PageProps) {
  const data = await getClubMembers(params.slug);
  if (!data) notFound();

  const { club, members } = data;

  return (
    <main className="container py-8">
      <h1 className="h1 mb-6">Members of {club.name}</h1>

      {members.length === 0 ? (
        <div className="panel text-center py-12">
          <p className="muted">This club doesn’t have any members yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {members.map((member: ClubMemberDoc) => (
            <div key={member.userId} className="panel p-4 text-center">
              {member.userPhoto ? (
                <Image
                  src={member.userPhoto}
                  alt={member.userName}
                  width={64}
                  height={64}
                  className="rounded-full mx-auto object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-xl mx-auto">
                  {member.userName.charAt(0).toUpperCase()}
                </div>
              )}
              <p className="mt-2 text-sm font-medium line-clamp-1">{member.userName}</p>
              {member.role !== 'member' && (
                <p className="text-xs text-gray-500 capitalize">{member.role}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
