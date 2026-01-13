import { describe, it, expect } from "vitest";
import {
  diffJson,
  formatJsonDiff,
  getJsonDiffSummary,
} from "./json-diff";
import type { PromptMetadata } from "../types/prompt";

describe("JSON Diff", () => {
  describe("diffJson", () => {
    it("should detect no changes for identical objects", () => {
      const obj = { name: "greeting", version: "v1" };
      const diff = diffJson(obj, obj);

      expect(diff.hasChanges).toBe(false);
      expect(diff.addedCount).toBe(0);
      expect(diff.removedCount).toBe(0);
      expect(diff.modifiedCount).toBe(0);
      expect(diff.changes).toEqual([]);
    });

    it("should detect added properties", () => {
      const oldObj = { name: "greeting" };
      const newObj = { name: "greeting", version: "v1" };
      const diff = diffJson(oldObj, newObj);

      expect(diff.hasChanges).toBe(true);
      expect(diff.addedCount).toBe(1);
      expect(diff.removedCount).toBe(0);
      expect(diff.modifiedCount).toBe(0);
      expect(diff.changes).toEqual([
        {
          path: "version",
          type: "added",
          newValue: "v1",
        },
      ]);
    });

    it("should detect removed properties", () => {
      const oldObj = { name: "greeting", version: "v1" };
      const newObj = { name: "greeting" };
      const diff = diffJson(oldObj, newObj);

      expect(diff.hasChanges).toBe(true);
      expect(diff.addedCount).toBe(0);
      expect(diff.removedCount).toBe(1);
      expect(diff.modifiedCount).toBe(0);
      expect(diff.changes).toEqual([
        {
          path: "version",
          type: "removed",
          oldValue: "v1",
        },
      ]);
    });

    it("should detect modified properties", () => {
      const oldObj = { name: "greeting", version: "v1" };
      const newObj = { name: "greeting", version: "v2" };
      const diff = diffJson(oldObj, newObj);

      expect(diff.hasChanges).toBe(true);
      expect(diff.addedCount).toBe(0);
      expect(diff.removedCount).toBe(0);
      expect(diff.modifiedCount).toBe(1);
      expect(diff.changes).toEqual([
        {
          path: "version",
          type: "modified",
          oldValue: "v1",
          newValue: "v2",
        },
      ]);
    });

    it("should handle nested objects", () => {
      const oldObj = { metadata: { name: "greeting", version: "v1" } };
      const newObj = { metadata: { name: "greeting", version: "v2" } };
      const diff = diffJson(oldObj, newObj);

      expect(diff.hasChanges).toBe(true);
      expect(diff.changes).toEqual([
        {
          path: "metadata.version",
          type: "modified",
          oldValue: "v1",
          newValue: "v2",
        },
      ]);
    });

    it("should handle arrays", () => {
      const oldObj = { tags: ["a", "b"] };
      const newObj = { tags: ["a", "b", "c"] };
      const diff = diffJson(oldObj, newObj);

      expect(diff.hasChanges).toBe(true);
      expect(diff.addedCount).toBe(1);
      expect(diff.changes).toEqual([
        {
          path: "tags.2",
          type: "added",
          newValue: "c",
        },
      ]);
    });

    it("should handle array item removal", () => {
      const oldObj = { tags: ["a", "b", "c"] };
      const newObj = { tags: ["a", "b"] };
      const diff = diffJson(oldObj, newObj);

      expect(diff.hasChanges).toBe(true);
      expect(diff.removedCount).toBe(1);
      expect(diff.changes).toEqual([
        {
          path: "tags.2",
          type: "removed",
          oldValue: "c",
        },
      ]);
    });

    it("should handle array item modification", () => {
      const oldObj = { tags: ["a", "b"] };
      const newObj = { tags: ["a", "c"] };
      const diff = diffJson(oldObj, newObj);

      expect(diff.hasChanges).toBe(true);
      expect(diff.modifiedCount).toBe(1);
      expect(diff.changes).toEqual([
        {
          path: "tags.1",
          type: "modified",
          oldValue: "b",
          newValue: "c",
        },
      ]);
    });

    it("should handle empty objects", () => {
      const diff = diffJson({}, {});

      expect(diff.hasChanges).toBe(false);
    });

    it("should handle null values", () => {
      const oldObj = { description: null };
      const newObj = { description: "A description" };
      const diff = diffJson(oldObj, newObj);

      expect(diff.hasChanges).toBe(true);
      expect(diff.modifiedCount).toBe(1);
    });

    it("should handle undefined values", () => {
      const oldObj = { description: undefined };
      const newObj = { description: "A description" };
      const diff = diffJson(oldObj, newObj);

      expect(diff.hasChanges).toBe(true);
    });

    it("should handle property becoming undefined", () => {
      const oldObj = { description: "A description" };
      const newObj = { description: undefined };
      const diff = diffJson(oldObj, newObj);

      expect(diff.hasChanges).toBe(true);
      expect(diff.modifiedCount).toBe(1);
    });

    it("should handle nested arrays", () => {
      const oldObj = { items: [["a"], ["b"]] };
      const newObj = { items: [["a"], ["b", "c"]] };
      const diff = diffJson(oldObj, newObj);

      expect(diff.hasChanges).toBe(true);
      expect(diff.changes.some((c) => c.path === "items.1.1")).toBe(true);
    });

    it("should handle complex PromptMetadata diff", () => {
      const oldMeta: PromptMetadata = {
        name: "greeting",
        version: "v1",
        description: "A greeting",
        variables: ["userName"],
        tags: ["greeting"],
        createdAt: "2024-01-01",
      };

      const newMeta: PromptMetadata = {
        name: "greeting",
        version: "v2",
        description: "A friendly greeting",
        variables: ["userName", "tone"],
        tags: ["greeting", "example"],
        createdAt: "2024-01-01",
        updatedAt: "2024-01-02",
      };

      const diff = diffJson(oldMeta, newMeta);

      expect(diff.hasChanges).toBe(true);
      expect(diff.changes.some((c) => c.path === "version")).toBe(true);
      expect(diff.changes.some((c) => c.path === "description")).toBe(true);
      expect(diff.changes.some((c) => c.path === "variables.1")).toBe(true);
      expect(diff.changes.some((c) => c.path === "tags.1")).toBe(true);
      expect(diff.changes.some((c) => c.path === "updatedAt")).toBe(true);
    });

    it("should handle type mismatches", () => {
      const oldObj = { value: "string" };
      const newObj = { value: 123 };
      const diff = diffJson(oldObj, newObj);

      expect(diff.hasChanges).toBe(true);
      expect(diff.modifiedCount).toBe(1);
    });

    it("should handle boolean values", () => {
      const oldObj = { active: false };
      const newObj = { active: true };
      const diff = diffJson(oldObj, newObj);

      expect(diff.hasChanges).toBe(true);
      expect(diff.modifiedCount).toBe(1);
    });

    it("should handle number values", () => {
      const oldObj = { count: 1 };
      const newObj = { count: 2 };
      const diff = diffJson(oldObj, newObj);

      expect(diff.hasChanges).toBe(true);
      expect(diff.modifiedCount).toBe(1);
    });
  });

  describe("formatJsonDiff", () => {
    it("should format diff correctly", () => {
      const oldObj = { name: "greeting", version: "v1" };
      const newObj = { name: "greeting", version: "v2" };
      const diff = diffJson(oldObj, newObj);
      const formatted = formatJsonDiff(diff);

      expect(formatted).toContain("version");
      expect(formatted).toContain("v1");
      expect(formatted).toContain("v2");
    });

    it("should return 'No changes' for identical objects", () => {
      const obj = { name: "greeting" };
      const diff = diffJson(obj, obj);
      const formatted = formatJsonDiff(diff);

      expect(formatted).toBe("No changes");
    });
  });

  describe("getJsonDiffSummary", () => {
    it("should return 'No changes' for identical objects", () => {
      const obj = { name: "greeting" };
      const diff = diffJson(obj, obj);
      const summary = getJsonDiffSummary(diff);

      expect(summary).toBe("No changes");
    });

    it("should summarize added properties", () => {
      const oldObj = { name: "greeting" };
      const newObj = { name: "greeting", version: "v1" };
      const diff = diffJson(oldObj, newObj);
      const summary = getJsonDiffSummary(diff);

      expect(summary).toBe("1 property added");
    });

    it("should summarize removed properties", () => {
      const oldObj = { name: "greeting", version: "v1" };
      const newObj = { name: "greeting" };
      const diff = diffJson(oldObj, newObj);
      const summary = getJsonDiffSummary(diff);

      expect(summary).toBe("1 property removed");
    });

    it("should summarize modified properties", () => {
      const oldObj = { name: "greeting", version: "v1" };
      const newObj = { name: "greeting", version: "v2" };
      const diff = diffJson(oldObj, newObj);
      const summary = getJsonDiffSummary(diff);

      expect(summary).toBe("1 property modified");
    });

    it("should summarize multiple changes", () => {
      const oldObj = { name: "greeting", version: "v1", tags: ["a"] };
      const newObj = { name: "greeting", version: "v2", tags: ["a", "b"] };
      const diff = diffJson(oldObj, newObj);
      const summary = getJsonDiffSummary(diff);

      expect(summary).toContain("modified");
      expect(summary).toContain("added");
    });

    it("should use plural form for multiple properties", () => {
      const oldObj = { a: 1, b: 2 };
      const newObj = { a: 1, b: 2, c: 3, d: 4 };
      const diff = diffJson(oldObj, newObj);
      const summary = getJsonDiffSummary(diff);

      expect(summary).toContain("properties");
    });
  });
});
