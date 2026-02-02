import Ajv, { type ErrorObject, type ValidateFunction } from "ajv";
import { safeJsonParse } from "./parser";
import type { ValidationResult, ValidationError } from "./types";

const ajv = new Ajv({ allErrors: true, verbose: true });

// Schema cache to avoid recompiling the same schema
const schemaCache = new Map<string, ValidateFunction>();
const MAX_CACHE_SIZE = 100;

function getOrCompileSchema(
  schemaString: string,
  schemaData: object
): ValidateFunction {
  let validate = schemaCache.get(schemaString);
  if (!validate) {
    // Evict oldest entry if cache is full
    if (schemaCache.size >= MAX_CACHE_SIZE) {
      const firstKey = schemaCache.keys().next().value;
      if (firstKey) schemaCache.delete(firstKey);
    }
    validate = ajv.compile(schemaData);
    schemaCache.set(schemaString, validate);
  }
  return validate;
}

/**
 * Clear the schema cache and remove all schemas from Ajv.
 * Useful for testing or when schemas have been updated.
 */
export function clearSchemaCache(): void {
  schemaCache.clear();
  ajv.removeSchema();
}

/**
 * Validate JSON syntax with detailed error positions.
 *
 * @param input - JSON string to validate
 * @returns Validation result with errors if any
 */
export function validateJson(input: string): ValidationResult {
  const result = safeJsonParse(input);

  if (!result.success) {
    return {
      valid: false,
      errors: [
        {
          path: "",
          message: result.error?.message ?? "Invalid JSON syntax",
          keyword: "syntax",
          line: result.error?.line,
          column: result.error?.column,
        },
      ],
    };
  }

  return { valid: true, errors: [] };
}

/**
 * Validate JSON data against a JSON Schema.
 *
 * @param data - JSON string to validate
 * @param schema - JSON Schema string
 * @returns Validation result with errors if any
 */
export function validateJsonSchema(
  data: string,
  schema: string
): ValidationResult {
  const dataResult = safeJsonParse(data);
  if (!dataResult.success) {
    return {
      valid: false,
      errors: [
        {
          path: "",
          message: `Invalid JSON data: ${dataResult.error?.message}`,
          keyword: "syntax",
          line: dataResult.error?.line,
          column: dataResult.error?.column,
        },
      ],
    };
  }

  const schemaResult = safeJsonParse(schema);
  if (!schemaResult.success) {
    return {
      valid: false,
      errors: [
        {
          path: "",
          message: `Invalid JSON schema: ${schemaResult.error?.message}`,
          keyword: "syntax",
          line: schemaResult.error?.line,
          column: schemaResult.error?.column,
        },
      ],
    };
  }

  try {
    const validate = getOrCompileSchema(schema, schemaResult.data as object);
    const valid = validate(dataResult.data);

    if (valid) {
      return { valid: true, errors: [] };
    }

    return {
      valid: false,
      errors: formatAjvErrors(validate.errors ?? []),
    };
  } catch (e) {
    return {
      valid: false,
      errors: [
        {
          path: "",
          message: `Schema compilation error: ${(e as Error).message}`,
          keyword: "schema",
        },
      ],
    };
  }
}

function formatAjvErrors(errors: ErrorObject[]): ValidationError[] {
  return errors.map((err) => ({
    path: err.instancePath || "/",
    message: err.message ?? "Validation error",
    keyword: err.keyword,
  }));
}

/**
 * Register a schema for use with $ref references.
 *
 * @param schema - JSON Schema string or object
 * @param id - Optional schema ID (uses $id from schema if not provided)
 * @throws Error if schema has no $id and id parameter is not provided
 */
export function addSchema(schema: string | object, id?: string): void {
  const schemaData =
    typeof schema === "string"
      ? safeJsonParse(schema).data
      : schema;

  if (!schemaData || typeof schemaData !== "object") {
    throw new Error("Invalid schema");
  }

  const schemaId = id ?? (schemaData as Record<string, unknown>).$id;
  if (!schemaId || typeof schemaId !== "string") {
    throw new Error("Schema must have $id or id parameter must be provided");
  }

  ajv.addSchema(schemaData, schemaId);
  schemaCache.clear();
}

/**
 * Remove a previously registered schema.
 *
 * @param id - The schema ID to remove
 */
export function removeSchema(id: string): void {
  ajv.removeSchema(id);
  schemaCache.clear();
}

export type { ValidationResult, ValidationError };
