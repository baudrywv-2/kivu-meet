export type StorageRef = { bucket: string; path: string };

const PREFIX = 'sb://';

export function toStorageRef(bucket: string, path: string): string {
  const b = bucket.trim();
  const p = path.replace(/^\/+/, '');
  return `${PREFIX}${b}/${p}`;
}

export function parseStorageRef(input: string): StorageRef | null {
  const v = input.trim();
  if (!v.startsWith(PREFIX)) return null;
  const rest = v.slice(PREFIX.length);
  const slash = rest.indexOf('/');
  if (slash <= 0) return null;
  const bucket = rest.slice(0, slash);
  const path = rest.slice(slash + 1);
  if (!bucket || !path) return null;
  return { bucket, path };
}

export function isStorageRef(input: string): boolean {
  return parseStorageRef(input) != null;
}
