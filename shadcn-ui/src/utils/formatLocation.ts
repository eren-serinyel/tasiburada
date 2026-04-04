/**
 * Formats a location string for display.
 * Handles null/undefined gracefully.
 */
export function formatLocation(location: string | null | undefined): string {
  if (!location) return '—';
  return location;
}

/**
 * Parses a "City, District" formatted location string into its parts.
 */
export function parseLocation(location: string | null | undefined): { city: string; district: string } {
  if (!location) return { city: '', district: '' };
  const parts = location.split(', ');
  return { city: parts[0] ?? '', district: parts[1] ?? '' };
}
