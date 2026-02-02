import { describe, it, expect } from "vitest";
import LZString from "lz-string";
import { encode, decode, isShareableSize } from "../../src/share/encoder";

const { compressToEncodedURIComponent } = LZString;

describe("encode", () => {
  it("returns success with encoded string for valid JSON", () => {
    const result = encode('{"a": 1}');
    expect(result.success).toBe(true);
    expect(result.encoded).toBeTruthy();
  });

  it("returns error for empty input", () => {
    const result = encode("");
    expect(result.success).toBe(false);
    expect(result.error).toBe("JSON is empty");
  });

  it("returns error for whitespace-only input", () => {
    const result = encode("   \n\t  ");
    expect(result.success).toBe(false);
    expect(result.error).toBe("JSON is empty");
  });

  it("returns error for input exceeding 50KB (accounting for wrapper)", () => {
    // Create a string that when wrapped in payload exceeds 50KB
    const largeString = "a".repeat(51 * 1024);
    const result = encode(largeString);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Data too large to share");
  });

  it("handles special characters in JSON", () => {
    const specialJson = JSON.stringify({
      unicode: "日本語",
      emoji: "🎉🚀",
      newline: "line1\nline2",
      quotes: 'has "quotes"',
    });
    const result = encode(specialJson);
    expect(result.success).toBe(true);
    expect(result.encoded).toBeTruthy();
  });

  it("handles invalid JSON content (non-JSON text)", () => {
    const result = encode("not valid json at all");
    expect(result.success).toBe(true);
    expect(result.encoded).toBeTruthy();
  });
});

describe("decode", () => {
  it("decodes valid encoded string back to original JSON", () => {
    const original = '{"test": "value", "number": 42}';
    const encoded = encode(original);
    expect(encoded.success).toBe(true);

    const decoded = decode(encoded.encoded!);
    expect(decoded.success).toBe(true);
    expect(decoded.json).toBe(original);
  });

  it("returns error for empty input", () => {
    const result = decode("");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid share link");
  });

  it("returns error for whitespace-only input", () => {
    const result = decode("   \n\t  ");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid share link");
  });

  it("returns error for invalid encoded string", () => {
    const result = decode("invalid-garbage-data");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Could not decode data");
  });

  it("preserves special characters through round-trip", () => {
    const original = JSON.stringify({
      unicode: "日本語",
      emoji: "🎉🚀",
      newline: "line1\nline2",
    });
    const encoded = encode(original);
    const decoded = decode(encoded.encoded!);

    expect(decoded.success).toBe(true);
    expect(decoded.json).toBe(original);
  });

  it("preserves complex nested JSON through round-trip", () => {
    const original = JSON.stringify({
      string: "hello",
      number: 123.45,
      boolean: true,
      null: null,
      array: [1, 2, 3],
      nested: { a: { b: { c: "deep" } } },
    });
    const encoded = encode(original);
    const decoded = decode(encoded.encoded!);

    expect(decoded.success).toBe(true);
    expect(JSON.parse(decoded.json!)).toEqual(JSON.parse(original));
  });

  it("returns error for unsupported payload version", () => {
    // Manually create a v2 payload and compress it
    const v2Payload = JSON.stringify({ v: 2, d: '{"test": true}' });
    const encoded = compressToEncodedURIComponent(v2Payload);

    const result = decode(encoded);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Unsupported version: 2");
  });

  it("returns error for malformed JSON payload", () => {
    const malformed = compressToEncodedURIComponent("not valid json {{{");

    const result = decode(malformed);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid payload format");
  });
});

describe("isShareableSize", () => {
  it("returns true for small content", () => {
    expect(isShareableSize('{"a": 1}')).toBe(true);
  });

  it("returns false for empty content", () => {
    expect(isShareableSize("")).toBe(false);
  });

  it("returns false for whitespace-only content", () => {
    expect(isShareableSize("   \n\t  ")).toBe(false);
  });

  it("returns false for content exceeding limit with wrapper overhead", () => {
    // 50KB limit minus ~30 bytes overhead = ~51170 bytes max for content
    const largeContent = "a".repeat(50 * 1024);
    expect(isShareableSize(largeContent)).toBe(false);
  });

  it("returns true for content within limit accounting for overhead", () => {
    // Content that fits with ~30 byte overhead
    const content = "a".repeat(50 * 1024 - 50);
    expect(isShareableSize(content)).toBe(true);
  });

  it("correctly calculates size for multi-byte characters", () => {
    // Each emoji is 4 bytes in UTF-8
    // Need to account for ~30 byte overhead, so max is ~51170 bytes
    // 51170 / 4 = 12792 emojis max
    const atLimit = "🎉".repeat(12790);
    expect(isShareableSize(atLimit)).toBe(true);

    const overLimit = "🎉".repeat(12810);
    expect(isShareableSize(overLimit)).toBe(false);
  });
});

describe("boundary and edge case tests", () => {
  describe("exactly 50KB boundary", () => {
    it("accepts content at exactly 50KB minus overhead", () => {
      // 50KB = 51200 bytes, minus ~30 byte wrapper overhead
      const content = "a".repeat(51200 - 30);
      const result = encode(content);
      expect(result.success).toBe(true);
    });

    it("rejects content at 50KB plus 1 byte", () => {
      const content = "a".repeat(51200 + 1);
      const result = encode(content);
      expect(result.success).toBe(false);
    });
  });

  describe("truncated/malformed encoded strings", () => {
    it("handles truncated base64-like string", () => {
      const result = decode("abc");
      expect(result.success).toBe(false);
    });

    it("handles partially valid encoded data", () => {
      const validEncoded = encode('{"test": true}').encoded!;
      const truncated = validEncoded.slice(0, validEncoded.length / 2);
      const result = decode(truncated);
      expect(result.success).toBe(false);
    });

    it("handles random garbage characters", () => {
      const result = decode("!@#$%^&*()");
      expect(result.success).toBe(false);
    });
  });

  describe("version migration scenarios", () => {
    it("handles v1 payload format correctly", () => {
      const original = '{"data": "test"}';
      const encoded = encode(original);
      expect(encoded.success).toBe(true);

      const decoded = decode(encoded.encoded!);
      expect(decoded.success).toBe(true);
      expect(decoded.json).toBe(original);
    });

    it("rejects unknown future versions", () => {
      const futurePayload = JSON.stringify({ v: 99, d: '{"test": true}' });
      const encoded = compressToEncodedURIComponent(futurePayload);
      const result = decode(encoded);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Unsupported version");
    });
  });
});
