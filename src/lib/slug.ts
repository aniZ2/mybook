/**
 * lib/slug.ts
 *
 * Utilities for generating URL-friendly slugs.
 */

/**
 * Convert a string into a URL-friendly slug:
 *  - lowercase
 *  - remove diacritics (accents)
 *  - replace spaces and unsafe chars with hyphens
 *  - collapse repeated hyphens
 */
export function slugify(...parts: (string | undefined | null)[]): string {
  // Join the parts (title, author, etc.) with a hyphen so both
  // can contribute to a unique slug if provided.
  const raw = parts
    .filter(Boolean)
    .join('-')
    .toLowerCase();

  return raw
    // remove accents/diacritics
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // replace anything not a-z, 0-9 with a hyphen
    .replace(/[^a-z0-9]+/g, '-')
    // collapse multiple hyphens
    .replace(/-+/g, '-')
    // trim leading/trailing hyphens
    .replace(/^-|-$/g, '');
}

/**
 * Optionally you can add a helper to ensure uniqueness by appending
 * a random 6-character suffix. Example:
 *
 *   uniqueSlug(slugify(title, author))
 */
export function uniqueSlug(base: string): string {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}
