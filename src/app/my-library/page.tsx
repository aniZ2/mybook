// app/my-library/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthProvider'

interface BookItem {
  id: string
  title: string
  authors: string[]
  savedAt?: any
  coverUrl?: string
}

export default function MyLibrary() {
  const { user } = useAuth()
  const [books, setBooks] = useState<BookItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const fetchLibrary = async () => {
      try {
        // Get user's ID token
        const idToken = await user.getIdToken();

        // Fetch from API (uses cache)
        const response = await fetch('/api/library', {
          headers: {
            'Authorization': `Bearer ${idToken}`,
          },
        })
        
        if (!response.ok) {
          throw new Error('Failed to fetch library')
        }

        const data = await response.json()
        setBooks(data.books || [])
        console.log('📚 Loaded library:', data.books?.length, 'books')
      } catch (err) {
        console.error('Error loading library:', err)
        setError('Failed to load library')
      } finally {
        setLoading(false)
      }
    }

    fetchLibrary()
  }, [user])

  if (!user) {
    return (
      <main className="grid">
        <h1 className="h1">My Library</h1>
        <div className="panel">
          <p className="muted">Please sign in to view your library.</p>
        </div>
      </main>
    )
  }

  if (loading) {
    return (
      <main className="grid">
        <h1 className="h1">My Library</h1>
        <div className="panel">
          <p className="muted">Loading your library...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="grid">
        <h1 className="h1">My Library</h1>
        <div className="panel">
          <p className="muted">{error}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="grid">
      <h1 className="h1">My Library</h1>
      {books.length === 0 ? (
        <div className="panel">
          <p className="muted">No books in your library yet.</p>
        </div>
      ) : (
        books.map(b => (
          <div key={b.id} className="panel col-6">
            {b.coverUrl && (
              <img 
                src={b.coverUrl} 
                alt={b.title}
                style={{ width: '100px', height: '150px', objectFit: 'cover' }}
              />
            )}
            <strong>{b.title}</strong>
            <div className="muted">{b.authors?.join(', ') || 'Unknown author'}</div>
          </div>
        ))
      )}
    </main>
  )
}