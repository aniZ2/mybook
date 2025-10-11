'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/context/AuthProvider';
import { BookOpen, Users, Sparkles, TrendingUp, Heart, Search, MessageCircle, Star, ArrowRight } from 'lucide-react';
import styles from './page.module.css';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className={styles.container}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <motion.div
          className={styles.heroContent}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className={styles.heroTitle}>
            Your Next Great Read
            <br />
            <span className={styles.heroAccent}>Awaits</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Discover books, connect with readers, and join vibrant communities
            passionate about the stories that shape us.
          </p>
          <div className={styles.heroCTA}>
            {user ? (
              <>
                <Link href="/discover" className={styles.primaryButton}>
                  <Search size={20} />
                  Discover Books
                </Link>
                <Link href="/clubs" className={styles.secondaryButton}>
                  <Users size={20} />
                  Join a Club
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className={styles.primaryButton}>
                  Get Started Free
                  <ArrowRight size={20} />
                </Link>
                <Link href="/discover" className={styles.secondaryButton}>
                  Explore Books
                </Link>
              </>
            )}
          </div>
        </motion.div>

        {/* Decorative Elements */}
        <div className={styles.heroBackground}>
          <div className={styles.orb1}></div>
          <div className={styles.orb2}></div>
          <div className={styles.orb3}></div>
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.features}>
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className={styles.featuresContainer}
        >
          <h2 className={styles.sectionTitle}>Everything You Need to Love Reading</h2>
          <div className={styles.featuresGrid}>
            <FeatureCard
              icon={<Search size={40} />}
              title="Discover Amazing Books"
              description="Search millions of books from multiple sources and find your next favorite read."
              color="#3b82f6"
            />
            <FeatureCard
              icon={<Users size={40} />}
              title="Join Book Clubs"
              description="Connect with readers who share your taste and discuss stories together."
              color="#8b5cf6"
            />
            <FeatureCard
              icon={<TrendingUp size={40} />}
              title="Track Your Reading"
              description="Keep track of books you've read and set reading goals."
              color="#10b981"
            />
            <FeatureCard
              icon={<MessageCircle size={40} />}
              title="Share Your Thoughts"
              description="Write reviews and share your reading journey with the community."
              color="#f59e0b"
            />
            <FeatureCard
              icon={<Star size={40} />}
              title="Get Recommendations"
              description="Personalized book suggestions based on your reading preferences."
              color="#ec4899"
            />
            <FeatureCard
              icon={<Sparkles size={40} />}
              title="For Authors Too"
              description="Authors can showcase their work and connect with readers."
              color="#6366f1"
            />
          </div>
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className={styles.cta}>
        <motion.div
          className={styles.ctaContent}
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className={styles.ctaTitle}>Ready to Start Your Reading Journey?</h2>
          <p className={styles.ctaText}>
            Join thousands of book lovers discovering their next favorite read
          </p>
          <div className={styles.ctaButtons}>
            <Link href={user ? "/discover" : "/login"} className={styles.ctaPrimary}>
              <BookOpen size={20} />
              {user ? "Start Discovering" : "Sign Up Free"}
            </Link>
            <Link href="/clubs" className={styles.ctaSecondary}>
              Browse Book Clubs
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerBrand}>
            <h3 className={styles.footerLogo}>Booklyverse</h3>
            <p className={styles.footerTagline}>Where readers become a community</p>
          </div>
          
          <div className={styles.footerLinks}>
            <div className={styles.footerColumn}>
              <h4>Explore</h4>
              <Link href="/discover">Discover Books</Link>
              <Link href="/clubs">Book Clubs</Link>
              <Link href="/authors">Authors</Link>
              <Link href="/deals">Deals</Link>
            </div>
            
            <div className={styles.footerColumn}>
              <h4>Community</h4>
              <Link href="/clubs/create">Create a Club</Link>
              <Link href="/author/submit">Submit Your Book</Link>
            </div>
            
            <div className={styles.footerColumn}>
              <h4>Account</h4>
              {user ? (
                <>
                  <Link href="/account">My Account</Link>
                  <Link href="/library">My Library</Link>
                </>
              ) : (
                <>
                  <Link href="/login">Sign In</Link>
                  <Link href="/login">Sign Up</Link>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className={styles.footerBottom}>
          <p>&copy; 2024 Booklyverse. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

function FeatureCard({ icon, title, description, color }: FeatureCardProps) {
  return (
    <motion.div
      className={styles.featureCard}
      whileHover={{ y: -8 }}
      transition={{ duration: 0.3 }}
    >
      <div className={styles.featureIcon} style={{ color }}>
        {icon}
      </div>
      <h3 className={styles.featureTitle}>{title}</h3>
      <p className={styles.featureDescription}>{description}</p>
    </motion.div>
  );
}

interface StatCardProps {
  number: string;
  label: string;
}

function StatCard({ number, label }: StatCardProps) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statNumber}>{number}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}