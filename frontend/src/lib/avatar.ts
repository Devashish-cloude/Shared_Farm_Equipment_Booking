/**
 * Utility for generating neutral, privacy-safe avatars and handling profile images.
 * Never leaks or defaults to another user's personal photograph.
 */

export function getAvatarUrl(avatarUrl?: string | null, name?: string): string {
  if (avatarUrl && avatarUrl.trim() && !avatarUrl.includes('photo-1507003211169-0a1dd7228f2d')) {
    return avatarUrl.trim();
  }

  const cleanName = (name || 'Farmer').trim();
  const parts = cleanName.split(' ').filter(Boolean);
  let initials = 'SF';
  if (parts.length >= 2) {
    initials = (parts[0][0] + parts[1][0]).toUpperCase();
  } else if (parts.length === 1 && parts[0].length >= 2) {
    initials = parts[0].substring(0, 2).toUpperCase();
  } else if (parts.length === 1) {
    initials = parts[0][0].toUpperCase();
  }

  // Return a clean, responsive SVG data URI with platform branding colors (#164B35 forest green and #B8D96B lime)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <rect width="100" height="100" fill="#164B35" rx="50"/>
    <text x="50" y="58" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="38" font-weight="700" fill="#B8D96B" text-anchor="middle" dominant-baseline="middle">${initials}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
