import BookDetailsClient from './BookDetailsClient';

export default async function BookPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params; // 👈 wait for the Promise
  return <BookDetailsClient slug={slug} />;
}
