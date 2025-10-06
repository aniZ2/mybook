// utils/slugify.ts
/**
 * Generates a clean, lowercase, URL-safe slug from any string.
 * Example: "J.R.R. Tolkien" → "j-r-r-tolkien"
 */
export function slugify(input: string): string {
  if (!input) return '';
  return input
    .toLowerCase()
    .normalize('NFKD')                    // handle accented characters
    .replace(/[^\w\s-]/g, '')             // remove punctuation and symbols
    .trim()
    .replace(/\s+/g, '-')                 // spaces → hyphens
    .replace(/-+/g, '-');                 // collapse multiple hyphens
}
