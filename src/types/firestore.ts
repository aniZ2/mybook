// types/firestore.ts
import {
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
} from 'firebase/firestore';

/* ─────────── Shared Firestore Timestamp Type ─────────── */
export type FirestoreDate =
  | import('firebase/firestore').Timestamp
  | import('firebase/firestore').FieldValue
  | null
  | undefined;

/* ─────────── UserDoc ─────────── */
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

/* ─────────── AuthorDoc ─────────── */
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

/* ─────────── BookDoc ─────────── */
export interface BookDoc {
  id: string;
  slug: string;
  title: string;
  authorName: string;
  authors?: string[];
  authorId?: string | null; 
  buyLink?: string | null;
  previewLink?: string | null;
  coverUrl?: string | null;
  description?: string | null;
  tags?: string[];
  publishedAt?: string | number | Date | null;
  meta?: {
    isbn10?: string | null;
    isbn13?: string | null;
    source?: string | null;
  };

  // Engagement fields
  likesCount?: number;
  commentsCount?: number;
  savesCount?: number;

  createdAt?: FirestoreDate;
  updatedAt?: FirestoreDate;
}


/* ─────────── PostDoc ─────────── */
export interface PostDoc {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string | null;

  /** Optional: reference to a book this post mentions */
  bookRef?: string | null;

  /** Main post content (text, quotes, etc.) */
  content: string;

  /** Optional image or media attached to the post */
  imageUrl?: string | null;

  /** Engagement counts */
  likesCount: number;
  commentsCount: number;
  savesCount: number;

  /** Discovery tags, moods, genres, etc. */
  tags?: string[];

  /** Visibility: public feed, followers only, or private */
  visibility: 'public' | 'followers' | 'private';

  /** Server-managed timestamps */
  createdAt?: FirestoreDate;
  updatedAt?: FirestoreDate;
}

/* ─────────── ReviewDoc ─────────── */
export interface ReviewDoc {
  id?: string;
  userId: string;
  userName: string;
  rating: number;
  text: string;
  createdAt?: FirestoreDate;
  updatedAt?: FirestoreDate;
}

/* ─────────── ClubDoc ─────────── */
export interface ClubDoc {
  id: string;
  name: string;
  slug: string;
  description: string;
  coverUrl: string | null;
  iconUrl: string | null;
  ownerUid: string;        // Owner’s user ID
  creatorName: string;     // Owner’s display name
  membersCount: number;
  booksCount: number;
  category:
    | 'fiction'
    | 'non-fiction'
    | 'mystery'
    | 'romance'
    | 'sci-fi'
    | 'fantasy'
    | 'biography'
    | 'general';
  isPublic: boolean;
  tags?: string[];
  theme?: {
    primary: string;
    secondary: string;
  };
  createdAt?: FirestoreDate;
  updatedAt?: FirestoreDate;
}

/* ─────────── ClubMemberDoc ─────────── */
export interface ClubMemberDoc {
  userId: string;
  userName: string;
  userPhoto: string | null;
  role: 'admin' | 'moderator' | 'member';
  joinedAt?: FirestoreDate;
}

/* ─────────── Universal Converter Factory ─────────── */
function createConverter<T extends object>(): FirestoreDataConverter<T> {
  return {
    toFirestore(data: T) {
      return data;
    },
    fromFirestore(snap: QueryDocumentSnapshot, options: SnapshotOptions): T {
      return snap.data(options) as T;
    },
  };
}

/* ─────────── Exported Converters ─────────── */
export const userConverter = createConverter<UserDoc>();
export const authorConverter = createConverter<AuthorDoc>();
export const bookConverter = createConverter<BookDoc>();
export const postConverter = createConverter<PostDoc>();
export const reviewConverter = createConverter<ReviewDoc>();
export const clubConverter = createConverter<ClubDoc>();
export const clubMemberConverter = createConverter<ClubMemberDoc>();
