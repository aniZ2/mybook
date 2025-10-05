// types/converters.ts
import {
  FirestoreDataConverter,
  Timestamp,
  serverTimestamp,
  QueryDocumentSnapshot,
  SnapshotOptions,
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
function createConverter<T extends object>(
  defaults: Partial<T> = {}
): FirestoreDataConverter<T> {
  return {
    toFirestore(data: T) {
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
