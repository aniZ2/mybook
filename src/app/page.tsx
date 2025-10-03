'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <main>
      {/* Hero Section */}
      <section className="grid hero">
        <div className="panel col-12">
          <h1 className="h1">Read. Connect. Belong.</h1>
          <p className="muted">
            Booklyverse is your social reading universe — where readers and 
            authors meet, share, and grow together in a vibrant literary community.
          </p>

          {/* Button row */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-start',
              alignItems: 'center',
              marginTop: '1.5rem',
              gap: '1rem',
            }}
          >
            <Link className="btn-primary btn" href="/discover">
              Start Discovering
            </Link>
            <Link className="btn btn" href="/clubs/new">
              Create a Club
            </Link>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="grid features" style={{ marginTop: '4rem' }}>
        <div className="panel">
          <h2 className="h2">📚 Book Clubs</h2>
          <p className="muted">
            Create or join clubs around genres, authors, or themes. 
            Host discussions, vote on next reads, and chat in real time.
          </p>
        </div>
        <div className="panel">
          <h2 className="h2">👩‍💻 Author Hubs</h2>
          <p className="muted">
            Every author gets a home in Booklyverse. Follow them for Q&amp;A’s, 
            livestream readings, exclusive previews, and more.
          </p>
        </div>
        <div className="panel">
          <h2 className="h2">💸 Curated Deals</h2>
          <p className="muted">
            Hand-picked discounts and BookBub-style promotions, personalized to 
            your taste and delivered daily.
          </p>
        </div>
        <div className="panel">
          <h2 className="h2">🎉 Live Events</h2>
          <p className="muted">
            Join book launches, watch-along sessions, and community meetups. 
            Whether virtual or local, there’s always something happening.
          </p>
        </div>
        <div className="panel">
          <h2 className="h2">🛍️ Marketplace</h2>
          <p className="muted">
            Discover signed editions, merchandise, and limited runs 
            designed for true book lovers.
          </p>
        </div>
        <div className="panel">
          <h2 className="h2">📖 Featured Reads</h2>
          <p className="muted">
            Each week we spotlight trending and critically acclaimed books, 
            so your next favorite is never far away.
          </p>
        </div>
        <div className="panel">
          <h2 className="h2">🔍 Series Tracker</h2>
          <p className="muted">
            Follow book series, track upcoming releases, and get alerts 
            when new installments drop.
          </p>
        </div>
      </section>

      {/* Call to Action */}
      <section className="grid cta" style={{ marginTop: '4rem' }}>
        <div className="panel col-12" style={{ textAlign: 'center' }}>
          <h2 className="h2">Your reading circle awaits.</h2>
          <p className="muted">
            Don’t just read — belong.
          </p>
          <Link
            className="btn-primary btn"
            href="/signup"
            style={{ marginTop: '1rem' }}
          >
            Join Booklyverse Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          marginTop: '4rem',
          padding: '2rem 0',
          textAlign: 'center',
          borderTop: '1px solid var(--border-color, #ddd)',
        }}
      >
        <p className="muted">
          &copy; {new Date().getFullYear()} Booklyverse. All rights reserved.
        </p>
        <p>
          <Link href="/privacy">Privacy Policy</Link> ·{' '}
          <Link href="/terms">Terms of Service</Link>
        </p>
      </footer>
    </main>
  );
}
