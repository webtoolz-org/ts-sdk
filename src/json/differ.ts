import microdiff, { type Difference } from "microdiff";
import { safeJsonParse } from "./parser";
import type { DiffResult, DiffEntry } from "./types";

/**
 * Compare two JSON strings and return their differences.
 *
 * @param left - The first JSON string
 * @param right - The second JSON string
 * @returns Diff result with list of differences
 */
export function compareJson(left: string, right: string): DiffResult {
  const leftResult = safeJsonParse(left);
  const rightResult = safeJsonParse(right);

  if (!leftResult.success) {
    return {
      success: false,
      differences: [],
      error: `Left JSON is invalid: ${leftResult.error?.message}`,
    };
  }

  if (!rightResult.success) {
    return {
      success: false,
      differences: [],
      error: `Right JSON is invalid: ${rightResult.error?.message}`,
    };
  }

  try {
    // microdiff doesn't handle root-level primitive comparisons
    // If both values are primitives (not objects/arrays), compare directly
    const leftData = leftResult.data;
    const rightData = rightResult.data;

    if (
      (leftData === null || typeof leftData !== "object") &&
      (rightData === null || typeof rightData !== "object")
    ) {
      if (leftData !== rightData) {
        return {
          success: true,
          differences: [
            {
              type: "update",
              path: "/",
              oldValue: leftData,
              newValue: rightData,
            },
          ],
        };
      }
      return { success: true, differences: [] };
    }

    const diffs = microdiff(
      leftData as Record<string, unknown> | unknown[],
      rightData as Record<string, unknown> | unknown[]
    );
    const differences = diffs.map(convertDiff);

    return {
      success: true,
      differences,
    };
  } catch (e) {
    return {
      success: false,
      differences: [],
      error: `Diff error: ${(e as Error).message}`,
    };
  }
}

function convertDiff(diff: Difference): DiffEntry {
  const path = formatPath(diff.path);

  switch (diff.type) {
    case "CREATE":
      return {
        type: "add",
        path,
        newValue: diff.value,
      };
    case "REMOVE":
      return {
        type: "remove",
        path,
        oldValue: diff.oldValue,
      };
    case "CHANGE":
      return {
        type: "update",
        path,
        oldValue: diff.oldValue,
        newValue: diff.value,
      };
  }
}

function formatPath(pathArray: (string | number)[]): string {
  if (pathArray.length === 0) {
    return "/";
  }

  return pathArray
    .map((segment, index) => {
      if (typeof segment === "number") {
        return `[${segment}]`;
      }
      return index === 0 ? segment : `.${segment}`;
    })
    .join("");
}

/**
 * Format a diff entry for display.
 *
 * @param diff - The diff entry to format
 * @returns Formatted string representation
 */
export function formatDiffForDisplay(diff: DiffEntry): string {
  switch (diff.type) {
    case "add":
      return `+ ${diff.path}: ${JSON.stringify(diff.newValue)}`;
    case "remove":
      return `- ${diff.path}: ${JSON.stringify(diff.oldValue)}`;
    case "update":
      return `~ ${diff.path}: ${JSON.stringify(diff.oldValue)} → ${JSON.stringify(diff.newValue)}`;
  }
}

export type { DiffResult, DiffEntry };
