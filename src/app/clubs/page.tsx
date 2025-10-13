'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import styles from './ClubsPage.module.css';
import { Users, BookOpen, Sparkles, Search, X } from 'lucide-react';

type Club = {
  id: string;
  slug: string;
  name: string;
  description: string;
  iconUrl?: string;
  membersCount?: number;
  booksCount?: number;
  category?: string;
};

export default function ClubsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [filteredClubs, setFilteredClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Initialize search from URL
  useEffect(() => {
    const query = searchParams.get('q');
    if (query) {
      setSearchQuery(query);
    }
  }, [searchParams]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/clubs');
        const data = await res.json();
        setClubs(data.clubs || []);
        setFilteredClubs(data.clubs || []);
      } catch (err) {
        console.error('Error loading clubs:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredClubs(clubs);
      // Clear URL search param
      router.replace('/clubs', { scroll: false });
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = clubs.filter(
      (club) =>
        club.name.toLowerCase().includes(query) ||
        club.description?.toLowerCase().includes(query) ||
        club.category?.toLowerCase().includes(query)
    );
    setFilteredClubs(filtered);

    // Update URL with search param
    router.replace(`/clubs?q=${encodeURIComponent(searchQuery)}`, { scroll: false });
  }, [searchQuery, clubs, router]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setShowSuggestions(value.trim().length > 0);
  };

  const handleSuggestionClick = (club: Club) => {
    setSearchQuery(club.name);
    setShowSuggestions(false);
    // Navigate to club
    router.push(`/clubs/${club.slug}`);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setShowSuggestions(false);
  };

  if (loading) {
    return (
      <main className={styles.page}>
        <h2 style={{ textAlign: 'center', color: '#9ca3af' }}>Loading clubs...</h2>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      {/* Hero Header */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.title}>
            Join A Book Club <Sparkles className={styles.sparkleIcon} />
          </h1>
          <p className={styles.subtitle}>
            Discover passionate communities reading the same books, debating tropes, and celebrating stories together.
          </p>
          <Link href="/clubs/create" className={styles.createBtn}>
            + Create a Club
          </Link>
        </div>
      </section>

      {/* Search Bar */}
      {clubs.length > 0 && (
        <section className={styles.searchSection}>
          <div className={styles.searchWrapper} ref={searchRef}>
            <Search size={20} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search clubs by name, description, or category..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => searchQuery.trim() && setShowSuggestions(true)}
              className={styles.searchInput}
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className={styles.clearBtn}
                aria-label="Clear search"
              >
                <X size={18} />
              </button>
            )}

            {/* Suggestions Dropdown */}
            {showSuggestions && filteredClubs.length > 0 && (
              <div className={styles.suggestionsDropdown}>
                <div className={styles.suggestionsHeader}>
                  {filteredClubs.length} {filteredClubs.length === 1 ? 'result' : 'results'}
                </div>
                {filteredClubs.slice(0, 5).map((club) => (
                  <button
                    key={club.id}
                    className={styles.suggestionItem}
                    onClick={() => handleSuggestionClick(club)}
                  >
                    <Image
                      src={club.iconUrl || '/placeholder.png'}
                      alt={club.name}
                      width={32}
                      height={32}
                      className={styles.suggestionIcon}
                    />
                    <div className={styles.suggestionContent}>
                      <div className={styles.suggestionName}>{club.name}</div>
                      <div className={styles.suggestionMeta}>
                        {club.membersCount ?? 0} members • {club.booksCount ?? 0} books
                      </div>
                    </div>
                  </button>
                ))}
                {filteredClubs.length > 5 && (
                  <div className={styles.suggestionsFooter}>
                    +{filteredClubs.length - 5} more clubs
                  </div>
                )}
              </div>
            )}
          </div>
          <p className={styles.resultsCount}>
            {filteredClubs.length} {filteredClubs.length === 1 ? 'club' : 'clubs'} found
          </p>
        </section>
      )}

      {/* Clubs Grid */}
      <section className={styles.gridSection}>
        {clubs.length === 0 ? (
          <p style={{ color: '#94a3b8', textAlign: 'center' }}>
            No clubs found. <Link href="/clubs/create">Start one today!</Link>
          </p>
        ) : filteredClubs.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
            <p>No clubs match "{searchQuery}"</p>
            <button 
              onClick={clearSearch}
              style={{ 
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                background: 'rgba(59, 130, 246, 0.2)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '8px',
                color: '#60a5fa',
                cursor: 'pointer'
              }}
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className={styles.grid}>
            {filteredClubs.map((club) => (
              <Link
                key={club.id}
                href={`/clubs/${club.slug}`}
                className={styles.clubCard}
              >
                <div className={styles.cardHeader}>
                  <Image
                    src={club.iconUrl || '/placeholder.png'}
                    alt={club.name}
                    width={60}
                    height={60}
                    className={styles.clubIcon}
                  />
                  <div>
                    <h3 className={styles.clubName}>{club.name}</h3>
                    <p className={styles.clubDescription}>
                      {club.description?.slice(0, 90) || 'A community of readers and dreamers.'}
                    </p>
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <span><Users size={15} /> {club.membersCount ?? 0} members</span>
                  <span><BookOpen size={15} /> {club.booksCount ?? 0} books</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}