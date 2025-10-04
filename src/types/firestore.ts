// types/firestore.ts
import {
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
} from 'firebase/firestore';

export type FirestoreDate =
  | import('firebase/firestore').Timestamp
  | import('firebase/firestore').FieldValue
  | null
  | undefined;

/* ─────────── Types ─────────── */
export interface UserDoc {
  role: 'reader' | 'author' | null;
  isAuthor: boolean;
  authorId: string | null;
  slug: string | null;
  displayName: string | null;
  profileComplete: boolean;
  photoURL?: string | null;
  createdAt?: FirestoreDate;
  updatedAt?: FirestoreDate;
}

export interface AuthorDoc {
  ownerUid: string;
  name: string;
  handle: string;
  slug: string;
  about: string;
  photoUrl: string | null;
  followersCount: number;
  theme: {
    bg: string;
    fg: string;
    accent: string;
    coverUrl: string | null;
  };
  nav: { label: string; path: string }[];
  createdAt?: FirestoreDate;
  updatedAt?: FirestoreDate;
}

export type BookDoc = {
  id: string;
  slug: string;
  title: string;
  authorName: string;
  authors?: string[];
  authorId?: string;
  buyLink?: string | null;
  previewLink?: string | null;
  coverUrl?: string | null;
  description?: string | null;
  tags?: string[];
  publishedAt?: string | number | Date;
  meta?: {
    isbn10?: string | null;
    isbn13?: string | null;
    source?: string | null;
  };
};


export interface ReviewDoc {
  id?: string;
  userId: string;
  userName: string;
  rating: number;
  text: string;
  createdAt?: FirestoreDate;
  updatedAt?: FirestoreDate;
}

export interface ClubDoc {
  id: string;
  name: string;
  slug: string;
  description: string;
  coverUrl: string | null;
  iconUrl: string | null;
  ownerUid: string; // Owner's user ID
  creatorName: string; // Owner's display name
  membersCount: number;
  booksCount: number;
  category: 'fiction' | 'non-fiction' | 'mystery' | 'romance' | 'sci-fi' | 'fantasy' | 'biography' | 'general';
  isPublic: boolean;
  tags?: string[];
  theme?: {
    primary: string;
    secondary: string;
  };
  createdAt?: FirestoreDate;
  updatedAt?: FirestoreDate;
}

export interface ClubMemberDoc {
  userId: string;
  userName: string;
  userPhoto: string | null;
  role: 'admin' | 'moderator' | 'member';
  joinedAt?: FirestoreDate;
}

/* ─────────── Converters ─────────── */
function createConverter<T extends object>(): FirestoreDataConverter<T> {
  return {
    toFirestore(data: T) {
      return data;
    },
    fromFirestore(
      snap: QueryDocumentSnapshot,
      options: SnapshotOptions
    ): T {
      return snap.data(options) as T;
    },
  };
}

export const userConverter = createConverter<UserDoc>();
export const authorConverter = createConverter<AuthorDoc>();
export const bookConverter = createConverter<BookDoc>();
export const reviewConverter = createConverter<ReviewDoc>();
export const clubConverter = createConverter<ClubDoc>();
export const clubMemberConverter = createConverter<ClubMemberDoc>();