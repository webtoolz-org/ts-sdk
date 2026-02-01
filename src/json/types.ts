/**
 * Result of parsing JSON with detailed error information.
 */
export interface ParseResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    line: number;
    column: number;
  };
}

/**
 * Options for JSON formatting.
 */
export interface FormatOptions {
  indentSize: 2 | 4;
  indentChar: "space" | "tab";
  sortKeys: boolean;
}

/**
 * Result of JSON validation.
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validation error details.
 */
export interface ValidationError {
  path: string;
  message: string;
  keyword: string;
  line?: number;
  column?: number;
}

/**
 * Result of comparing two JSON documents.
 */
export interface DiffResult {
  success: boolean;
  differences: DiffEntry[];
  error?: string;
}

/**
 * A single difference between two JSON documents.
 */
export interface DiffEntry {
  type: "add" | "remove" | "update";
  path: string;
  oldValue?: unknown;
  newValue?: unknown;
}

/**
 * Statistics about a JSON document.
 */
export interface JsonStats {
  valid: boolean;
  size: number;
  minifiedSize: number;
  keys: number;
  depth: number;
  type: string;
}
