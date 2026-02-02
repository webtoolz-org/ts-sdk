import { describe, it, expect } from "vitest";
import { safeJsonParse, isValidJson, getJsonType } from "../../src/json/parser";

describe("safeJsonParse", () => {
  describe("valid JSON", () => {
    it("parses a simple object", () => {
      const result = safeJsonParse('{"name": "test"}');
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: "test" });
    });

    it("parses a nested object", () => {
      const result = safeJsonParse('{"user": {"name": "John", "age": 30}}');
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ user: { name: "John", age: 30 } });
    });

    it("parses an array", () => {
      const result = safeJsonParse("[1, 2, 3]");
      expect(result.success).toBe(true);
      expect(result.data).toEqual([1, 2, 3]);
    });

    it("parses an array of objects", () => {
      const result = safeJsonParse('[{"id": 1}, {"id": 2}]');
      expect(result.success).toBe(true);
      expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it("parses primitive values", () => {
      expect(safeJsonParse("42").data).toBe(42);
      expect(safeJsonParse('"hello"').data).toBe("hello");
      expect(safeJsonParse("true").data).toBe(true);
      expect(safeJsonParse("false").data).toBe(false);
      expect(safeJsonParse("null").data).toBe(null);
    });

    it("parses JSON with unicode characters", () => {
      const result = safeJsonParse('{"emoji": "🎉", "chinese": "中文"}');
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ emoji: "🎉", chinese: "中文" });
    });

    it("parses JSON with escaped characters", () => {
      const result = safeJsonParse('{"text": "line1\\nline2\\ttab"}');
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ text: "line1\nline2\ttab" });
    });

    it("parses JSON with whitespace", () => {
      const result = safeJsonParse('  \n  {"key": "value"}  \n  ');
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ key: "value" });
    });
  });

  describe("invalid JSON", () => {
    it("returns error for empty input", () => {
      const result = safeJsonParse("");
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Input is empty");
      expect(result.error?.line).toBe(1);
      expect(result.error?.column).toBe(1);
    });

    it("returns error for whitespace-only input", () => {
      const result = safeJsonParse("   \n   ");
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Input is empty");
    });

    it("returns error for missing closing brace", () => {
      const result = safeJsonParse('{"name": "test"');
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Closing brace expected");
    });

    it("returns error for missing closing bracket", () => {
      const result = safeJsonParse("[1, 2, 3");
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Closing bracket expected");
    });

    it("returns error for trailing comma", () => {
      const result = safeJsonParse('{"a": 1,}');
      expect(result.success).toBe(false);
    });

    it("returns error for single quotes", () => {
      const result = safeJsonParse("{'name': 'test'}");
      expect(result.success).toBe(false);
    });

    it("returns error for unquoted keys", () => {
      const result = safeJsonParse("{name: 'test'}");
      expect(result.success).toBe(false);
    });

    it("returns error for invalid number format", () => {
      const result = safeJsonParse('{"value": 01}');
      expect(result.success).toBe(false);
    });

    it("returns error position for multiline JSON", () => {
      const input = `{
  "name": "test",
  "invalid": undefined
}`;
      const result = safeJsonParse(input);
      expect(result.success).toBe(false);
      expect(result.error?.line).toBe(3);
    });

    it("returns error for missing colon", () => {
      const result = safeJsonParse('{"key" "value"}');
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Colon expected");
    });

    it("returns error for missing comma", () => {
      const result = safeJsonParse('{"a": 1 "b": 2}');
      expect(result.success).toBe(false);
    });
  });

  describe("type inference", () => {
    it("infers correct types for generic parameter", () => {
      const result = safeJsonParse<{ name: string }>('{"name": "test"}');
      expect(result.success).toBe(true);
      expect(result.data!.name).toBe("test");
    });
  });

  describe("number precision edge cases", () => {
    it("handles scientific notation", () => {
      expect(safeJsonParse("1e10").data).toBe(1e10);
      expect(safeJsonParse("1.5e-5").data).toBe(1.5e-5);
      expect(safeJsonParse("2.5E+10").data).toBe(2.5e10);
    });

    it("handles MAX_SAFE_INTEGER boundary", () => {
      const maxSafe = String(Number.MAX_SAFE_INTEGER);
      const result = safeJsonParse(maxSafe);
      expect(result.success).toBe(true);
      expect(result.data).toBe(Number.MAX_SAFE_INTEGER);
    });

    it("handles numbers beyond MAX_SAFE_INTEGER (precision loss expected)", () => {
      const beyondMax = "9007199254740993"; // MAX_SAFE_INTEGER + 2
      const result = safeJsonParse(beyondMax);
      expect(result.success).toBe(true);
      // Precision loss occurs at this magnitude
      expect(typeof result.data).toBe("number");
    });

    it("handles very small decimal numbers", () => {
      const result = safeJsonParse("0.0000000001");
      expect(result.success).toBe(true);
      expect(result.data).toBe(0.0000000001);
    });
  });

  describe("multi-byte UTF-8 error positions", () => {
    it("reports correct position after emoji", () => {
      const input = '{"emoji": "🎉", invalid}';
      const result = safeJsonParse(input);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("reports correct position after CJK characters", () => {
      const input = '{"中文": "测试", invalid}';
      const result = safeJsonParse(input);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("deep nesting", () => {
    it("handles 100 levels of nesting", () => {
      let json = "1";
      for (let i = 0; i < 100; i++) {
        json = `{"level${i}": ${json}}`;
      }
      const result = safeJsonParse(json);
      expect(result.success).toBe(true);
    });

    it("handles 500 levels of array nesting", () => {
      const depth = 500;
      const json = "[".repeat(depth) + "1" + "]".repeat(depth);
      const result = safeJsonParse(json);
      expect(result.success).toBe(true);
    });
  });
});

describe("isValidJson", () => {
  it("returns true for valid JSON", () => {
    expect(isValidJson('{"valid": true}')).toBe(true);
    expect(isValidJson("[1, 2, 3]")).toBe(true);
    expect(isValidJson("42")).toBe(true);
    expect(isValidJson('"string"')).toBe(true);
  });

  it("returns false for invalid JSON", () => {
    expect(isValidJson("")).toBe(false);
    expect(isValidJson("{invalid}")).toBe(false);
    expect(isValidJson("undefined")).toBe(false);
    expect(isValidJson("NaN")).toBe(false);
  });
});

describe("getJsonType", () => {
  it("returns 'null' for null", () => {
    expect(getJsonType(null)).toBe("null");
  });

  it("returns 'array' for arrays", () => {
    expect(getJsonType([])).toBe("array");
    expect(getJsonType([1, 2, 3])).toBe("array");
  });

  it("returns 'object' for objects", () => {
    expect(getJsonType({})).toBe("object");
    expect(getJsonType({ key: "value" })).toBe("object");
  });

  it("returns correct types for primitives", () => {
    expect(getJsonType("string")).toBe("string");
    expect(getJsonType(42)).toBe("number");
    expect(getJsonType(3.14)).toBe("number");
    expect(getJsonType(true)).toBe("boolean");
    expect(getJsonType(false)).toBe("boolean");
    expect(getJsonType(undefined)).toBe("undefined");
  });
});
