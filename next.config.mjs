/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone', // ✅ dynamic SSR runtime (no static export)

  experimental: {
    typedRoutes: false,
    serverComponentsExternalPackages: ['firebase-admin'],
  },

  images: {
    remotePatterns: [
      // ───── Open Library ─────
      { protocol: 'https', hostname: 'covers.openlibrary.org', pathname: '/**' },

      // ───── Google Books / Googleusercontent ─────
      { protocol: 'https', hostname: 'books.google.com', pathname: '/**' },
      { protocol: 'http', hostname: 'books.google.com', pathname: '/**' }, // 👈 added
      { protocol: 'https', hostname: 'books.googleusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com', pathname: '/**' },

      // ───── Amazon ─────
      { protocol: 'https', hostname: 'images-na.ssl-images-amazon.com', pathname: '/**' },
      { protocol: 'https', hostname: 'm.media-amazon.com', pathname: '/**' },

      // ───── ISBNdb ─────
      { protocol: 'https', hostname: 'images.isbndb.com', pathname: '/**' },
      { protocol: 'http', hostname: 'images.isbndb.com', pathname: '/**' }, // 👈 added

      // ───── Firebase Storage + Cloudinary ─────
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com', pathname: '/**' },
      { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' },
    ],
    formats: ['image/webp', 'image/avif'],
  },
};

export default nextConfig;
