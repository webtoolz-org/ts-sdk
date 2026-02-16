/**
 * Generic share codec — low-level compress/decompress for any domain.
 * Uses lz-string compression for URL-safe encoded payloads.
 */

import LZString from "lz-string";
const { compressToEncodedURIComponent, decompressFromEncodedURIComponent } = LZString;

/** Maximum payload size before compression (50KB) */
export const MAX_PAYLOAD_SIZE = 50 * 1024;

/** Maximum decompressed size to prevent zip bomb attacks (100KB) */
export const MAX_DECOMPRESSED_SIZE = 100 * 1024;

/** Approximate overhead of the payload wrapper in bytes */
export const PAYLOAD_WRAPPER_OVERHEAD = 30;

export interface CompressSuccess {
  success: true;
  encoded: string;
}

export interface CompressFailure {
  success: false;
  error: string;
}

export type CompressResult = CompressSuccess | CompressFailure;

export interface DecompressSuccess<T> {
  success: true;
  data: T;
}

export interface DecompressFailure {
  success: false;
  error: string;
}

export type DecompressResult<T> = DecompressSuccess<T> | DecompressFailure;

/**
 * Compresses a payload string into a URL-safe encoded string.
 * Validates size before compression.
 *
 * @param payloadStr - The JSON-stringified payload to compress
 * @returns Compress result with encoded string or error
 */
export function compress(payloadStr: string): CompressResult {
  const size = new TextEncoder().encode(payloadStr).length;

  if (size > MAX_PAYLOAD_SIZE) {
    return { success: false, error: "Data too large to share" };
  }

  const encoded = compressToEncodedURIComponent(payloadStr);
  if (!encoded) {
    return { success: false, error: "Failed to compress data" };
  }

  return { success: true, encoded };
}

/**
 * Decompresses a URL-safe encoded string back to a typed payload.
 * Validates: non-empty, decompression, zip bomb, JSON parse, version field.
 *
 * @param encoded - The URL-safe encoded string
 * @returns Decompress result with typed data or error
 */
export function decompress<T extends { v: number }>(
  encoded: string
): DecompressResult<T> {
  if (!encoded.trim()) {
    return { success: false, error: "Invalid share link" };
  }

  const decompressed = decompressFromEncodedURIComponent(encoded);
  if (!decompressed) {
    return { success: false, error: "Could not decode data" };
  }

  if (decompressed.length > MAX_DECOMPRESSED_SIZE) {
    return { success: false, error: "Decoded content too large" };
  }

  try {
    const data = JSON.parse(decompressed) as T;

    if (data.v !== 1) {
      return { success: false, error: `Unsupported version: ${data.v}` };
    }

    return { success: true, data };
  } catch {
    return { success: false, error: "Invalid payload format" };
  }
}

/**
 * Checks if content is small enough to fit in a share payload.
 * Accounts for payload wrapper overhead.
 *
 * @param content - The raw content string to check
 * @returns True if the content can be shared
 */
export function fitsInPayload(content: string): boolean {
  if (!content.trim()) return false;
  const size = new TextEncoder().encode(content).length + PAYLOAD_WRAPPER_OVERHEAD;
  return size <= MAX_PAYLOAD_SIZE;
}
