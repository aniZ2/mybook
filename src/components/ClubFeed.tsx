'use client';

import React from 'react';
import ClubPostCard from './ClubPostCard';
import styles from './Club.module.css';

export default function ClubFeed({ posts }: { posts: any[] }) {
  // Debug logging
  console.log('🔍 ClubFeed received posts:', posts);
  console.log('🔍 Posts length:', posts?.length);
  console.log('🔍 Posts type:', typeof posts, Array.isArray(posts));

  if (!posts) {
    console.error('❌ Posts is null or undefined');
    return (
      <div className={styles.feed}>
        <p className={styles.empty}>
          Error: No posts data received
        </p>
      </div>
    );
  }

  if (!Array.isArray(posts)) {
    console.error('❌ Posts is not an array:', posts);
    return (
      <div className={styles.feed}>
        <p className={styles.empty}>
          Error: Invalid posts data format
        </p>
      </div>
    );
  }

  if (posts.length === 0) {
    console.log('ℹ️ Posts array is empty');
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
      {posts.map((post, index) => {
        console.log(`🔍 Rendering post ${index}:`, post);
        
        // Validate post data
        if (!post) {
          console.error(`❌ Post at index ${index} is null/undefined`);
          return null;
        }

        if (!post.id) {
          console.error(`❌ Post at index ${index} missing ID:`, post);
          return null;
        }

        if (!post.clubSlug) {
          console.error(`❌ Post ${post.id} missing clubSlug:`, post);
        }

        if (!post.slug) {
          console.error(`❌ Post ${post.id} missing slug:`, post);
        }

        try {
          return <ClubPostCard key={post.id} post={post} />;
        } catch (error) {
          console.error(`❌ Error rendering post ${post.id}:`, error);
          return null;
        }
      })}
    </section>
  );
}