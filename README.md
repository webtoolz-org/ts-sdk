# @webtoolz/ts-sdk

[![npm version](https://img.shields.io/npm/v/@webtoolz/ts-sdk.svg)](https://www.npmjs.com/package/@webtoolz/ts-sdk)
[![npm downloads](https://img.shields.io/npm/dm/@webtoolz/ts-sdk.svg)](https://www.npmjs.com/package/@webtoolz/ts-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

TypeScript SDK that powers [webtoolz.dev](https://webtoolz.dev) - free online developer tools for encoding, formatting, and more.

## Installation

```bash
npm install @webtoolz/ts-sdk
# or
pnpm add @webtoolz/ts-sdk
# or
yarn add @webtoolz/ts-sdk
```

## Features

- **JSON Parsing** - Safe parsing with detailed error positions (line, column)
- **JSON Formatting** - Format, minify, beautify with configurable options
- **JSON Validation** - Syntax validation and JSON Schema validation (via AJV)
- **JSON Diffing** - Compare two JSON documents and get detailed differences
- **Share Codec** - Generic compress/decompress for URL-safe payloads using LZ compression

## Usage

### JSON Parsing

```typescript
import { safeJsonParse, isValidJson, getJsonType } from "@webtoolz/ts-sdk/json";

// Parse with error details
const result = safeJsonParse('{"name": "test"}');
if (result.success) {
  console.log(result.data); // { name: "test" }
} else {
  console.log(result.error); // { message: "...", line: 1, column: 5 }
}

// Quick validation
isValidJson('{"valid": true}'); // true
isValidJson('{invalid}'); // false

// Get JSON type
getJsonType(null); // "null"
getJsonType([1, 2]); // "array"
getJsonType({ a: 1 }); // "object"
```

### JSON Formatting

```typescript
import { formatJson, minifyJson, beautifyJson, getJsonStats } from "@webtoolz/ts-sdk/json";

// Format with options
formatJson('{"a":1,"b":2}');
// {
//   "a": 1,
//   "b": 2
// }

formatJson('{"z":1,"a":2}', { sortKeys: true, indentSize: 4 });
// {
//     "a": 2,
//     "z": 1
// }

// Minify
minifyJson('{\n  "a": 1\n}'); // '{"a":1}'

// Get statistics
getJsonStats('{"name": "test"}');
// { valid: true, size: 16, minifiedSize: 15, keys: 1, depth: 1, type: "object" }
```

### JSON Validation

```typescript
import { validateJson, validateJsonSchema } from "@webtoolz/ts-sdk/json";

// Syntax validation
const result = validateJson('{"invalid": }');
// { valid: false, errors: [{ message: "Value expected", line: 1, column: 13, keyword: "syntax" }] }

// JSON Schema validation
const schema = `{
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "age": { "type": "number" }
  },
  "required": ["name"]
}`;

validateJsonSchema('{"name": "John", "age": 30}', schema);
// { valid: true, errors: [] }

validateJsonSchema('{"age": "thirty"}', schema);
// { valid: false, errors: [{ path: "/age", message: "must be number", keyword: "type" }] }
```

### JSON Diffing

```typescript
import { compareJson, formatDiffForDisplay } from "@webtoolz/ts-sdk/json";

const result = compareJson(
  '{"a": 1, "b": 2}',
  '{"a": 10, "c": 3}'
);

console.log(result.differences);
// [
//   { type: "update", path: "a", oldValue: 1, newValue: 10 },
//   { type: "remove", path: "b", oldValue: 2 },
//   { type: "add", path: "c", newValue: 3 }
// ]

// Format for display
result.differences.forEach(diff => {
  console.log(formatDiffForDisplay(diff));
});
// ~ a: 1 → 10
// - b: 2
// + c: 3
```

### Share Codec

A generic codec for compressing any versioned payload into URL-safe strings. Used by JSON, Mermaid, and Music tools on webtoolz.dev.

```typescript
import { compress, decompress, fitsInPayload } from "@webtoolz/ts-sdk/share";

// Define your domain payload (must have a `v` field)
interface MyPayload {
  v: 1;
  data: string;
}

// Compress a payload to a URL-safe string
const payload: MyPayload = { v: 1, data: "hello world" };
const result = compress(JSON.stringify(payload));
if (result.success) {
  console.log(result.encoded); // Compressed URL-safe string
}

// Decompress back to a typed payload
const decoded = decompress<MyPayload>(result.encoded);
if (decoded.success) {
  console.log(decoded.data); // { v: 1, data: "hello world" }
}

// Check if content fits in a share payload (max 50KB with overhead)
fitsInPayload('{"small": true}'); // true
fitsInPayload("a".repeat(60000)); // false
```

## API Reference

### JSON Module (`@webtoolz/ts-sdk/json`)

| Function | Description |
|----------|-------------|
| `safeJsonParse<T>(input)` | Parse JSON with detailed error info (line, column) |
| `isValidJson(input)` | Quick validation check |
| `getJsonType(value)` | Get type of JSON value |
| `formatJson(input, options?)` | Format with configurable indent and key sorting |
| `minifyJson(input)` | Remove all whitespace |
| `beautifyJson(input, options?)` | Alias for formatJson |
| `getJsonStats(input)` | Get statistics: size, minified size, key count, depth |
| `validateJson(input)` | Validate JSON syntax with error positions |
| `validateJsonSchema(data, schema)` | Validate against JSON Schema (AJV) |
| `compareJson(left, right)` | Compare two JSON strings |
| `formatDiffForDisplay(diff)` | Format diff entry for display |

### Share Module (`@webtoolz/ts-sdk/share`)

| Function | Description |
|----------|-------------|
| `compress(payloadStr)` | Compress a JSON string to URL-safe string (max 50KB input) |
| `decompress<T>(encoded)` | Decompress back to typed payload (max 100KB output, version check) |
| `fitsInPayload(content)` | Check if content fits within size limits (accounting for wrapper overhead) |

| Constant | Value | Description |
|----------|-------|-------------|
| `MAX_PAYLOAD_SIZE` | 51200 | Maximum payload size before compression (50KB) |
| `MAX_DECOMPRESSED_SIZE` | 102400 | Maximum decompressed size (100KB, zip bomb protection) |
| `PAYLOAD_WRAPPER_OVERHEAD` | 30 | Approximate overhead of payload wrapper in bytes |

### Types

```typescript
// JSON Types
interface ParseResult<T> { success: boolean; data?: T; error?: { message: string; line: number; column: number } }
interface FormatOptions { indentSize: 2 | 4; indentChar: "space" | "tab"; sortKeys: boolean }
interface ValidationResult { valid: boolean; errors: ValidationError[] }
interface ValidationError { path: string; message: string; keyword: string; line?: number; column?: number }
interface DiffResult { success: boolean; differences: DiffEntry[]; error?: string }
interface DiffEntry { type: "add" | "remove" | "update"; path: string; oldValue?: unknown; newValue?: unknown }
interface JsonStats { valid: boolean; size: number; minifiedSize: number; keys: number; depth: number; type: string }

// Share Codec Types
type CompressResult = CompressSuccess | CompressFailure
interface CompressSuccess { success: true; encoded: string }
interface CompressFailure { success: false; error: string }

type DecompressResult<T> = DecompressSuccess<T> | DecompressFailure
interface DecompressSuccess<T> { success: true; data: T }
interface DecompressFailure { success: false; error: string }
```

## Online Tools

Try these utilities in your browser at [webtoolz.dev](https://webtoolz.dev):

- [JSON Formatter](https://webtoolz.dev/json/formatter) - Format and beautify JSON online
- [JSON Validator](https://webtoolz.dev/json/validator) - Validate JSON syntax and schema
- [JSON Diff](https://webtoolz.dev/json/diff) - Compare two JSON documents
- [More Tools](https://webtoolz.dev) - Encoding, hashing, and developer utilities

## License

MIT - see [LICENSE](./LICENSE) for details.

---

Made with care by [webtoolz.dev](https://webtoolz.dev)
