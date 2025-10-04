'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { collection, getDocs, orderBy, query, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { authorConverter, type AuthorDoc } from '@/types/firestore';

export default function AuthorsGrid() {
  const [authors, setAuthors] = useState<AuthorDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'followers' | 'name'>('followers');

  useEffect(() => {
    async function loadAuthors() {
      try {
        const ref = collection(db, 'authors').withConverter(authorConverter);
        const q = query(ref, orderBy('followersCount', 'desc'), limit(100));
        const snap = await getDocs(q);
        setAuthors(snap.docs.map((d) => d.data()));
      } catch (err) {
        console.error('❌ Failed to fetch authors:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAuthors();
  }, []);

  const filteredAndSortedAuthors = useMemo(() => {
    let filtered = authors;

    // Search filter
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = authors.filter(
        (a) =>
          a.name.toLowerCase().includes(lower) ||
          a.handle.toLowerCase().includes(lower) ||
          a.about.toLowerCase().includes(lower)
      );
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'followers') {
        return b.followersCount - a.followersCount;
      }
      return a.name.localeCompare(b.name);
    });

    return sorted;
  }, [authors, searchTerm, sortBy]);

  if (loading) {
    return <AuthorsLoadingSkeleton />;
  }

  return (
    <div>
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="flex-1">
          <input
            type="search"
            placeholder="Search authors by name, handle, or bio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'followers' | 'name')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="followers">Most Followers</option>
          <option value="name">Alphabetical</option>
        </select>
      </div>

      {/* Results count */}
      <div className="mb-4 text-sm muted">
        {filteredAndSortedAuthors.length} {filteredAndSortedAuthors.length === 1 ? 'author' : 'authors'}
        {searchTerm && ` matching "${searchTerm}"`}
      </div>

      {/* Authors Grid */}
      {filteredAndSortedAuthors.length === 0 ? (
        <div className="panel text-center py-12">
          <p className="muted text-lg">No authors found</p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="mt-4 text-blue-600 hover:underline"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredAndSortedAuthors.map((author) => (
            <Link
              key={author.slug}
              href={`/authors/${author.slug}`}
              className="panel hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
            >
              <div className="flex flex-col items-center text-center p-6">
                {/* Profile Image */}
                <div className="relative">
                  {author.photoUrl ? (
                    <Image
                      src={author.photoUrl}
                      alt={author.name}
                      width={120}
                      height={120}
                      className="rounded-full object-cover ring-4 ring-gray-100"
                    />
                  ) : (
                    <div className="w-[120px] h-[120px] rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-4xl font-bold">
                      {author.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Author Info */}
                <h2 className="h2 mt-4 line-clamp-1">{author.name}</h2>
                
                {author.handle && (
                  <p className="text-sm text-gray-500 mt-1">@{author.handle}</p>
                )}
                
                {author.about && (
                  <p className="muted text-sm mt-3 line-clamp-3">
                    {author.about}
                  </p>
                )}
                
                {/* Stats */}
                <div className="mt-auto pt-4 text-sm muted">
                  <span className="font-semibold text-gray-900">
                    {author.followersCount.toLocaleString()}
                  </span>
                  {' '}
                  {author.followersCount === 1 ? 'Follower' : 'Followers'}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function AuthorsLoadingSkeleton() {
  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="flex-1 h-10 bg-gray-200 rounded-lg animate-pulse" />
        <div className="w-40 h-10 bg-gray-200 rounded-lg animate-pulse" />
      </div>
      
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="panel animate-pulse">
            <div className="flex flex-col items-center text-center p-6">
              <div className="w-[120px] h-[120px] bg-gray-200 rounded-full" />
              <div className="w-32 h-6 bg-gray-200 rounded mt-4" />
              <div className="w-24 h-4 bg-gray-200 rounded mt-2" />
              <div className="w-full h-16 bg-gray-200 rounded mt-3" />
              <div className="w-20 h-4 bg-gray-200 rounded mt-4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}