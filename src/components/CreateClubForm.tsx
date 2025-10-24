'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getDbOrThrow, getStorageOrThrow } from '@/lib/firebase';
import { useAuth } from '@/context/AuthProvider';
import { updateClubCache } from '@/app/actions/clubActions'; // 👈 ADD THIS
import type { ClubDoc } from '@/types/firestore';

const CATEGORIES: ClubDoc['category'][] = [
  'fiction',
  'non-fiction',
  'mystery',
  'romance',
  'sci-fi',
  'fantasy',
  'biography',
  'general',
];

const CATEGORY_LABELS: Record<ClubDoc['category'], string> = {
  fiction: 'Fiction',
  'non-fiction': 'Non-Fiction',
  mystery: 'Mystery',
  romance: 'Romance',
  'sci-fi': 'Sci-Fi',
  fantasy: 'Fantasy',
  biography: 'Biography',
  general: 'General',
};

export default function CreateClubForm() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'general' as ClubDoc['category'],
    isPublic: true,
    tags: '',
  });

  const [iconImage, setIconImage] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=/clubs/create');
    }
  }, [user, loading, router]);

  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIconImage(file);
      setIconPreview(URL.createObjectURL(file));
    }
  };

  const generateSlug = (name: string): string =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const uploadImage = async (file: File, path: string): Promise<string> => {
    try {
      const storage = getStorageOrThrow();
      const storageRef = ref(storage, path);
      
      console.log('📤 Uploading to:', path);
      const snapshot = await uploadBytes(storageRef, file);
      console.log('✅ Upload successful:', snapshot.metadata.fullPath);
      
      const downloadUrl = await getDownloadURL(storageRef);
      console.log('🔗 Download URL:', downloadUrl);
      
      return downloadUrl;
    } catch (err) {
      console.error('❌ Upload failed:', err);
      throw new Error(`Failed to upload image: ${err}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return setError('You must be logged in to create a club');
    if (!formData.name.trim()) return setError('Club name is required');
    if (!formData.description.trim()) return setError('Description is required');

    setSubmitting(true);
    setError(null);

    try {
      const db = getDbOrThrow();
      const slug = generateSlug(formData.name);

      let iconUrl: string | null = null;

      if (iconImage) {
        iconUrl = await uploadImage(iconImage, `clubs/${slug}/icon-${Date.now()}.jpg`);
      }

      const tags = formData.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const clubData: Partial<ClubDoc> = {
        name: formData.name.trim(),
        slug,
        description: formData.description.trim(),
        category: formData.category,
        isPublic: formData.isPublic,
        iconUrl,
        ownerUid: user.uid,
        creatorName: user.displayName || 'Anonymous',
        membersCount: 1,
        booksCount: 0,
        memberIds: [user.uid],
        tags: tags.length > 0 ? tags : undefined,
        theme: { primary: '#3B82F6', secondary: '#8B5CF6' },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // 1. Create club document
      await setDoc(doc(db, 'clubs', slug), clubData);
      
      // 2. Create member document
      await setDoc(doc(db, 'clubs', slug, 'members', user.uid), {
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        userPhoto: user.photoURL || null,
        role: 'admin',
        joinedAt: serverTimestamp(),
      });

      console.log('✅ Club created:', slug);

      // 3. Update cache 👈 ADD THIS
      try {
        await updateClubCache(slug);
        console.log('✅ Cache updated - new club visible on clubs page!');
      } catch (cacheErr) {
        console.error('⚠️ Cache update failed (non-critical):', cacheErr);
        // Don't fail the whole operation if cache update fails
      }

      router.push(`/clubs/${slug}`);
    } catch (err) {
      console.error('❌ Failed to create club:', err);
      setError(err instanceof Error ? err.message : 'Failed to create club. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="panel p-12 text-center">
        <p className="muted">Loading...</p>
      </div>
    );

  if (!user) return null;

  return (
    <form onSubmit={handleSubmit} className="form-sections">
      <h1 className="h1 text-center mb-6">Create a Book Club</h1>
      <p className="muted text-center mb-10">
        Start your own community and connect with readers who share your interests.
      </p>

      {error && (
        <div className="panel bg-red-50 border border-red-200 p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Club Icon */}
      <div className="panel p-6">
        <label className="label">Club Icon (Optional)</label>
        {iconPreview ? (
          <div className="flex items-center gap-4 mt-3">
            <div style={{ position: 'relative', width: '80px', height: '80px' }} className="rounded-full overflow-hidden">
              <img src={iconPreview} alt="Icon preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <button
              type="button"
              onClick={() => {
                setIconImage(null);
                setIconPreview(null);
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
            >
              Remove
            </button>
          </div>
        ) : (
          <input type="file" accept="image/*" onChange={handleIconChange} className="mt-3" />
        )}
      </div>

      {/* Form fields */}
      <div className="panel p-6">
        <label className="label">Club Name *</label>
        <input
          type="text"
          className="input"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          maxLength={100}
        />
      </div>

      <div className="panel p-6">
        <label className="label">Description *</label>
        <textarea
          className="input"
          rows={4}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
          maxLength={500}
        />
      </div>

      <div className="panel p-6">
        <label className="label">Category *</label>
        <select
          className="input"
          value={formData.category}
          onChange={(e) =>
            setFormData({ ...formData, category: e.target.value as ClubDoc['category'] })
          }
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </div>

      <div className="panel p-6">
        <label className="label">Tags (comma-separated)</label>
        <input
          className="input"
          type="text"
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          placeholder="e.g., thriller, sci-fi, suspense"
        />
      </div>

      <div className="panel p-6">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.isPublic}
            onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
          />
          <span>Make this club public</span>
        </label>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '24px', width: '100%' }}>
        <button 
          type="submit" 
          className="btn btn-primary" 
          disabled={submitting}
          style={{ minWidth: '140px', maxWidth: '200px', padding: '8px 32px' }}
        >
          {submitting ? 'Creating Club…' : 'Create Club'}
        </button>
        <button 
          type="button" 
          onClick={() => router.back()} 
          className="btn"
          style={{ minWidth: '140px', maxWidth: '200px', padding: '8px 32px' }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}