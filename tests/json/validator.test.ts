import { describe, it, expect } from "vitest";
import { validateJson, validateJsonSchema } from "../../src/json/validator";

describe("validateJson", () => {
  describe("valid JSON", () => {
    it("validates a simple object", () => {
      const result = validateJson('{"name": "test"}');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("validates an array", () => {
      const result = validateJson("[1, 2, 3]");
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("validates primitive values", () => {
      expect(validateJson("42").valid).toBe(true);
      expect(validateJson('"string"').valid).toBe(true);
      expect(validateJson("true").valid).toBe(true);
      expect(validateJson("null").valid).toBe(true);
    });

    it("validates nested structures", () => {
      const result = validateJson('{"user": {"name": "John", "roles": ["admin"]}}');
      expect(result.valid).toBe(true);
    });
  });

  describe("invalid JSON", () => {
    it("returns error for empty input", () => {
      const result = validateJson("");
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].keyword).toBe("syntax");
    });

    it("returns error with line and column for syntax errors", () => {
      const result = validateJson('{"invalid": }');
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].line).toBe(1);
      expect(result.errors[0].column).toBe(13);
      expect(result.errors[0].message).toBe("Value expected");
      expect(result.errors[0].keyword).toBe("syntax");
    });

    it("returns descriptive error messages", () => {
      const result = validateJson("{missing: value}");
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toBe("Invalid symbol");
      expect(result.errors[0].line).toBe(1);
      expect(result.errors[0].column).toBe(2);
    });

    it("catches trailing comma errors", () => {
      const result = validateJson('{"a": 1,}');
      expect(result.valid).toBe(false);
    });

    it("catches missing brackets", () => {
      const result = validateJson('{"array": [1, 2');
      expect(result.valid).toBe(false);
    });
  });
});

describe("validateJsonSchema", () => {
  describe("valid data against schema", () => {
    it("validates data matching a simple schema", () => {
      const data = '{"name": "John", "age": 30}';
      const schema = `{
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "age": { "type": "number" }
        },
        "required": ["name", "age"]
      }`;

      const result = validateJsonSchema(data, schema);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("validates array items against schema", () => {
      const data = "[1, 2, 3]";
      const schema = `{
        "type": "array",
        "items": { "type": "number" }
      }`;

      const result = validateJsonSchema(data, schema);
      expect(result.valid).toBe(true);
    });

    it("validates nested objects", () => {
      const data = '{"user": {"email": "test@example.com"}}';
      const schema = `{
        "type": "object",
        "properties": {
          "user": {
            "type": "object",
            "properties": {
              "email": { "type": "string" }
            }
          }
        }
      }`;

      const result = validateJsonSchema(data, schema);
      expect(result.valid).toBe(true);
    });

    it("validates with additional properties allowed", () => {
      const data = '{"name": "John", "extra": "field"}';
      const schema = `{
        "type": "object",
        "properties": {
          "name": { "type": "string" }
        }
      }`;

      const result = validateJsonSchema(data, schema);
      expect(result.valid).toBe(true);
    });
  });

  describe("invalid data against schema", () => {
    it("returns error for wrong type", () => {
      const data = '{"age": "thirty"}';
      const schema = `{
        "type": "object",
        "properties": {
          "age": { "type": "number" }
        }
      }`;

      const result = validateJsonSchema(data, schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].keyword).toBe("type");
      expect(result.errors[0].path).toBe("/age");
      expect(result.errors[0].message).toBe("must be number");
    });

    it("returns error for missing required field", () => {
      const data = '{"name": "John"}';
      const schema = `{
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "email": { "type": "string" }
        },
        "required": ["name", "email"]
      }`;

      const result = validateJsonSchema(data, schema);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.keyword === "required")).toBe(true);
    });

    it("returns error for array item type mismatch", () => {
      const data = '[1, "two", 3]';
      const schema = `{
        "type": "array",
        "items": { "type": "number" }
      }`;

      const result = validateJsonSchema(data, schema);
      expect(result.valid).toBe(false);
    });

    it("returns all errors when multiple validations fail", () => {
      const data = '{"a": "string", "b": "string"}';
      const schema = `{
        "type": "object",
        "properties": {
          "a": { "type": "number" },
          "b": { "type": "number" }
        }
      }`;

      const result = validateJsonSchema(data, schema);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(2);
    });

    it("returns error path for nested validation failures", () => {
      const data = '{"user": {"age": "old"}}';
      const schema = `{
        "type": "object",
        "properties": {
          "user": {
            "type": "object",
            "properties": {
              "age": { "type": "number" }
            }
          }
        }
      }`;

      const result = validateJsonSchema(data, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].path).toContain("user");
    });

    it("validates additionalProperties constraint", () => {
      const data = '{"name": "John", "extra": "field"}';
      const schema = `{
        "type": "object",
        "properties": {
          "name": { "type": "string" }
        },
        "additionalProperties": false
      }`;

      const result = validateJsonSchema(data, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].keyword).toBe("additionalProperties");
    });
  });

  describe("invalid inputs", () => {
    it("returns error for invalid JSON data", () => {
      const result = validateJsonSchema("{invalid}", '{"type": "object"}');
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain("Invalid JSON data");
    });

    it("returns error for invalid JSON schema", () => {
      const result = validateJsonSchema('{"valid": true}', "{invalid schema}");
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain("Invalid JSON schema");
    });

    it("returns error for invalid schema structure", () => {
      const result = validateJsonSchema('{"a": 1}', '{"type": "invalid_type"}');
      expect(result.valid).toBe(false);
      expect(result.errors[0].keyword).toBe("schema");
    });

    it("returns error for empty data", () => {
      const result = validateJsonSchema("", '{"type": "object"}');
      expect(result.valid).toBe(false);
    });

    it("returns error for empty schema", () => {
      const result = validateJsonSchema('{"a": 1}', "");
      expect(result.valid).toBe(false);
    });
  });

  describe("complex schema features", () => {
    it("validates enum constraints", () => {
      const schema = `{
        "type": "object",
        "properties": {
          "status": { "enum": ["active", "inactive"] }
        }
      }`;

      expect(validateJsonSchema('{"status": "active"}', schema).valid).toBe(true);
      expect(validateJsonSchema('{"status": "unknown"}', schema).valid).toBe(false);
    });

    it("validates minimum/maximum constraints", () => {
      const schema = `{
        "type": "object",
        "properties": {
          "age": { "type": "number", "minimum": 0, "maximum": 120 }
        }
      }`;

      expect(validateJsonSchema('{"age": 30}', schema).valid).toBe(true);
      expect(validateJsonSchema('{"age": -1}', schema).valid).toBe(false);
      expect(validateJsonSchema('{"age": 150}', schema).valid).toBe(false);
    });

    it("validates string length constraints", () => {
      const schema = `{
        "type": "object",
        "properties": {
          "name": { "type": "string", "minLength": 1, "maxLength": 50 }
        }
      }`;

      expect(validateJsonSchema('{"name": "John"}', schema).valid).toBe(true);
      expect(validateJsonSchema('{"name": ""}', schema).valid).toBe(false);
    });

    it("validates pattern constraints", () => {
      const schema = `{
        "type": "object",
        "properties": {
          "code": { "type": "string", "pattern": "^[A-Z]{3}[0-9]{3}$" }
        }
      }`;

      expect(validateJsonSchema('{"code": "ABC123"}', schema).valid).toBe(true);
      expect(validateJsonSchema('{"code": "abc123"}', schema).valid).toBe(false);
    });

    it("validates array length constraints", () => {
      const schema = `{
        "type": "array",
        "minItems": 1,
        "maxItems": 5
      }`;

      expect(validateJsonSchema("[1, 2, 3]", schema).valid).toBe(true);
      expect(validateJsonSchema("[]", schema).valid).toBe(false);
      expect(validateJsonSchema("[1,2,3,4,5,6]", schema).valid).toBe(false);
    });
  });
});
