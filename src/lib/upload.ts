export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB - supports modern phone cameras
export const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];

export type UploadCategory = 'user' | 'garment' | string;
export type UploadType = 'front' | 'side' | 'back' | string;

export interface UploadInput {
  sessionId: string;
  category: UploadCategory;
  type: UploadType;
  fileName: string;
  contentType: string;
  size: number;
}

export interface ValidatedUpload {
  path: string; // where to store: session/category/type/filename
  contentType: string;
}

export type ValidationResult =
  | { ok: true; value: ValidatedUpload }
  | { ok: false; error: string };

function sanitize(segment: string): string {
  // Remove slashes and dots sequences to prevent traversal
  const noSlashes = segment.replace(/[\/]+/g, '_');
  const noDotDot = noSlashes.replace(/\.\.+/g, '_');
  // Keep basic word, dash, underscore, dot (single)
  return noDotDot
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function validateUpload(input: UploadInput): ValidationResult {
  if (!ALLOWED_TYPES.includes(input.contentType)) {
    return { ok: false, error: 'Invalid file type. Allowed: JPEG, PNG, WebP, HEIC' };
  }
  if (input.size > MAX_FILE_SIZE) {
    return { ok: false, error: 'File size exceeds 50MB limit' };
  }
  const session = sanitize(input.sessionId);
  const category = sanitize(input.category);
  const type = sanitize(input.type);
  const file = sanitize(input.fileName || 'file');
  const path = `${session}/${category}/${type}/${file}`;
  return { ok: true, value: { path, contentType: input.contentType } };
}
