'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthProvider';
import styles from './Club.module.css';
import { MessageCircle, ChevronUp, Send, X } from 'lucide-react';

type ClubPost = {
  id: string;
  slug: string;
  clubSlug: string;
  userName: string;
  content: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  hasUpvoted?: boolean;
};

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string | null;
  content: string;
  createdAt: string;
}

export default function ClubPostCard({ post }: { post: ClubPost }) {
  const { user } = useAuth();
  const [upvoted, setUpvoted] = useState(post.hasUpvoted || false);
  const [likes, setLikes] = useState(post.likesCount);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount);

  const loadComments = async () => {
    if (comments.length > 0) return; // Already loaded

    setLoading(true);
    try {
      const headers: HeadersInit = {};
      if (user) {
        const token = await (user as any).getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(
        `/api/clubs/${post.clubSlug}/posts/${post.slug}/comments`,
        { headers }
      );

      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleComments = async () => {
    if (!showComments) {
      await loadComments();
    }
    setShowComments(!showComments);
  };

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
      const token = await (user as any).getIdToken();
      
      const response = await fetch(
        `/api/clubs/${post.clubSlug}/posts/${post.slug}/upvote`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ upvoted: newUpvoted }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to upvote');
      }
    } catch (error) {
      // Revert on error
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
      const token = await (user as any).getIdToken();
      
      const response = await fetch(
        `/api/clubs/${post.clubSlug}/posts/${post.slug}/comments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
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
      setCommentsCount(commentsCount + 1);
    } catch (error) {
      console.error('Error posting comment:', error);
      alert(error instanceof Error ? error.message : 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <article className={styles.card}>
      <div className={styles.cardInner}>
        {/* Upvote Section */}
        <div className={styles.upvoteSection}>
          <button 
            className={`${styles.upvoteBtn} ${upvoted ? styles.upvoted : ''}`}
            onClick={handleUpvote}
            aria-label={upvoted ? 'Remove upvote' : 'Upvote post'}
          >
            <ChevronUp size={20} />
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
                <time 
                  className={styles.date}
                  dateTime={post.createdAt}
                >
                  {new Date(post.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </time>
              </div>
            </div>
          </header>
          
          <p className={styles.content}>{post.content}</p>
          
          <footer className={styles.footer}>
            <span className={styles.likesDisplay}>{likes} upvotes</span>
            <button 
              className={styles.footerBtn}
              onClick={toggleComments}
              aria-label="View comments"
            >
              <MessageCircle size={16} />
              <span>{commentsCount} comments</span>
            </button>
          </footer>

          {/* Expanded Comments Section */}
          {showComments && (
            <div className={styles.commentsExpanded}>
              <div className={styles.commentsHeader}>
                <h4>Comments ({comments.length})</h4>
                <button
                  className={styles.closeBtn}
                  onClick={() => setShowComments(false)}
                  aria-label="Close comments"
                >
                  <X size={18} />
                </button>
              </div>

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
                      rows={2}
                      disabled={submitting}
                    />
                  </div>
                  <button
                    type="submit"
                    className={styles.submitBtn}
                    disabled={!commentText.trim() || submitting}
                  >
                    <Send size={14} />
                    {submitting ? 'Posting...' : 'Post'}
                  </button>
                </form>
              ) : (
                <p className={styles.signInPrompt}>Sign in to comment</p>
              )}

              {/* Comments List */}
              {loading ? (
                <p className={styles.loading}>Loading comments...</p>
              ) : (
                <div className={styles.commentsList}>
                  {comments.length === 0 ? (
                    <p className={styles.noComments}>No comments yet. Be the first! 💬</p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className={styles.comment}>
                        <div className={styles.commentAvatar}>
                          {comment.userName?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className={styles.commentBody}>
                          <div className={styles.commentHeader}>
                            <span className={styles.commentAuthor}>
                              {comment.userName || 'Anonymous'}
                            </span>
                            <time className={styles.commentDate}>
                              {new Date(comment.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </time>
                          </div>
                          <p className={styles.commentContent}>{comment.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}