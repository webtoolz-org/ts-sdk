import { parse, type ParseError } from "jsonc-parser";
import type { ParseResult } from "./types";

// ParseErrorCode values from jsonc-parser (const enum, so we use numeric values)
const parseErrorMessages: Record<number, string> = {
  1: "Invalid symbol",
  2: "Invalid number format",
  3: "Property name expected",
  4: "Value expected",
  5: "Colon expected",
  6: "Comma expected",
  7: "Closing brace expected",
  8: "Closing bracket expected",
  9: "End of file expected",
  10: "Invalid comment token",
  11: "Unexpected end of comment",
  12: "Unexpected end of string",
  13: "Unexpected end of number",
  14: "Invalid unicode escape sequence",
  15: "Invalid escape character",
  16: "Invalid character",
};

/**
 * Safely parse JSON with detailed error information including line and column.
 *
 * @param input - The JSON string to parse
 * @returns Parse result with data on success, or error details on failure
 */
export function safeJsonParse<T = unknown>(input: string): ParseResult<T> {
  if (!input.trim()) {
    return { success: false, error: { message: "Input is empty", line: 1, column: 1 } };
  }

  const errors: ParseError[] = [];
  const data = parse(input, errors, { disallowComments: true, allowTrailingComma: false });

  if (errors.length > 0) {
    const firstError = errors[0];
    const { line, column } = offsetToLineColumn(input, firstError.offset);
    return {
      success: false,
      error: {
        message: parseErrorMessages[firstError.error] || "Unknown parse error",
        line,
        column,
      },
    };
  }

  return { success: true, data: data as T };
}

function offsetToLineColumn(input: string, offset: number): { line: number; column: number } {
  const lines = input.substring(0, offset).split("\n");
  return {
    line: lines.length,
    column: (lines[lines.length - 1]?.length ?? 0) + 1,
  };
}

/**
 * Check if a string is valid JSON.
 *
 * @param input - The string to validate
 * @returns True if the input is valid JSON
 */
export function isValidJson(input: string): boolean {
  return safeJsonParse(input).success;
}

/**
 * Get the type of a JSON value.
 *
 * @param value - The value to check
 * @returns The type as a string: "null", "array", "object", "string", "number", "boolean", or "undefined"
 */
export function getJsonType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}
