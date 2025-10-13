import BookDetailsClient from './BookDetailsClient';

export default function BookPage({ params }: { params: { slug: string } }) {
  return <BookDetailsClient slug={params.slug} />;
}
