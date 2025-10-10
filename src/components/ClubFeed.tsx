'use client';

import React from 'react';
import ClubPostCard from './ClubPostCard';
import styles from './Club.module.css';

export default function ClubFeed({ posts }: { posts: any[] }) {
  if (!posts?.length) {
    return (
      <div className={styles.feed}>
        <p className={styles.empty}>
          No posts yet. Be the first to share something! ✨
        </p>
      </div>
    );
  }

  return (
    <section className={styles.feed}>
      {posts.map((post) => (
        <ClubPostCard key={post.id} post={post} />
      ))}
    </section>
  );
}