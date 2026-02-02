import { describe, it, expect } from "vitest";
import { compareJson, formatDiffForDisplay } from "../../src/json/differ";
import type { DiffEntry } from "../../src/json/types";

describe("compareJson", () => {
  describe("identical JSON", () => {
    it("returns no differences for identical objects", () => {
      const result = compareJson('{"a": 1}', '{"a": 1}');
      expect(result.success).toBe(true);
      expect(result.differences).toHaveLength(0);
    });

    it("returns no differences for identical arrays", () => {
      const result = compareJson("[1, 2, 3]", "[1, 2, 3]");
      expect(result.success).toBe(true);
      expect(result.differences).toHaveLength(0);
    });

    it("returns no differences for identical nested structures", () => {
      const json = '{"user": {"name": "John", "roles": ["admin", "user"]}}';
      const result = compareJson(json, json);
      expect(result.success).toBe(true);
      expect(result.differences).toHaveLength(0);
    });

    it("returns no differences for null values", () => {
      const result = compareJson("null", "null");
      expect(result.success).toBe(true);
      expect(result.differences).toHaveLength(0);
    });

    it("returns no differences for identical primitives", () => {
      expect(compareJson("42", "42").differences).toHaveLength(0);
      expect(compareJson('"hello"', '"hello"').differences).toHaveLength(0);
      expect(compareJson("true", "true").differences).toHaveLength(0);
    });
  });

  describe("added properties", () => {
    it("detects added property in object", () => {
      const result = compareJson('{"a": 1}', '{"a": 1, "b": 2}');
      expect(result.success).toBe(true);
      expect(result.differences).toHaveLength(1);
      expect(result.differences[0]).toEqual({
        type: "add",
        path: "/b",
        newValue: 2,
      });
    });

    it("detects multiple added properties", () => {
      const result = compareJson("{}", '{"a": 1, "b": 2}');
      expect(result.differences).toHaveLength(2);
      expect(result.differences.every((d) => d.type === "add")).toBe(true);
    });

    it("detects added nested property", () => {
      const result = compareJson('{"user": {}}', '{"user": {"name": "John"}}');
      expect(result.differences).toHaveLength(1);
      expect(result.differences[0].path).toBe("/user/name");
      expect(result.differences[0].type).toBe("add");
    });

    it("detects added array element", () => {
      const result = compareJson("[1, 2]", "[1, 2, 3]");
      expect(result.differences).toHaveLength(1);
      expect(result.differences[0]).toEqual({
        type: "add",
        path: "/2",
        newValue: 3,
      });
    });
  });

  describe("removed properties", () => {
    it("detects removed property from object", () => {
      const result = compareJson('{"a": 1, "b": 2}', '{"a": 1}');
      expect(result.success).toBe(true);
      expect(result.differences).toHaveLength(1);
      expect(result.differences[0]).toEqual({
        type: "remove",
        path: "/b",
        oldValue: 2,
      });
    });

    it("detects multiple removed properties", () => {
      const result = compareJson('{"a": 1, "b": 2}', "{}");
      expect(result.differences).toHaveLength(2);
      expect(result.differences.every((d) => d.type === "remove")).toBe(true);
    });

    it("detects removed nested property", () => {
      const result = compareJson('{"user": {"name": "John"}}', '{"user": {}}');
      expect(result.differences).toHaveLength(1);
      expect(result.differences[0].path).toBe("/user/name");
      expect(result.differences[0].type).toBe("remove");
    });

    it("detects removed array element", () => {
      const result = compareJson("[1, 2, 3]", "[1, 2]");
      expect(result.differences).toHaveLength(1);
      expect(result.differences[0]).toEqual({
        type: "remove",
        path: "/2",
        oldValue: 3,
      });
    });
  });

  describe("updated properties", () => {
    it("detects updated string value", () => {
      const result = compareJson('{"name": "John"}', '{"name": "Jane"}');
      expect(result.differences).toHaveLength(1);
      expect(result.differences[0]).toEqual({
        type: "update",
        path: "/name",
        oldValue: "John",
        newValue: "Jane",
      });
    });

    it("detects updated number value", () => {
      const result = compareJson('{"age": 30}', '{"age": 31}');
      expect(result.differences).toHaveLength(1);
      expect(result.differences[0].oldValue).toBe(30);
      expect(result.differences[0].newValue).toBe(31);
    });

    it("detects updated boolean value", () => {
      const result = compareJson('{"active": true}', '{"active": false}');
      expect(result.differences).toHaveLength(1);
      expect(result.differences[0].oldValue).toBe(true);
      expect(result.differences[0].newValue).toBe(false);
    });

    it("detects updated array element", () => {
      const result = compareJson("[1, 2, 3]", "[1, 5, 3]");
      expect(result.differences).toHaveLength(1);
      expect(result.differences[0].path).toBe("/1");
      expect(result.differences[0].oldValue).toBe(2);
      expect(result.differences[0].newValue).toBe(5);
    });

    it("detects type change as update", () => {
      const result = compareJson('{"value": "123"}', '{"value": 123}');
      expect(result.differences).toHaveLength(1);
      expect(result.differences[0].type).toBe("update");
      expect(result.differences[0].oldValue).toBe("123");
      expect(result.differences[0].newValue).toBe(123);
    });
  });

  describe("null handling", () => {
    it("detects change from null to value", () => {
      const result = compareJson('{"a": null}', '{"a": 1}');
      expect(result.differences).toHaveLength(1);
      expect(result.differences[0].oldValue).toBe(null);
      expect(result.differences[0].newValue).toBe(1);
    });

    it("detects change from value to null", () => {
      const result = compareJson('{"a": 1}', '{"a": null}');
      expect(result.differences).toHaveLength(1);
      expect(result.differences[0].oldValue).toBe(1);
      expect(result.differences[0].newValue).toBe(null);
    });

    it("handles root-level null comparisons", () => {
      const result = compareJson("null", "42");
      expect(result.differences).toHaveLength(1);
      expect(result.differences[0].path).toBe("/");
    });
  });

  describe("array vs object handling", () => {
    it("detects array replaced with object", () => {
      const result = compareJson('{"a": [1, 2]}', '{"a": {"b": 1}}');
      expect(result.differences).toHaveLength(1);
      expect(result.differences[0].type).toBe("update");
      expect(Array.isArray(result.differences[0].oldValue)).toBe(true);
    });

    it("detects object replaced with array", () => {
      const result = compareJson('{"a": {"b": 1}}', '{"a": [1, 2]}');
      expect(result.differences).toHaveLength(1);
      expect(result.differences[0].type).toBe("update");
      expect(Array.isArray(result.differences[0].newValue)).toBe(true);
    });
  });

  describe("complex scenarios", () => {
    it("handles multiple types of changes simultaneously", () => {
      const left = '{"a": 1, "b": 2, "c": 3}';
      const right = '{"a": 10, "c": 3, "d": 4}';
      const result = compareJson(left, right);

      expect(result.differences).toHaveLength(3);

      const update = result.differences.find((d) => d.type === "update");
      const remove = result.differences.find((d) => d.type === "remove");
      const add = result.differences.find((d) => d.type === "add");

      expect(update?.path).toBe("/a");
      expect(remove?.path).toBe("/b");
      expect(add?.path).toBe("/d");
    });

    it("handles deeply nested changes", () => {
      const left = '{"a": {"b": {"c": {"d": 1}}}}';
      const right = '{"a": {"b": {"c": {"d": 2}}}}';
      const result = compareJson(left, right);

      expect(result.differences).toHaveLength(1);
      expect(result.differences[0].path).toBe("/a/b/c/d");
    });

    it("handles arrays of objects with changes", () => {
      const left = '[{"id": 1, "name": "John"}, {"id": 2, "name": "Jane"}]';
      const right = '[{"id": 1, "name": "John"}, {"id": 2, "name": "Janet"}]';
      const result = compareJson(left, right);

      expect(result.differences).toHaveLength(1);
      expect(result.differences[0].path).toBe("/1/name");
    });
  });

  describe("error handling", () => {
    it("returns error for invalid left JSON", () => {
      const result = compareJson("{invalid}", '{"valid": true}');
      expect(result.success).toBe(false);
      expect(result.error).toContain("Left JSON is invalid");
      expect(result.differences).toHaveLength(0);
    });

    it("returns error for invalid right JSON", () => {
      const result = compareJson('{"valid": true}', "{invalid}");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Right JSON is invalid");
    });

    it("returns error for both invalid", () => {
      const result = compareJson("{invalid}", "{also invalid}");
      expect(result.success).toBe(false);
    });

    it("returns error for empty input", () => {
      const result = compareJson("", '{"a": 1}');
      expect(result.success).toBe(false);
    });
  });
});

describe("formatDiffForDisplay", () => {
  it("formats add diff entry", () => {
    const entry: DiffEntry = {
      type: "add",
      path: "newField",
      newValue: "value",
    };
    expect(formatDiffForDisplay(entry)).toBe('+ newField: "value"');
  });

  it("formats remove diff entry", () => {
    const entry: DiffEntry = {
      type: "remove",
      path: "oldField",
      oldValue: 123,
    };
    expect(formatDiffForDisplay(entry)).toBe("- oldField: 123");
  });

  it("formats update diff entry", () => {
    const entry: DiffEntry = {
      type: "update",
      path: "field",
      oldValue: "old",
      newValue: "new",
    };
    expect(formatDiffForDisplay(entry)).toBe('~ field: "old" → "new"');
  });

  it("handles complex values", () => {
    const entry: DiffEntry = {
      type: "add",
      path: "obj",
      newValue: { nested: true },
    };
    expect(formatDiffForDisplay(entry)).toBe('+ obj: {"nested":true}');
  });

  it("handles array paths", () => {
    const entry: DiffEntry = {
      type: "update",
      path: "/0/name",
      oldValue: "old",
      newValue: "new",
    };
    expect(formatDiffForDisplay(entry)).toContain("/0/name");
  });
});

describe("edge cases", () => {
  describe("root-level type changes", () => {
    it("detects object to array change at root (reports individual changes)", () => {
      const result = compareJson('{"a": 1}', "[1, 2, 3]");
      expect(result.success).toBe(true);
      // microdiff reports individual property changes when both are objects
      expect(result.differences.length).toBeGreaterThan(0);
    });

    it("detects array to object change at root (reports individual changes)", () => {
      const result = compareJson("[1, 2, 3]", '{"a": 1}');
      expect(result.success).toBe(true);
      expect(result.differences.length).toBeGreaterThan(0);
    });

    it("detects primitive to object change at root", () => {
      const result = compareJson("42", '{"a": 1}');
      expect(result.success).toBe(true);
      expect(result.differences).toHaveLength(1);
      expect(result.differences[0].path).toBe("/");
      expect(result.differences[0].oldValue).toBe(42);
    });

    it("detects object to primitive change at root", () => {
      const result = compareJson('{"a": 1}', "42");
      expect(result.success).toBe(true);
      expect(result.differences).toHaveLength(1);
      expect(result.differences[0].path).toBe("/");
      expect(result.differences[0].newValue).toBe(42);
    });

    it("handles primitive to array change", () => {
      const result = compareJson('"hello"', "[1, 2, 3]");
      expect(result.success).toBe(true);
      expect(result.differences).toHaveLength(1);
    });
  });

  describe("JSONPointer path formatting (RFC 6901)", () => {
    it("escapes tilde in property names", () => {
      const result = compareJson('{"a~b": 1}', '{"a~b": 2}');
      expect(result.differences[0].path).toBe("/a~0b");
    });

    it("escapes forward slash in property names", () => {
      const result = compareJson('{"a/b": 1}', '{"a/b": 2}');
      expect(result.differences[0].path).toBe("/a~1b");
    });

    it("escapes both tilde and slash in property names", () => {
      const result = compareJson('{"a~/b": 1}', '{"a~/b": 2}');
      expect(result.differences[0].path).toBe("/a~0~1b");
    });
  });

  describe("large diffs performance", () => {
    it("handles 100+ changes efficiently", () => {
      const leftObj: Record<string, number> = {};
      const rightObj: Record<string, number> = {};

      for (let i = 0; i < 100; i++) {
        leftObj[`key${i}`] = i;
        rightObj[`key${i}`] = i + 1;
      }

      const result = compareJson(JSON.stringify(leftObj), JSON.stringify(rightObj));
      expect(result.success).toBe(true);
      expect(result.differences).toHaveLength(100);
    });
  });
});
