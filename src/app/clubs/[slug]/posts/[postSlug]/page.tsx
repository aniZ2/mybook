'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthProvider';
import { ArrowLeft, ChevronUp, MessageCircle, Send } from 'lucide-react';
import styles from './PostPage.module.css';

interface Post {
  id: string;
  slug: string;
  clubSlug: string;
  userName: string;
  userPhoto?: string | null;
  content: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  hasUpvoted?: boolean;
}

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string | null;
  content: string;
  createdAt: string;
}

export default function PostDetailPage({
  params,
}: {
  params: { slug: string; postSlug: string };
}) {
  const { slug: clubSlug, postSlug } = params;
  const { user } = useAuth();
  const router = useRouter();
  
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [upvoted, setUpvoted] = useState(false);
  const [likes, setLikes] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch post and comments
  useEffect(() => {
    (async () => {
      try {
        const headers: HeadersInit = {};
        if (user) {
          const token = await (user as any).getIdToken();
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(`/api/clubs/${clubSlug}/posts/${postSlug}`, {
          headers,
        });

        if (!res.ok) throw new Error('Post not found');
        
        const data = await res.json();
        setPost(data.post);
        setComments(data.comments || []);
        setUpvoted(data.post.hasUpvoted || false);
        setLikes(data.post.likesCount || 0);
      } catch (err) {
        console.error('Error fetching post:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [clubSlug, postSlug, user]);

  const handleUpvote = async () => {
    if (!user) {
      alert('Please sign in to upvote');
      return;
    }

    const newUpvoted = !upvoted;
    const newLikes = newUpvoted ? likes + 1 : likes - 1;

    // Optimistic update
    setUpvoted(newUpvoted);
    setLikes(newLikes);

    try {
      // ✅ Get the Firebase ID token
      const token = await (user as any).getIdToken();
      
      const response = await fetch(
        `/api/clubs/${clubSlug}/posts/${postSlug}/upvote`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`, // ✅ Added Authorization header
          },
          body: JSON.stringify({ upvoted: newUpvoted }),
        }
      );

      if (!response.ok) throw new Error('Failed to upvote');
    } catch (error) {
      // Revert optimistic update on error
      setUpvoted(!newUpvoted);
      setLikes(newUpvoted ? newLikes - 1 : newLikes + 1);
      console.error('Error upvoting:', error);
      alert('Failed to upvote. Please try again.');
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      alert('Please sign in to comment');
      return;
    }

    if (!commentText.trim()) return;

    setSubmitting(true);

    try {
      // ✅ Get the Firebase ID token
      const token = await (user as any).getIdToken();
      
      const response = await fetch(
        `/api/clubs/${clubSlug}/posts/${postSlug}/comments`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`, // ✅ Added Authorization header
          },
          body: JSON.stringify({ content: commentText.trim() }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to post comment');
      }

      const data = await response.json();
      setComments([...comments, data.comment]);
      setCommentText('');
      
      // Update comment count
      if (post) {
        setPost({ ...post, commentsCount: post.commentsCount + 1 });
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      alert(error instanceof Error ? error.message : 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className={styles.container}>
        <p>Loading post...</p>
      </main>
    );
  }

  if (!post) {
    return (
      <main className={styles.container}>
        <h1>Post not found</h1>
        <button onClick={() => router.back()}>Go Back</button>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      {/* Back Button */}
      <button className={styles.backBtn} onClick={() => router.back()}>
        <ArrowLeft size={20} />
        Back to Club
      </button>

      {/* Post Card */}
      <article className={styles.postCard}>
        <div className={styles.postInner}>
          {/* Upvote Section */}
          <div className={styles.upvoteSection}>
            <button
              className={`${styles.upvoteBtn} ${upvoted ? styles.upvoted : ''}`}
              onClick={handleUpvote}
              aria-label={upvoted ? 'Remove upvote' : 'Upvote post'}
            >
              <ChevronUp size={24} />
            </button>
            <span className={styles.upvoteCount}>{likes}</span>
          </div>

          {/* Post Content */}
          <div className={styles.postContent}>
            <header className={styles.header}>
              <div className={styles.authorSection}>
                <div className={styles.authorAvatar}>
                  {post.userName?.[0]?.toUpperCase() || '?'}
                </div>
                <div className={styles.authorInfo}>
                  <h4 className={styles.author}>{post.userName || 'Anonymous'}</h4>
                  <time className={styles.date} dateTime={post.createdAt}>
                    {new Date(post.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </time>
                </div>
              </div>
            </header>

            <p className={styles.content}>{post.content}</p>

            <footer className={styles.footer}>
              <span className={styles.stat}>
                <MessageCircle size={16} />
                {post.commentsCount} comments
              </span>
            </footer>
          </div>
        </div>
      </article>

      {/* Comment Form */}
      {user ? (
        <form className={styles.commentForm} onSubmit={handleSubmitComment}>
          <div className={styles.commentInputWrapper}>
            <div className={styles.userAvatar}>
              {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
            </div>
            <textarea
              className={styles.commentInput}
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={3}
              disabled={submitting}
            />
          </div>
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={!commentText.trim() || submitting}
          >
            <Send size={16} />
            {submitting ? 'Posting...' : 'Post Comment'}
          </button>
        </form>
      ) : (
        <div className={styles.signInPrompt}>
          <p>Sign in to leave a comment</p>
        </div>
      )}

      {/* Comments List */}
      <section className={styles.commentsSection}>
        <h3 className={styles.commentsHeader}>
          Comments ({comments.length})
        </h3>

        {comments.length === 0 ? (
          <p className={styles.noComments}>
            No comments yet. Be the first to comment! 💬
          </p>
        ) : (
          <div className={styles.commentsList}>
            {comments.map((comment) => (
              <div key={comment.id} className={styles.comment}>
                <div className={styles.commentAvatar}>
                  {comment.userName?.[0]?.toUpperCase() || '?'}
                </div>
                <div className={styles.commentBody}>
                  <div className={styles.commentHeader}>
                    <span className={styles.commentAuthor}>
                      {comment.userName || 'Anonymous'}
                    </span>
                    <time className={styles.commentDate} dateTime={comment.createdAt}>
                      {new Date(comment.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </time>
                  </div>
                  <p className={styles.commentContent}>{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}