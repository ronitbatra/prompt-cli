import { describe, it, expect } from "vitest";
import { diffText, formatDiff, getDiffSummary } from "./text-diff";

describe("Text Diff", () => {
  describe("diffText", () => {
    it("should detect no changes for identical texts", () => {
      const text = "Hello\nWorld";
      const diff = diffText(text, text);

      expect(diff.hasChanges).toBe(false);
      expect(diff.addedCount).toBe(0);
      expect(diff.removedCount).toBe(0);
      expect(diff.unchangedCount).toBe(2);
      expect(diff.lines).toEqual([
        { type: "unchanged", content: "Hello", lineNumber: 1 },
        { type: "unchanged", content: "World", lineNumber: 2 },
      ]);
    });

    it("should detect added lines", () => {
      const oldText = "Hello";
      const newText = "Hello\nWorld";
      const diff = diffText(oldText, newText);

      expect(diff.hasChanges).toBe(true);
      expect(diff.addedCount).toBe(1);
      expect(diff.removedCount).toBe(0);
      expect(diff.lines).toEqual([
        { type: "unchanged", content: "Hello", lineNumber: 1 },
        { type: "added", content: "World" },
      ]);
    });

    it("should detect removed lines", () => {
      const oldText = "Hello\nWorld";
      const newText = "Hello";
      const diff = diffText(oldText, newText);

      expect(diff.hasChanges).toBe(true);
      expect(diff.addedCount).toBe(0);
      expect(diff.removedCount).toBe(1);
      expect(diff.lines).toEqual([
        { type: "unchanged", content: "Hello", lineNumber: 1 },
        { type: "removed", content: "World", lineNumber: 2 },
      ]);
    });

    it("should detect modified lines", () => {
      const oldText = "Hello\nWorld";
      const newText = "Hello\nUniverse";
      const diff = diffText(oldText, newText);

      expect(diff.hasChanges).toBe(true);
      expect(diff.addedCount).toBe(1);
      expect(diff.removedCount).toBe(1);
      expect(diff.lines).toEqual([
        { type: "unchanged", content: "Hello", lineNumber: 1 },
        { type: "removed", content: "World", lineNumber: 2 },
        { type: "added", content: "Universe" },
      ]);
    });

    it("should handle empty old text", () => {
      const oldText = "";
      const newText = "Hello\nWorld";
      const diff = diffText(oldText, newText);

      expect(diff.hasChanges).toBe(true);
      expect(diff.addedCount).toBe(2);
      expect(diff.removedCount).toBe(0);
    });

    it("should handle empty new text", () => {
      const oldText = "Hello\nWorld";
      const newText = "";
      const diff = diffText(oldText, newText);

      expect(diff.hasChanges).toBe(true);
      expect(diff.addedCount).toBe(0);
      expect(diff.removedCount).toBe(2);
    });

    it("should handle both texts empty", () => {
      const diff = diffText("", "");

      expect(diff.hasChanges).toBe(false);
      expect(diff.addedCount).toBe(0);
      expect(diff.removedCount).toBe(0);
      expect(diff.lines).toEqual([]);
    });

    it("should handle multiple changes", () => {
      const oldText = "Line 1\nLine 2\nLine 3\nLine 4";
      const newText = "Line 1\nLine 2 Modified\nLine 3\nLine 5";
      const diff = diffText(oldText, newText);

      expect(diff.hasChanges).toBe(true);
      expect(diff.addedCount).toBe(2); // Modified line + new line
      expect(diff.removedCount).toBe(2); // Old line 2 + old line 4
    });

    it("should preserve empty lines", () => {
      const oldText = "Line 1\n\nLine 3";
      const newText = "Line 1\nLine 2\n\nLine 3";
      const diff = diffText(oldText, newText);

      expect(diff.hasChanges).toBe(true);
      // Should detect the added line and preserved empty line
      expect(diff.lines.some((l) => l.content === "")).toBe(true);
    });

    it("should handle multiline text with various changes", () => {
      const oldText = `You are a helpful assistant.

User: {{userName}}

Please greet them.`;
      const newText = `You are a helpful assistant.

User: {{userName}}

Please greet them in a {{tone}} tone.`;

      const diff = diffText(oldText, newText);

      expect(diff.hasChanges).toBe(true);
      expect(diff.addedCount).toBe(1);
      expect(diff.removedCount).toBe(1);
    });

    it("should handle reordered lines", () => {
      const oldText = "A\nB\nC";
      const newText = "C\nB\nA";
      const diff = diffText(oldText, newText);

      expect(diff.hasChanges).toBe(true);
      // Should detect reordering as removals and additions
      expect(diff.addedCount).toBeGreaterThan(0);
      expect(diff.removedCount).toBeGreaterThan(0);
    });

    it("should handle Windows line endings (CRLF)", () => {
      const oldText = "Hello\r\nWorld";
      const newText = "Hello\r\nUniverse";
      const diff = diffText(oldText, newText);

      expect(diff.hasChanges).toBe(true);
      expect(diff.lines.length).toBeGreaterThan(0);
    });

    it("should handle mixed line endings", () => {
      const oldText = "Hello\nWorld";
      const newText = "Hello\r\nUniverse";
      const diff = diffText(oldText, newText);

      expect(diff.hasChanges).toBe(true);
      // Should normalize and compare correctly
      expect(diff.lines.length).toBeGreaterThan(0);
    });

    it("should handle very long lines", () => {
      const longLine = "a".repeat(10000);
      const oldText = `Line 1\n${longLine}\nLine 3`;
      const newText = `Line 1\n${longLine} modified\nLine 3`;
      const diff = diffText(oldText, newText);

      expect(diff.hasChanges).toBe(true);
      expect(diff.lines.length).toBe(4); // unchanged, removed, added, unchanged
    });

    it("should handle special characters", () => {
      const oldText = "Hello {{name}}!";
      const newText = "Hello {{userName}}!";
      const diff = diffText(oldText, newText);

      expect(diff.hasChanges).toBe(true);
      expect(diff.addedCount).toBe(1);
      expect(diff.removedCount).toBe(1);
    });

    it("should handle unicode characters", () => {
      const oldText = "Hello 世界";
      const newText = "Hello 世界 🌍";
      const diff = diffText(oldText, newText);

      expect(diff.hasChanges).toBe(true);
      expect(diff.addedCount).toBe(1);
    });
  });

  describe("formatDiff", () => {
    it("should format diff correctly", () => {
      const oldText = "Hello\nWorld";
      const newText = "Hello\nUniverse";
      const diff = diffText(oldText, newText);
      const formatted = formatDiff(diff);

      expect(formatted).toContain(" Hello");
      expect(formatted).toMatch(/-.*World/); // Line number may be included
      expect(formatted).toContain("+ Universe");
    });

    it("should include line numbers for unchanged and removed lines", () => {
      const oldText = "Line 1\nLine 2\nLine 3";
      const newText = "Line 1\nLine 3";
      const diff = diffText(oldText, newText);
      const formatted = formatDiff(diff);

      expect(formatted).toMatch(/\s+1\s+Line 1/);
      expect(formatted).toMatch(/- 2\s+Line 2/);
    });
  });

  describe("getDiffSummary", () => {
    it("should return 'No changes' for identical texts", () => {
      const text = "Hello\nWorld";
      const diff = diffText(text, text);
      const summary = getDiffSummary(diff);

      expect(summary).toBe("No changes");
    });

    it("should summarize added lines", () => {
      const oldText = "Hello";
      const newText = "Hello\nWorld";
      const diff = diffText(oldText, newText);
      const summary = getDiffSummary(diff);

      expect(summary).toBe("1 line added");
    });

    it("should summarize removed lines", () => {
      const oldText = "Hello\nWorld";
      const newText = "Hello";
      const diff = diffText(oldText, newText);
      const summary = getDiffSummary(diff);

      expect(summary).toBe("1 line removed");
    });

    it("should summarize multiple changes", () => {
      const oldText = "Line 1\nLine 2\nLine 3";
      const newText = "Line 1\nLine 4\nLine 5";
      const diff = diffText(oldText, newText);
      const summary = getDiffSummary(diff);

      expect(summary).toContain("added");
      expect(summary).toContain("removed");
    });

    it("should use plural form for multiple lines", () => {
      const oldText = "Line 1\nLine 2";
      const newText = "Line 1\nLine 3\nLine 4";
      const diff = diffText(oldText, newText);
      const summary = getDiffSummary(diff);

      expect(summary).toContain("lines");
    });
  });
});
