import "./globals.css";
import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/hooks/useAuth";
import Header from "@/components/Header";

// ✅ Standard metadata
export const metadata: Metadata = {
  title: "Booklyverse",
  description: "A social library for readers & authors",
};

// ✅ Move viewport here instead of inside metadata
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head /> {/* Required so Next injects <meta> tags */}
      <body>
        <AuthProvider>
          <Header />
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
