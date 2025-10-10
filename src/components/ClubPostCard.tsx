'use client';

import React, { useState } from 'react';
import styles from './Club.module.css';
import { Heart, MessageCircle, ChevronUp } from 'lucide-react';

type ClubPost = {
  id: string;
  author: string;
  content: string;
  likes: number;
  comments: number;
  createdAt: string;
};

export default function ClubPostCard({ post }: { post: ClubPost }) {
  const [upvoted, setUpvoted] = useState(false);
  const [likes, setLikes] = useState(post.likes);

  const handleUpvote = () => {
    if (upvoted) {
      setLikes(likes - 1);
    } else {
      setLikes(likes + 1);
    }
    setUpvoted(!upvoted);
  };

  return (
    <article className={styles.card}>
      <div className={styles.cardInner}>
        {/* Upvote Section */}
        <div className={styles.upvoteSection}>
          <button 
            className={`${styles.upvoteBtn} ${upvoted ? styles.upvoted : ''}`}
            onClick={handleUpvote}
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
                {post.author[0].toUpperCase()}
              </div>
              <div className={styles.authorInfo}>
                <h4 className={styles.author}>{post.author}</h4>
                <time className={styles.date}>
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
            <button className={styles.footerBtn}>
              <Heart size={16} />
              <span>{likes} likes</span>
            </button>
            <button className={styles.footerBtn}>
              <MessageCircle size={16} />
              <span>{post.comments} comments</span>
            </button>
          </footer>
        </div>
      </div>
    </article>
  );
}