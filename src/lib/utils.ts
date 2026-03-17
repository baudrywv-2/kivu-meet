/** Haversine distance in km */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  if (km < 10) return `${km.toFixed(1)} km away`;
  return `${Math.round(km)} km away`;
}

/** Returns i18n key and params for "Active X ago". Use: t(result.key, result.params). */
export function formatRelativeTimeKey(date: Date | string): { key: string; params?: Record<string, string> } {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const sec = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (sec < 60) return { key: 'activeJustNow' };
  if (sec < 3600) return { key: 'activeMinutes', params: { n: String(Math.floor(sec / 60)) } };
  if (sec < 86400) return { key: 'activeHours', params: { n: String(Math.floor(sec / 3600)) } };
  if (sec < 604800) return { key: 'activeDays', params: { n: String(Math.floor(sec / 86400)) } };
  if (sec < 2592000) return { key: 'activeWeeks', params: { n: String(Math.floor(sec / 604800)) } };
  return { key: 'activeMonths', params: { n: String(Math.floor(sec / 2592000)) } };
}
