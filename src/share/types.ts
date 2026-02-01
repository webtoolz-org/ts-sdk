/**
 * Versioned payload structure for share encoding.
 * Wraps the JSON data for compression and URL-safe encoding.
 */
export interface SharePayload {
  /** Schema version for forward compatibility */
  v: 1;
  /** Raw JSON data string */
  d: string;
}

/**
 * Result of encoding JSON data for sharing.
 */
export interface EncodeResult {
  success: boolean;
  /** URL-safe encoded string (only present on success) */
  encoded?: string;
  /** Error message (only present on failure) */
  error?: string;
}

/**
 * Result of decoding a shared payload.
 */
export interface DecodeResult {
  success: boolean;
  /** Decoded JSON string (only present on success) */
  json?: string;
  /** Error message (only present on failure) */
  error?: string;
}

/** Maximum payload size before compression (50KB) */
export const MAX_PAYLOAD_SIZE = 50 * 1024;

/** Maximum decompressed size to prevent zip bomb attacks (100KB) */
export const MAX_DECOMPRESSED_SIZE = 100 * 1024;
