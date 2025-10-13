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
  /** Core identity */
  id?: string;
  slug: string;
  title: string;

  /** Author info */
  authorName: string;
  authors?: string[];
  authorId?: string | null;

  /** External sources */
  source?: 'google' | 'openlibrary' | 'isbndb' | 'manual' | null;
  sourceId?: string | null;
  asin?: string | null;

  /** Media & Links */
  coverUrl?: string | null;
  buyLink?: string | null;
  bnLink?: string | null;
  googleLink?: string | null;
  previewLink?: string | null;

  /** Metadata */
  publisher?: string | null;
  publishedDate?: string | null;
  description?: string | null;
  tags?: string[];
  genres?: string[];
  moods?: string[];
  pacing?: 'slow' | 'medium' | 'fast' | string;
  meta?: {
    isbn10?: string | null;
    isbn13?: string | null;
  };

  /** Engagement */
  likesCount?: number;
  commentsCount?: number;
  savesCount?: number;
  clubsReading?: string[];  // ✨ Array of club slugs reading this book
  totalClubsCount?: number; // ✨ Counter for clubs reading

  /** Timestamps */
  createdAt?: FirestoreDate;
  updatedAt?: FirestoreDate;
  savedAt?: FirestoreDate;
  publishedAt?: string | number | Date | null;
}

/* ─────────── PostDoc ─────────── */
export interface PostDoc {
  id: string;
  slug: string;
  userId: string;
  userName: string;
  userPhoto?: string | null;
  bookRef?: string | null;
  bookId?: string | null;        // ✨ Reference to book being discussed (book slug)
  content: string;
  imageUrl?: string | null;
  likesCount: number;
  commentsCount: number;
  savesCount: number;
  upvotedBy?: string[];
  isPublic?: boolean;            // ✨ Can appear on book page (default: false)
  tags?: string[];
  visibility: 'public' | 'followers' | 'private';
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
  ownerUid: string;
  creatorName: string;
  membersCount: number;
  memberIds?: string[];
  booksCount: number;
  currentBookId?: string;        // ✨ Currently reading book (book slug)
  pastBookIds?: string[];        // ✨ Past books (array of book slugs)
  isPrivate?: boolean;           // ✨ Privacy setting (default: false)
  allowPublicPosts?: boolean;    // ✨ Allow members to share posts publicly (default: true)
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