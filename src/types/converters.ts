import { FirestoreDataConverter, Timestamp, serverTimestamp } from 'firebase/firestore';
import type { UserDoc } from './firestore';

export const userConverter: FirestoreDataConverter<UserDoc> = {
  toFirestore(data: UserDoc) {
    return {
      ...data,
      createdAt: data.createdAt ?? Timestamp.now(),
      updatedAt: serverTimestamp(),   // ✅ FIXED
    };
  },
  fromFirestore(snapshot) {
    const d = snapshot.data();
    return {
      role: d.role ?? 'reader',
      isAuthor: d.isAuthor ?? false,
      authorId: d.authorId ?? null,
      slug: d.slug ?? null,
      displayName: d.displayName ?? null,
      profileComplete: d.profileComplete ?? false,
      photoURL: d.photoURL ?? null,
      createdAt: d.createdAt ?? null,
      updatedAt: d.updatedAt ?? null,
    } as UserDoc;
  },
};
