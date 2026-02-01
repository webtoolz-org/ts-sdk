import { describe, it, expect } from "vitest";
import { formatJson, minifyJson, beautifyJson, getJsonStats } from "../../src/json/formatter";

describe("formatJson", () => {
  describe("basic formatting", () => {
    it("formats a simple object with default options", () => {
      const result = formatJson('{"a":1,"b":2}');
      expect(result).toBe('{\n  "a": 1,\n  "b": 2\n}');
    });

    it("formats a nested object", () => {
      const result = formatJson('{"user":{"name":"John","age":30}}');
      expect(result).toContain('"user"');
      expect(result).toContain('"name": "John"');
      expect(result.split("\n").length).toBeGreaterThan(1);
    });

    it("formats an array", () => {
      const result = formatJson("[1,2,3]");
      expect(result).toBe("[\n  1,\n  2,\n  3\n]");
    });

    it("accepts already-parsed objects", () => {
      const result = formatJson({ a: 1, b: 2 });
      expect(result).toBe('{\n  "a": 1,\n  "b": 2\n}');
    });
  });

  describe("indent options", () => {
    it("uses 2-space indent by default", () => {
      const result = formatJson('{"a":1}');
      expect(result).toBe('{\n  "a": 1\n}');
    });

    it("uses 4-space indent when specified", () => {
      const result = formatJson('{"a":1}', { indentSize: 4 });
      expect(result).toBe('{\n    "a": 1\n}');
    });

    it("uses tab indent when specified", () => {
      const result = formatJson('{"a":1}', { indentChar: "tab" });
      expect(result).toBe('{\n\t"a": 1\n}');
    });

    it("ignores indentSize when using tabs", () => {
      const result = formatJson('{"a":1}', { indentChar: "tab", indentSize: 4 });
      expect(result).toBe('{\n\t"a": 1\n}');
    });
  });

  describe("key sorting", () => {
    it("does not sort keys by default", () => {
      const result = formatJson('{"z":1,"a":2,"m":3}');
      const keys = result.match(/"[zam]"/g);
      expect(keys).toEqual(['"z"', '"a"', '"m"']);
    });

    it("sorts keys alphabetically when enabled", () => {
      const result = formatJson('{"z":1,"a":2,"m":3}', { sortKeys: true });
      const keys = result.match(/"[zam]"/g);
      expect(keys).toEqual(['"a"', '"m"', '"z"']);
    });

    it("sorts nested object keys", () => {
      const input = '{"outer":{"z":1,"a":2},"inner":{"y":3,"b":4}}';
      const result = formatJson(input, { sortKeys: true });
      expect(result.indexOf('"a"')).toBeLessThan(result.indexOf('"z"'));
      expect(result.indexOf('"b"')).toBeLessThan(result.indexOf('"y"'));
    });

    it("sorts keys in arrays of objects", () => {
      const input = '[{"z":1,"a":2},{"y":3,"b":4}]';
      const result = formatJson(input, { sortKeys: true });
      const firstObjectMatch = result.match(/\{[^}]+\}/);
      expect(firstObjectMatch?.[0]).toContain('"a"');
    });

    it("handles null values when sorting", () => {
      const result = formatJson('{"b":null,"a":1}', { sortKeys: true });
      expect(result.indexOf('"a"')).toBeLessThan(result.indexOf('"b"'));
    });
  });

  describe("error handling", () => {
    it("throws for invalid JSON string", () => {
      expect(() => formatJson("{invalid}")).toThrow("Invalid JSON input");
    });

    it("throws for undefined data from parsed object", () => {
      expect(() => formatJson("")).toThrow();
    });
  });

  describe("edge cases", () => {
    it("handles empty object", () => {
      expect(formatJson("{}")).toBe("{}");
    });

    it("handles empty array", () => {
      expect(formatJson("[]")).toBe("[]");
    });

    it("handles deeply nested structures", () => {
      const deep = '{"a":{"b":{"c":{"d":1}}}}';
      const result = formatJson(deep);
      expect(result.split("\n").length).toBe(9);
    });

    it("preserves unicode characters", () => {
      const result = formatJson('{"emoji":"🎉"}');
      expect(result).toContain("🎉");
    });

    it("handles special characters in strings", () => {
      const result = formatJson('{"text":"line1\\nline2"}');
      expect(result).toContain("\\n");
    });
  });
});

describe("minifyJson", () => {
  it("minifies a formatted object", () => {
    const formatted = '{\n  "a": 1,\n  "b": 2\n}';
    expect(minifyJson(formatted)).toBe('{"a":1,"b":2}');
  });

  it("minifies a nested object", () => {
    const formatted = '{\n  "user": {\n    "name": "John"\n  }\n}';
    expect(minifyJson(formatted)).toBe('{"user":{"name":"John"}}');
  });

  it("minifies an array", () => {
    const formatted = "[\n  1,\n  2,\n  3\n]";
    expect(minifyJson(formatted)).toBe("[1,2,3]");
  });

  it("accepts already-parsed objects", () => {
    expect(minifyJson({ a: 1, b: 2 })).toBe('{"a":1,"b":2}');
  });

  it("handles already minified JSON", () => {
    expect(minifyJson('{"a":1}')).toBe('{"a":1}');
  });

  it("throws for invalid JSON", () => {
    expect(() => minifyJson("{invalid}")).toThrow("Invalid JSON input");
  });
});

describe("beautifyJson", () => {
  it("is an alias for formatJson", () => {
    const input = '{"a":1}';
    expect(beautifyJson(input)).toBe(formatJson(input));
  });

  it("accepts options like formatJson", () => {
    const input = '{"a":1}';
    expect(beautifyJson(input, { indentSize: 4 })).toBe(
      formatJson(input, { indentSize: 4 })
    );
  });
});

describe("getJsonStats", () => {
  it("returns stats for valid JSON", () => {
    const stats = getJsonStats('{"name": "test", "age": 30}');
    expect(stats.valid).toBe(true);
    expect(stats.keys).toBe(2);
    expect(stats.type).toBe("object");
    expect(stats.depth).toBe(1);
    expect(stats.size).toBe(27);
    expect(stats.minifiedSize).toBe(24);
  });

  it("returns correct stats for invalid JSON", () => {
    const stats = getJsonStats("{invalid}");
    expect(stats.valid).toBe(false);
    expect(stats.keys).toBe(0);
    expect(stats.depth).toBe(0);
    expect(stats.minifiedSize).toBe(0);
    expect(stats.type).toBe("invalid");
    expect(stats.size).toBe(9);
  });

  it("counts nested keys", () => {
    const stats = getJsonStats('{"a": {"b": 1, "c": 2}, "d": 3}');
    expect(stats.keys).toBe(4);
    expect(stats.size).toBe(31);
    expect(stats.minifiedSize).toBe(25);
    expect(stats.depth).toBe(2);
  });

  it("counts keys in arrays of objects", () => {
    const stats = getJsonStats('[{"a": 1}, {"b": 2}]');
    expect(stats.keys).toBe(2);
    expect(stats.size).toBe(20);
    expect(stats.minifiedSize).toBe(17);
    expect(stats.depth).toBe(2);
  });

  it("calculates depth correctly", () => {
    expect(getJsonStats("42").depth).toBe(0);
    expect(getJsonStats("{}").depth).toBe(1);
    expect(getJsonStats('{"a": 1}').depth).toBe(1);
    expect(getJsonStats('{"a": {"b": 1}}').depth).toBe(2);
    expect(getJsonStats('{"a": {"b": {"c": 1}}}').depth).toBe(3);
  });

  it("returns correct size and minifiedSize for various depths", () => {
    const stats0 = getJsonStats("42");
    expect(stats0.size).toBe(2);
    expect(stats0.minifiedSize).toBe(2);

    const stats1 = getJsonStats("{}");
    expect(stats1.size).toBe(2);
    expect(stats1.minifiedSize).toBe(2);

    const stats2 = getJsonStats('{"a": 1}');
    expect(stats2.size).toBe(8);
    expect(stats2.minifiedSize).toBe(7);

    const stats3 = getJsonStats('{"a": {"b": 1}}');
    expect(stats3.size).toBe(15);
    expect(stats3.minifiedSize).toBe(13);

    const stats4 = getJsonStats('{"a": {"b": {"c": 1}}}');
    expect(stats4.size).toBe(22);
    expect(stats4.minifiedSize).toBe(19);
  });

  it("calculates depth for arrays", () => {
    expect(getJsonStats("[]").depth).toBe(1);
    expect(getJsonStats("[1, 2, 3]").depth).toBe(1);
    expect(getJsonStats("[[1], [2]]").depth).toBe(2);
    expect(getJsonStats('[{"a": [1]}]').depth).toBe(3);
  });

  it("returns correct size for arrays", () => {
    expect(getJsonStats("[]").size).toBe(2);
    expect(getJsonStats("[1, 2, 3]").size).toBe(9);
    expect(getJsonStats("[[1], [2]]").size).toBe(10);
    expect(getJsonStats('[{"a": [1]}]').size).toBe(12);
  });

  it("returns correct types", () => {
    expect(getJsonStats('{"a": 1}').type).toBe("object");
    expect(getJsonStats("[1, 2]").type).toBe("array");
    expect(getJsonStats("null").type).toBe("null");
  });

  it("calculates size correctly", () => {
    const input = '{"a": 1}';
    const stats = getJsonStats(input);
    expect(stats.size).toBe(new Blob([input]).size);
    expect(stats.minifiedSize).toBe(new Blob(['{"a":1}']).size);
  });
});
