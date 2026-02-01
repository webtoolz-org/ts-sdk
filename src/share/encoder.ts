/**
 * Share payload encoding and decoding.
 * Uses lz-string compression for URL-safe encoded payloads.
 */

import LZString from "lz-string";
const { compressToEncodedURIComponent, decompressFromEncodedURIComponent } = LZString;
import type { SharePayload, EncodeResult, DecodeResult } from "./types";
import { MAX_PAYLOAD_SIZE, MAX_DECOMPRESSED_SIZE } from "./types";

/** Approximate overhead of the payload wrapper in bytes */
const PAYLOAD_WRAPPER_OVERHEAD = 30;

/**
 * Encodes JSON data into a URL-safe string using LZ compression.
 *
 * @param json - The JSON string to encode
 * @returns Encode result with success status and encoded string or error
 */
export function encode(json: string): EncodeResult {
  if (!json.trim()) {
    return { success: false, error: "JSON is empty" };
  }

  const payload: SharePayload = { v: 1, d: json };
  const payloadStr = JSON.stringify(payload);
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
 * Decodes an encoded payload back to JSON.
 *
 * @param encoded - The URL-safe encoded string
 * @returns Decode result with success status and decoded data or error
 */
export function decode(encoded: string): DecodeResult {
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
    const payload = JSON.parse(decompressed) as SharePayload;

    if (payload.v !== 1) {
      return { success: false, error: `Unsupported version: ${payload.v}` };
    }

    return {
      success: true,
      json: payload.d,
    };
  } catch {
    return { success: false, error: "Invalid payload format" };
  }
}

/**
 * Checks if JSON content is small enough to be shared via URL.
 * Accounts for payload wrapper overhead.
 *
 * @param json - The JSON string to check
 * @returns True if the content can be shared
 */
export function isShareableSize(json: string): boolean {
  if (!json.trim()) return false;
  const size = new TextEncoder().encode(json).length + PAYLOAD_WRAPPER_OVERHEAD;
  return size <= MAX_PAYLOAD_SIZE;
}
