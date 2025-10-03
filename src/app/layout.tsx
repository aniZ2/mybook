import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

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
        {/* Site Header / Navbar */}
        <header className="nav">
          <Link href="/" style={{ fontWeight: "bold", fontSize: "1.2rem" }}>
            Booklyverse
          </Link>
          <nav style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <Link href="/discover">Discover</Link>
            <Link href="/clubs">Clubs</Link>
            <Link href="/authors">Authors</Link>
            <Link href="/deals">Deals</Link>
            <Link href="/profile">Profile</Link>
            <Link href="/account">Account</Link>
            {/* Auth Links */}
            <Link href="/login">Login</Link>
            <Link
              href="/signup"
              className="btn"
              style={{ marginLeft: "0.5rem" }}
            >
              Sign Up
            </Link>
          </nav>
        </header>

        {/* Main Page Content */}
        <main className="main">{children}</main>
      </body>
    </html>
  );
}
