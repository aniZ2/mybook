/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',

  experimental: {
    typedRoutes: false,
    serverComponentsExternalPackages: ['firebase-admin'],
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'covers.openlibrary.org', pathname: '/**' },
      { protocol: 'https', hostname: 'books.google.com', pathname: '/**' },
      { protocol: 'http', hostname: 'books.google.com', pathname: '/**' },
      { protocol: 'https', hostname: 'books.googleusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'images-na.ssl-images-amazon.com', pathname: '/**' },
      { protocol: 'https', hostname: 'm.media-amazon.com', pathname: '/**' },
      { protocol: 'https', hostname: 'images.isbndb.com', pathname: '/**' },
      { protocol: 'http', hostname: 'images.isbndb.com', pathname: '/**' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com', pathname: '/**' },
      { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' },
    ],
    formats: ['image/webp', 'image/avif'],

    // ✅ Add this:
    unoptimized: process.env.NODE_ENV === 'development',
  },
};

export default nextConfig;
