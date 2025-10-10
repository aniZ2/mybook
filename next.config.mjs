/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'covers.openlibrary.org', pathname: '/**' },
      { protocol: 'https', hostname: 'books.google.com', pathname: '/**' },
      { protocol: 'https', hostname: 'books.googleusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'images-na.ssl-images-amazon.com', pathname: '/**' },
      { protocol: 'https', hostname: 'm.media-amazon.com', pathname: '/**' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com', pathname: '/**' },
      { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'images.isbndb.com', pathname: '/**' },
    ],
    domains: [
      'books.google.com',
      'books.googleusercontent.com',
      'covers.openlibrary.org',
      'images-na.ssl-images-amazon.com',
      'm.media-amazon.com',
      'firebasestorage.googleapis.com',
      'res.cloudinary.com',
      'lh3.googleusercontent.com',
      'images.isbndb.com',
    ],
    formats: ['image/webp', 'image/avif'],
  },
};

export default nextConfig;

