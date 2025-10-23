import AuthorProfilePageClient from './AuthorProfilePageClient';

export default async function AuthorProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <AuthorProfilePageClient slug={slug} />;
}
