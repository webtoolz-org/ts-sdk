// JSON module
export {
  // Types
  type ParseResult,
  type FormatOptions,
  type ValidationResult,
  type ValidationError,
  type DiffResult,
  type DiffEntry,
  type JsonStats,
  // Parser
  safeJsonParse,
  isValidJson,
  getJsonType,
  // Formatter
  formatJson,
  minifyJson,
  beautifyJson,
  getJsonStats,
  // Validator
  validateJson,
  validateJsonSchema,
  // Differ
  compareJson,
  formatDiffForDisplay,
} from "./json";

// Share module
export {
  // Types
  type CompressResult,
  type CompressSuccess,
  type CompressFailure,
  type DecompressResult,
  type DecompressSuccess,
  type DecompressFailure,
  // Constants
  MAX_PAYLOAD_SIZE,
  MAX_DECOMPRESSED_SIZE,
  PAYLOAD_WRAPPER_OVERHEAD,
  // Codec
  compress,
  decompress,
  fitsInPayload,
} from "./share";
