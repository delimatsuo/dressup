export function isHttpOrDataUrl(s: string): boolean {
  if (typeof s !== 'string' || !s.trim()) return false;
  if (/^https?:\/\//i.test(s)) return true;
  if (/^data:/i.test(s)) return true;
  return false;
}

