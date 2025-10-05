import React from 'react';
import { AuthorDoc } from '@/types/firestore';
import styles from './DiscoverPage.module.css';

interface Props {
  author: AuthorDoc;
}

export default function AuthorCard({ author }: Props) {
  return (
    <div className={styles.authorCard}>
      {author.photoUrl && (
        <img src={author.photoUrl} alt={author.name} className={styles.authorPic} />
      )}
      <h4>{author.name}</h4>
      <p className={styles.followers}>👥 {author.followersCount} followers</p>
    </div>
  );
}
