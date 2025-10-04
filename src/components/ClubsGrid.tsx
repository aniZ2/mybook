'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { collection, getDocs, orderBy, query, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { clubConverter, type ClubDoc } from '@/types/firestore';

const CATEGORY_LABELS: Record<ClubDoc['category'], string> = {
  'fiction': 'Fiction',
  'non-fiction': 'Non-Fiction',
  'mystery': 'Mystery',
  'romance': 'Romance',
  'sci-fi': 'Sci-Fi',
  'fantasy': 'Fantasy',
  'biography': 'Biography',
  'general': 'General',
};

export default function ClubsGrid() {
  const [clubs, setClubs] = useState<ClubDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ClubDoc['category'] | 'all'>('all');
  const [sortBy, setSortBy] = useState<'members' | 'recent' | 'name'>('members');

  useEffect(() => {
    async function loadClubs() {
      try {
        const ref = collection(db, 'clubs').withConverter(clubConverter);
        const q = query(ref, orderBy('membersCount', 'desc'), limit(100));
        const snap = await getDocs(q);
        setClubs(snap.docs.map((d) => d.data()));
      } catch (err) {
        console.error('❌ Failed to fetch clubs:', err);
      } finally {
        setLoading(false);
      }
    }
    loadClubs();
  }, []);

  const filteredAndSortedClubs = useMemo(() => {
    let filtered = clubs;

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((c) => c.category === categoryFilter);
    }

    // Search filter
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(lower) ||
          c.description.toLowerCase().includes(lower) ||
          c.tags?.some((tag) => tag.toLowerCase().includes(lower))
      );
    }

    // Only show public clubs
    filtered = filtered.filter((c) => c.isPublic);

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'members') {
        return b.membersCount - a.membersCount;
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      // recent
      return 0; // Would need timestamp comparison
    });

    return sorted;
  }, [clubs, searchTerm, categoryFilter, sortBy]);

  if (loading) {
    return <ClubsLoadingSkeleton />;
  }

  return (
    <div>
      {/* Filters */}
      <div className="space-y-4 mb-8">
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="search"
            placeholder="Search clubs by name, description, or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="members">Most Members</option>
            <option value="recent">Recently Active</option>
            <option value="name">Alphabetical</option>
          </select>
        </div>

        {/* Category Chips */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              categoryFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Categories
          </button>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setCategoryFilter(key as ClubDoc['category'])}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                categoryFilter === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <div className="mb-4 text-sm muted">
        {filteredAndSortedClubs.length} {filteredAndSortedClubs.length === 1 ? 'club' : 'clubs'}
        {searchTerm && ` matching "${searchTerm}"`}
        {categoryFilter !== 'all' && ` in ${CATEGORY_LABELS[categoryFilter]}`}
      </div>

      {/* Clubs Grid */}
      {filteredAndSortedClubs.length === 0 ? (
        <div className="panel text-center py-12">
          <p className="muted text-lg mb-2">No clubs found</p>
          <p className="text-sm text-gray-500">Try adjusting your filters or search terms</p>
          {(searchTerm || categoryFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setCategoryFilter('all');
              }}
              className="mt-4 text-blue-600 hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedClubs.map((club) => (
            <Link
              key={club.slug}
              href={`/clubs/${club.slug}`}
              className="panel overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
            >
              {/* Cover Image */}
              <div className="relative h-32 bg-gradient-to-br from-blue-400 to-purple-500">
                {club.coverUrl ? (
                  <Image
                    src={club.coverUrl}
                    alt={club.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-white text-4xl font-bold">
                    {club.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Club Info */}
              <div className="p-6">
                <div className="flex items-start gap-3 mb-3">
                  {/* Club Icon */}
                  <div className="relative -mt-8">
                    {club.iconUrl ? (
                      <Image
                        src={club.iconUrl}
                        alt={club.name}
                        width={48}
                        height={48}
                        className="rounded-full ring-4 ring-white object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full ring-4 ring-white bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                        {club.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg line-clamp-1">{club.name}</h3>
                    <p className="text-sm text-gray-500">
                      {CATEGORY_LABELS[club.category]}
                    </p>
                  </div>
                </div>

                <p className="text-sm muted line-clamp-2 mb-4">
                  {club.description}
                </p>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm muted">
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span>{club.membersCount.toLocaleString()} members</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span>{club.booksCount} books</span>
                  </div>
                </div>

                {/* Tags */}
                {club.tags && club.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {club.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function ClubsLoadingSkeleton() {
  return (
    <div>
      <div className="space-y-4 mb-8">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 h-10 bg-gray-200 rounded-lg animate-pulse" />
          <div className="w-40 h-10 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        <div className="flex gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-24 h-10 bg-gray-200 rounded-full animate-pulse" />
          ))}
        </div>
      </div>
      
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="panel overflow-hidden animate-pulse">
            <div className="h-32 bg-gray-200" />
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
              <div className="h-16 bg-gray-200 rounded mb-4" />
              <div className="flex gap-4">
                <div className="h-4 bg-gray-200 rounded w-20" />
                <div className="h-4 bg-gray-200 rounded w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}