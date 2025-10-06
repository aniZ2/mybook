/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone', // lets Firebase run SSR server instead of static-only

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'covers.openlibrary.org',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'books.google.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'books.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images-na.ssl-images-amazon.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'm.media-amazon.com', // ✅ Amazon images
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // ✅ Google profile & Firebase user avatars
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.isbndb.com', // ✅ add ISBNdb covers
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
