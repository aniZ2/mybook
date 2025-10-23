/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  
  // Move typedRoutes to root level (not in experimental)
  typedRoutes: false,
  
  // Move serverExternalPackages to root level (Next.js 15+)
  serverExternalPackages: ['firebase-admin'],
  
  experimental: {
    // Keep only valid experimental features here if needed
    // allowedDevOrigins is not a valid Next.js config
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
    unoptimized: process.env.NODE_ENV === 'development',
  },
};

export default nextConfig;