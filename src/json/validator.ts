import Ajv, { type ErrorObject } from "ajv";
import { safeJsonParse } from "./parser";
import type { ValidationResult, ValidationError } from "./types";

const ajv = new Ajv({ allErrors: true, verbose: true });

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
    const validate = ajv.compile(schemaResult.data as object);
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

export type { ValidationResult, ValidationError };
