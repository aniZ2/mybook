/* ─────────── Imports ─────────── */
import {
  FirestoreDataConverter,
  Timestamp,
  serverTimestamp,
  QueryDocumentSnapshot,
  SnapshotOptions,
  WithFieldValue,
} from 'firebase/firestore';

import type {
  UserDoc,
  AuthorDoc,
  BookDoc,
  PostDoc,
  ReviewDoc,
  ClubDoc,
  ClubMemberDoc,
} from './firestore';

/* ─────────── Generic Converter Factory ─────────── */
/**
 * Creates a reusable Firestore data converter that:
 *  - Applies default values on read/write
 *  - Auto-adds createdAt / updatedAt timestamps
 *  - Automatically injects `id` from snapshot.id
 *  - Accepts WithFieldValue<T> to support serverTimestamp() etc.
 */
function createConverter<T extends object>(
  defaults: Partial<T> = {}
): FirestoreDataConverter<T | WithFieldValue<T>> {
  return {
    toFirestore(data: T) {
      // Allow FieldValue entries (e.g., serverTimestamp())
      return {
        ...defaults,
        ...data,
        createdAt: (data as any).createdAt ?? Timestamp.now(),
        updatedAt: serverTimestamp(),
      };
    },
    fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): T {
      const d = snapshot.data(options) || {};
      return { id: snapshot.id, ...defaults, ...d } as T;
    },
  };
}

/* ─────────── User Converter ─────────── */
export const userConverter = createConverter<UserDoc>({
  role: 'reader',
  isAuthor: false,
  authorId: null,
  slug: null,
  displayName: null,
  profileComplete: false,
  photoURL: null,
});

/* ─────────── Author Converter ─────────── */
export const authorConverter = createConverter<AuthorDoc>({
  about: '',
  photoUrl: null,
  followersCount: 0,
  theme: { bg: '#000', fg: '#fff', accent: '#fbbf24', coverUrl: null },
  nav: [],
});

/* ─────────── Book Converter ─────────── */
export const bookConverter = createConverter<BookDoc>({
  authors: [],
  authorId: null,
  buyLink: null,
  previewLink: null,
  coverUrl: null,
  description: null,
  tags: [],
  publishedAt: null,
  meta: {},
  likesCount: 0,
  commentsCount: 0,
  savesCount: 0,
});

/* ─────────── Post Converter ─────────── */
export const postConverter = createConverter<PostDoc>({
  userPhoto: null,
  bookRef: null,
  imageUrl: null,
  likesCount: 0,
  commentsCount: 0,
  savesCount: 0,
  tags: [],
  visibility: 'public',
});

/* ─────────── Review Converter ─────────── */
export const reviewConverter = createConverter<ReviewDoc>({
  rating: 0,
  text: '',
});

/* ─────────── Club Converter ─────────── */
export const clubConverter = createConverter<ClubDoc>({
  coverUrl: null,
  iconUrl: null,
  membersCount: 0,
  booksCount: 0,
  isPublic: true,
  tags: [],
  theme: { primary: '#000', secondary: '#fff' },
});

/* ─────────── Club Member Converter ─────────── */
export const clubMemberConverter = createConverter<ClubMemberDoc>({
  role: 'member',
  userPhoto: null,
});

/* ─────────── Utility Export (optional) ─────────── */
export { createConverter };
