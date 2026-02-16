import { describe, it, expect } from "vitest";
import LZString from "lz-string";
import {
  compress,
  decompress,
  fitsInPayload,
  MAX_PAYLOAD_SIZE,
  PAYLOAD_WRAPPER_OVERHEAD,
} from "../../src/share/codec";

const { compressToEncodedURIComponent } = LZString;

describe("compress", () => {
  it("returns success with encoded string for valid input", () => {
    const result = compress(JSON.stringify({ v: 1, data: "hello" }));
    expect(result.success).toBe(true);
    if (result.success) expect(result.encoded).toBeTruthy();
  });

  it("returns error when payload exceeds MAX_PAYLOAD_SIZE", () => {
    const large = "x".repeat(MAX_PAYLOAD_SIZE + 1);
    const result = compress(large);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Data too large to share");
  });

  it("accepts payload at exactly MAX_PAYLOAD_SIZE", () => {
    // Single-byte chars: byte length = char length
    const payload = "a".repeat(MAX_PAYLOAD_SIZE);
    const result = compress(payload);
    expect(result.success).toBe(true);
  });

  it("accounts for multi-byte characters in size check", () => {
    // Each emoji is 4 bytes in UTF-8
    const emojis = "🎉".repeat(MAX_PAYLOAD_SIZE / 4 + 1);
    const result = compress(emojis);
    expect(result.success).toBe(false);
  });
});

describe("decompress", () => {
  it("round-trips through compress/decompress", () => {
    const payload = { v: 1, msg: "hello world" };
    const compressed = compress(JSON.stringify(payload));
    expect(compressed.success).toBe(true);
    if (!compressed.success) return;

    const result = decompress<typeof payload>(compressed.encoded);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.v).toBe(1);
      expect(result.data.msg).toBe("hello world");
    }
  });

  it("returns error for empty string", () => {
    const result = decompress("");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Invalid share link");
  });

  it("returns error for whitespace-only string", () => {
    const result = decompress("  \n\t ");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Invalid share link");
  });

  it("returns error for garbage input", () => {
    const result = decompress("not-valid-data!!!");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Could not decode data");
  });

  it("returns error for zip bomb (decompressed > MAX_DECOMPRESSED_SIZE)", () => {
    // Compress a very large string, then manipulate: compress a huge payload
    // that's within pre-compression limit but decompresses to > 100KB
    // Actually, lz-string compression of repeated chars is extremely efficient.
    // A string of 101KB of "a" compresses to very few bytes.
    const huge = "a".repeat(101 * 1024);
    const encoded = compressToEncodedURIComponent(huge);
    const result = decompress(encoded);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Decoded content too large");
  });

  it("returns error for unsupported version", () => {
    const payload = JSON.stringify({ v: 99, data: "test" });
    const encoded = compressToEncodedURIComponent(payload);
    const result = decompress(encoded);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Unsupported version: 99");
  });

  it("returns error for malformed JSON", () => {
    const encoded = compressToEncodedURIComponent("not json {{{");
    const result = decompress(encoded);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Invalid payload format");
  });
});

describe("fitsInPayload", () => {
  it("returns true for small content", () => {
    expect(fitsInPayload("hello")).toBe(true);
  });

  it("returns false for empty content", () => {
    expect(fitsInPayload("")).toBe(false);
  });

  it("returns false for whitespace-only content", () => {
    expect(fitsInPayload("   \n ")).toBe(false);
  });

  it("returns false when content + overhead exceeds limit", () => {
    const content = "a".repeat(MAX_PAYLOAD_SIZE);
    expect(fitsInPayload(content)).toBe(false);
  });

  it("returns true when content + overhead is within limit", () => {
    const content = "a".repeat(MAX_PAYLOAD_SIZE - PAYLOAD_WRAPPER_OVERHEAD - 1);
    expect(fitsInPayload(content)).toBe(true);
  });

  it("correctly calculates size for multi-byte characters", () => {
    // Each emoji is 4 bytes, overhead is 30
    // Max bytes for content = 51200 - 30 = 51170
    // 51170 / 4 = 12792.5 => 12792 emojis fit
    const atLimit = "🎉".repeat(12790);
    expect(fitsInPayload(atLimit)).toBe(true);

    const overLimit = "🎉".repeat(12810);
    expect(fitsInPayload(overLimit)).toBe(false);
  });
});
