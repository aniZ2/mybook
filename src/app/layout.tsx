import "./globals.css";
import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/context/AuthProvider";
import Header from "@/components/Header";

// ─────────────── Next.js Static Config ───────────────
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

// ─────────────── Site Metadata ───────────────
export const metadata: Metadata = {
  title: "Booklyverse",
  description: "A social library for readers & authors",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Booklyverse",
  },
};

// ─────────────── Viewport (NEW Next.js spec) ───────────────
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5, // allows zoom
  userScalable: true, // accessibility
  themeColor: "#0f172a", // ✅ moved here from metadata
};

// ─────────────── Root Layout ───────────────
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* ✅ Add modern and legacy PWA tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Booklyverse" />
        <meta name="apple-mobile-web-app-title" content="Booklyverse" />
        <meta name="theme-color" content="#0f172a" />
      </head>
      <body>
        <AuthProvider>
          <Header />
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
