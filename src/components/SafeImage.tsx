'use client';

import Image from 'next/image';

interface SafeImageProps {
  src?: string | null;
  alt?: string;
  width?: number;
  height?: number;
  className?: string;
  [key: string]: any;
}

/**
 * Renders <Image> for trusted domains and falls back to <img> for others.
 * Prevents Next.js from throwing "unconfigured host" build/runtime errors.
 */
export default function SafeImage({
  src,
  alt = '',
  width = 120,
  height = 180,
  className = '',
  ...props
}: SafeImageProps) {
  if (!src) {
    return (
      <div
        style={{
          width,
          height,
          background: '#1e293b',
          color: '#94a3b8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '.8rem',
          borderRadius: 6,
        }}
      >
        No Image
      </div>
    );
  }

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

  try {
    const url = new URL(src);
    const isTrusted = trustedDomains.some((d) => url.hostname.includes(d));

    if (isTrusted) {
      return (
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className={className}
          {...props}
        />
      );
    }
  } catch {
    // ignore invalid URLs
  }

  // fallback for unknown domains
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading="lazy"
      {...props}
    />
  );
}
