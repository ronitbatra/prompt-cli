/**
 * JSON diff utilities for comparing prompt metadata
 */

/**
 * Represents a change in a JSON diff
 */
export interface JsonDiffChange {
  path: string; // Dot-separated path to the changed property (e.g., "variables.0", "tags")
  type: "added" | "removed" | "modified";
  oldValue?: unknown;
  newValue?: unknown;
}

/**
 * Result of comparing two JSON objects
 */
export interface JsonDiffResult {
  changes: JsonDiffChange[];
  addedCount: number;
  removedCount: number;
  modifiedCount: number;
  hasChanges: boolean;
}

/**
 * Compare two JSON objects and return a diff
 * Recursively compares objects and arrays to find differences
 *
 * @param oldObj - The original object
 * @param newObj - The new object
 * @param basePath - Base path for nested properties (used internally)
 * @returns Diff result with all changes
 *
 * @example
 * ```typescript
 * const old = { name: "greeting", version: "v1", tags: ["a"] };
 * const new = { name: "greeting", version: "v2", tags: ["a", "b"] };
 * const diff = diffJson(old, new);
 * // Returns: {
 * //   changes: [
 * //     { path: "version", type: "modified", oldValue: "v1", newValue: "v2" },
 * //     { path: "tags.1", type: "added", newValue: "b" }
 * //   ],
 * //   addedCount: 1,
 * //   removedCount: 0,
 * //   modifiedCount: 1,
 * //   hasChanges: true
 * // }
 * ```
 */
export function diffJson(
  oldObj: unknown,
  newObj: unknown,
  basePath = ""
): JsonDiffResult {
  const changes: JsonDiffChange[] = [];

  // Handle null/undefined cases
  if (oldObj === null || oldObj === undefined) {
    if (newObj !== null && newObj !== undefined) {
      changes.push({
        path: basePath || "root",
        type: "added",
        newValue: newObj,
      });
    }
    return buildResult(changes);
  }

  if (newObj === null || newObj === undefined) {
    changes.push({
      path: basePath || "root",
      type: "removed",
      oldValue: oldObj,
    });
    return buildResult(changes);
  }

  // Compare primitive values
  if (isPrimitive(oldObj) || isPrimitive(newObj)) {
    if (oldObj !== newObj) {
      changes.push({
        path: basePath || "root",
        type: "modified",
        oldValue: oldObj,
        newValue: newObj,
      });
    }
    return buildResult(changes);
  }

  // Compare arrays
  if (Array.isArray(oldObj) && Array.isArray(newObj)) {
    return diffArrays(oldObj, newObj, basePath);
  }

  // Compare objects
  if (isObject(oldObj) && isObject(newObj)) {
    return diffObjects(oldObj, newObj, basePath);
  }

  // Type mismatch
  changes.push({
    path: basePath || "root",
    type: "modified",
    oldValue: oldObj,
    newValue: newObj,
  });

  return buildResult(changes);
}

/**
 * Compare two arrays
 */
function diffArrays(
  oldArr: unknown[],
  newArr: unknown[],
  basePath: string
): JsonDiffResult {
  const changes: JsonDiffChange[] = [];
  const maxLength = Math.max(oldArr.length, newArr.length);

  for (let i = 0; i < maxLength; i++) {
    const path = basePath ? `${basePath}.${i}` : `${i}`;
    const oldItem = i < oldArr.length ? oldArr[i] : undefined;
    const newItem = i < newArr.length ? newArr[i] : undefined;

    if (oldItem === undefined && newItem !== undefined) {
      // Item added
      changes.push({
        path,
        type: "added",
        newValue: newItem,
      });
    } else if (oldItem !== undefined && newItem === undefined) {
      // Item removed
      changes.push({
        path,
        type: "removed",
        oldValue: oldItem,
      });
    } else if (oldItem !== undefined && newItem !== undefined) {
      // Compare items
      if (isPrimitive(oldItem) && isPrimitive(newItem)) {
        if (oldItem !== newItem) {
          changes.push({
            path,
            type: "modified",
            oldValue: oldItem,
            newValue: newItem,
          });
        }
      } else {
        // Recursively diff nested objects/arrays
        const nestedDiff = diffJson(oldItem, newItem, path);
        changes.push(...nestedDiff.changes);
      }
    }
  }

  return buildResult(changes);
}

/**
 * Compare two objects
 */
function diffObjects(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>,
  basePath: string
): JsonDiffResult {
  const changes: JsonDiffChange[] = [];
  const allKeys = new Set([
    ...Object.keys(oldObj),
    ...Object.keys(newObj),
  ]);

  for (const key of allKeys) {
    const path = basePath ? `${basePath}.${key}` : key;
    const oldValue = oldObj[key];
    const newValue = newObj[key];

    if (!(key in oldObj) && key in newObj) {
      // Property added
      changes.push({
        path,
        type: "added",
        newValue: newValue,
      });
    } else if (key in oldObj && !(key in newObj)) {
      // Property removed
      changes.push({
        path,
        type: "removed",
        oldValue: oldValue,
      });
    } else if (key in oldObj && key in newObj) {
      // Property exists in both - compare values
      if (isPrimitive(oldValue) && isPrimitive(newValue)) {
        if (oldValue !== newValue) {
          changes.push({
            path,
            type: "modified",
            oldValue: oldValue,
            newValue: newValue,
          });
        }
      } else {
        // Recursively diff nested objects/arrays
        const nestedDiff = diffJson(oldValue, newValue, path);
        changes.push(...nestedDiff.changes);
      }
    }
  }

  return buildResult(changes);
}

/**
 * Check if a value is a primitive type
 */
function isPrimitive(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

/**
 * Check if a value is a plain object
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.prototype.toString.call(value) === "[object Object]"
  );
}

/**
 * Build the final diff result from changes
 */
function buildResult(changes: JsonDiffChange[]): JsonDiffResult {
  const addedCount = changes.filter((c) => c.type === "added").length;
  const removedCount = changes.filter((c) => c.type === "removed").length;
  const modifiedCount = changes.filter((c) => c.type === "modified").length;

  return {
    changes,
    addedCount,
    removedCount,
    modifiedCount,
    hasChanges: changes.length > 0,
  };
}

/**
 * Format JSON diff result as a string (for testing/debugging)
 *
 * @param diff - Diff result
 * @returns Formatted string representation
 */
export function formatJsonDiff(diff: JsonDiffResult): string {
  if (!diff.hasChanges) {
    return "No changes";
  }

  const lines: string[] = [];

  for (const change of diff.changes) {
    const path = change.path || "root";
    switch (change.type) {
      case "added":
        lines.push(`+ ${path}: ${formatValue(change.newValue)}`);
        break;
      case "removed":
        lines.push(`- ${path}: ${formatValue(change.oldValue)}`);
        break;
      case "modified":
        lines.push(
          `~ ${path}: ${formatValue(change.oldValue)} → ${formatValue(change.newValue)}`
        );
        break;
    }
  }

  return lines.join("\n");
}

/**
 * Format a value for display
 */
function formatValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return `"${value}"`;
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (isObject(value)) return `{${Object.keys(value).length} keys}`;
  return String(value);
}

/**
 * Get a summary of the JSON diff
 *
 * @param diff - Diff result
 * @returns Summary string
 */
export function getJsonDiffSummary(diff: JsonDiffResult): string {
  if (!diff.hasChanges) {
    return "No changes";
  }

  const parts: string[] = [];
  if (diff.addedCount > 0) {
    parts.push(
      `${diff.addedCount} propert${diff.addedCount > 1 ? "ies" : "y"} added`
    );
  }
  if (diff.removedCount > 0) {
    parts.push(
      `${diff.removedCount} propert${diff.removedCount > 1 ? "ies" : "y"} removed`
    );
  }
  if (diff.modifiedCount > 0) {
    parts.push(
      `${diff.modifiedCount} propert${diff.modifiedCount > 1 ? "ies" : "y"} modified`
    );
  }

  return parts.join(", ");
}
