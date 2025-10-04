// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { AuthProvider } from "@/hooks/useAuth";
import Header from "@/components/Header"; // ← ADD THIS LINE

export const metadata: Metadata = {
  title: "Booklyverse",
  description: "A social library for readers & authors",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Header /> {/* ← ADD THIS LINE */}
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}