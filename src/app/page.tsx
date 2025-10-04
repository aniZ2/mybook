'use client';

import Link from "next/link";

export default function Home() {
  return (
    <>
      {/* Hero Section */}
      <section style={{ 
        minHeight: '70vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        textAlign: 'center',
        padding: '4rem 2rem',
        position: 'relative'
      }}>
        <div className="book-glow"></div>
        <div style={{ maxWidth: '800px', position: 'relative', zIndex: 1 }}>
          <h1 className="h1" style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', marginBottom: '1.5rem' }}>
            Read. Connect. Belong.
          </h1>
          <p className="muted" style={{ fontSize: '1.25rem', marginBottom: '2rem', lineHeight: '1.6' }}>
            Booklyverse is your social reading universe — where readers and 
            authors meet, share, and grow together in a vibrant literary community.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link className="btn-primary btn" href="/discover">
              Start Discovering
            </Link>
            <Link className="btn-secondary btn" href="/clubs/new">
              Create a Club
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container" style={{ marginTop: '4rem' }}>
        <div className="grid">
          <div className="panel col-4">
            <h2 className="h2">📚 Book Clubs</h2>
            <p className="muted">Create or join clubs around genres, authors, or themes.</p>
          </div>
          <div className="panel col-4">
            <h2 className="h2">👩‍💻 Author Hubs</h2>
            <p className="muted">Follow authors for Q&As, livestreams, and previews.</p>
          </div>
          <div className="panel col-4">
            <h2 className="h2">💸 Curated Deals</h2>
            <p className="muted">Hand-picked discounts and promotions personalized to you.</p>
          </div>
          <div className="panel col-4">
            <h2 className="h2">🎉 Live Events</h2>
            <p className="muted">Join book launches, watch-alongs, and meetups.</p>
          </div>
          <div className="panel col-4">
            <h2 className="h2">🛍️ Marketplace</h2>
            <p className="muted">Discover signed editions, merchandise, and limited runs.</p>
          </div>
          <div className="panel col-4">
            <h2 className="h2">📖 Featured Reads</h2>
            <p className="muted">Spotlight on trending and acclaimed books weekly.</p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section style={{ 
        padding: '4rem 2rem', 
        background: 'rgba(56, 189, 248, 0.05)',
        margin: '4rem 0'
      }}>
        <div className="container">
          <div className="grid">
            <div className="col-3" style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '3rem', 
                fontWeight: 800, 
                background: 'linear-gradient(135deg, var(--accent), var(--highlight))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>10K+</div>
              <div className="muted">Active Readers</div>
            </div>
            <div className="col-3" style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '3rem', 
                fontWeight: 800,
                background: 'linear-gradient(135deg, var(--accent), var(--highlight))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>500+</div>
              <div className="muted">Book Clubs</div>
            </div>
            <div className="col-3" style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '3rem', 
                fontWeight: 800,
                background: 'linear-gradient(135deg, var(--accent), var(--highlight))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>1K+</div>
              <div className="muted">Authors</div>
            </div>
            <div className="col-3" style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '3rem', 
                fontWeight: 800,
                background: 'linear-gradient(135deg, var(--accent), var(--highlight))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>50K+</div>
              <div className="muted">Books Discussed</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container" style={{ marginTop: '4rem' }}>
        <div className="panel col-12" style={{ 
          textAlign: 'center', 
          padding: '4rem 2rem',
          background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.1), rgba(251, 191, 36, 0.1))'
        }}>
          <h2 className="h1">Your reading circle awaits.</h2>
          <p className="muted" style={{ fontSize: '1.25rem', marginBottom: '2rem' }}>
            Don't just read — belong.
          </p>
          <Link className="btn-primary btn" href="/signup" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem' }}>
            Join Booklyverse Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ 
        marginTop: '4rem', 
        padding: '3rem 2rem', 
        textAlign: 'center', 
        borderTop: '1px solid rgba(255,255,255,0.1)' 
      }}>
        <p className="muted">&copy; {new Date().getFullYear()} Booklyverse. All rights reserved.</p>
        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link href="/privacy" className="link">Privacy Policy</Link>
          <span className="muted">·</span>
          <Link href="/terms" className="link">Terms of Service</Link>
          <span className="muted">·</span>
          <Link href="/contact" className="link">Contact</Link>
        </div>
      </footer>
    </>
  );
}