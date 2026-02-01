import type { FormatOptions, JsonStats } from "./types";
import { safeJsonParse } from "./parser";

const DEFAULT_OPTIONS: FormatOptions = {
  indentSize: 2,
  indentChar: "space",
  sortKeys: false,
};

/**
 * Format JSON with configurable indent and key sorting.
 *
 * @param input - JSON string or parsed object
 * @param options - Formatting options
 * @returns Formatted JSON string
 * @throws Error if input is invalid JSON
 */
export function formatJson(
  input: string | unknown,
  options: Partial<FormatOptions> = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // If input is string, parse it first
  const data = typeof input === "string" ? safeJsonParse(input).data : input;

  if (data === undefined) {
    throw new Error("Invalid JSON input");
  }

  const indent = opts.indentChar === "tab" ? "\t" : " ".repeat(opts.indentSize);

  if (opts.sortKeys) {
    return JSON.stringify(sortObjectKeys(data), null, indent);
  }

  return JSON.stringify(data, null, indent);
}

/**
 * Remove all whitespace from JSON.
 *
 * @param input - JSON string or parsed object
 * @returns Minified JSON string
 * @throws Error if input is invalid JSON
 */
export function minifyJson(input: string | unknown): string {
  const data = typeof input === "string" ? safeJsonParse(input).data : input;

  if (data === undefined) {
    throw new Error("Invalid JSON input");
  }

  return JSON.stringify(data);
}

function sortObjectKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }

  const sorted: Record<string, unknown> = {};
  const keys = Object.keys(obj as Record<string, unknown>).sort();

  for (const key of keys) {
    sorted[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
  }

  return sorted;
}

/**
 * Alias for formatJson.
 *
 * @param input - JSON string
 * @param options - Formatting options
 * @returns Formatted JSON string
 */
export function beautifyJson(
  input: string,
  options: Partial<FormatOptions> = {}
): string {
  return formatJson(input, options);
}

/**
 * Get statistics about a JSON document.
 *
 * @param input - JSON string
 * @returns Statistics including size, key count, depth, and type
 */
export function getJsonStats(input: string): JsonStats {
  const result = safeJsonParse(input);

  if (!result.success || result.data === undefined) {
    return {
      valid: false,
      size: new Blob([input]).size,
      minifiedSize: 0,
      keys: 0,
      depth: 0,
      type: "invalid",
    };
  }

  const minified = minifyJson(result.data);

  return {
    valid: true,
    size: new Blob([input]).size,
    minifiedSize: new Blob([minified]).size,
    keys: countKeys(result.data),
    depth: getDepth(result.data),
    type: getType(result.data),
  };
}

function countKeys(obj: unknown, count = 0): number {
  if (obj === null || typeof obj !== "object") {
    return count;
  }

  if (Array.isArray(obj)) {
    return obj.reduce((acc, item) => countKeys(item, acc), count);
  }

  const keys = Object.keys(obj);
  let total = count + keys.length;

  for (const key of keys) {
    total = countKeys((obj as Record<string, unknown>)[key], total);
  }

  return total;
}

function getDepth(obj: unknown, currentDepth = 0): number {
  if (obj === null || typeof obj !== "object") {
    return currentDepth;
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) return currentDepth + 1;
    return Math.max(...obj.map((item) => getDepth(item, currentDepth + 1)));
  }

  const values = Object.values(obj);
  if (values.length === 0) return currentDepth + 1;
  return Math.max(...values.map((val) => getDepth(val, currentDepth + 1)));
}

function getType(obj: unknown): string {
  if (obj === null) return "null";
  if (Array.isArray(obj)) return "array";
  return typeof obj;
}
