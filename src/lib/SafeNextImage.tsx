'use client';
import NextImage from 'next/image';

/**
 * Global Safe Image Wrapper:
 * Automatically falls back to <img> for unknown domains.
 */
export default function SafeNextImage(props: any) {
  const { src, alt = '', ...rest } = props;
  const trustedDomains = [
    'books.google.com',
    'books.googleusercontent.com',
    'covers.openlibrary.org',
    'images-na.ssl-images-amazon.com',
    'm.media-amazon.com',
    'firebasestorage.googleapis.com',
    'res.cloudinary.com',
    'lh3.googleusercontent.com',
    'images.isbndb.com',
  ];

  if (!src) return <div style={{ background: '#1e293b', width: rest.width || 120, height: rest.height || 180 }} />;

  try {
    const url = new URL(src);
    if (trustedDomains.some((d) => url.hostname.includes(d))) {
      return <NextImage src={src} alt={alt} {...rest} />;
    }
  } catch {}

  return <img src={src} alt={alt} {...rest} loading="lazy" />;
}
