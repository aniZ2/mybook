import React from 'react';
import { PostDoc } from './page';
import styles from './DiscoverPage.module.css';

interface Props {
  post: PostDoc;
}

export default function ReaderPostCard({ post }: Props) {
  return (
    <div className={styles.postCard}>
      <p className={styles.postUser}>@{post.userId}</p>
      <p className={styles.postText}>{post.text}</p>
      <p className={styles.postStats}>
        ❤️ {post.likesCount || 0} &nbsp; 💬 {post.commentsCount || 0}
      </p>
    </div>
  );
}
