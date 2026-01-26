/**
 * Text diff utilities for comparing prompt templates
 */

/**
 * Represents a single line in a diff
 */
export interface DiffLine {
  type: "added" | "removed" | "unchanged";
  content: string;
  lineNumber?: number;
}

/**
 * Result of comparing two texts
 */
export interface TextDiffResult {
  lines: DiffLine[];
  addedCount: number;
  removedCount: number;
  unchangedCount: number;
  hasChanges: boolean;
}

/**
 * Compare two text strings and return a line-by-line diff
 * Uses a simple line-based diff algorithm
 *
 * @param oldText - The original text
 * @param newText - The new text
 * @returns Diff result with line-by-line changes
 *
 * @example
 * ```typescript
 * const oldText = "Hello\nWorld";
 * const newText = "Hello\nUniverse";
 * const diff = diffText(oldText, newText);
 * // Returns: {
 * //   lines: [
 * //     { type: "unchanged", content: "Hello" },
 * //     { type: "removed", content: "World" },
 * //     { type: "added", content: "Universe" }
 * //   ],
 * //   addedCount: 1,
 * //   removedCount: 1,
 * //   unchangedCount: 1,
 * //   hasChanges: true
 * // }
 * ```
 */
export function diffText(oldText: string, newText: string): TextDiffResult {
  // Split into lines, preserving empty lines
  // Handle empty strings specially - split("") returns [""], but we want []
  const oldLines = oldText === "" ? [] : oldText.split(/\r?\n/);
  const newLines = newText === "" ? [] : newText.split(/\r?\n/);

  // Use longest common subsequence (LCS) algorithm for better diff
  const diff = computeLineDiff(oldLines, newLines);

  const addedCount = diff.filter((line) => line.type === "added").length;
  const removedCount = diff.filter((line) => line.type === "removed").length;
  const unchangedCount = diff.filter(
    (line) => line.type === "unchanged"
  ).length;

  return {
    lines: diff,
    addedCount,
    removedCount,
    unchangedCount,
    hasChanges: addedCount > 0 || removedCount > 0,
  };
}

/**
 * Compute line-by-line diff using longest common subsequence
 * Uses dynamic programming to find the best matching lines
 *
 * @param oldLines - Array of lines from old text
 * @param newLines - Array of lines from new text
 * @returns Array of diff lines
 */
function computeLineDiff(oldLines: string[], newLines: string[]): DiffLine[] {
  const m = oldLines.length;
  const n = newLines.length;

  // Build edit distance matrix using dynamic programming
  // dp[i][j] represents the edit distance between oldLines[0..i-1] and newLines[0..j-1]
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  // Initialize first row and column
  for (let i = 0; i <= m; i++) {
    dp[i][0] = i;
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }

  // Fill the DP table
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        // Lines match - no edit needed
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        // Lines don't match - take minimum of insert, delete, or replace
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  // Backtrack to build the diff
  const result: DiffLine[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      // Lines match - unchanged
      result.unshift({
        type: "unchanged",
        content: oldLines[i - 1],
        lineNumber: i,
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] <= dp[i - 1][j])) {
      // Insert line from new text
      result.unshift({
        type: "added",
        content: newLines[j - 1],
      });
      j--;
    } else if (i > 0) {
      // Delete line from old text
      result.unshift({
        type: "removed",
        content: oldLines[i - 1],
        lineNumber: i,
      });
      i--;
    } else {
      // Fallback
      break;
    }
  }

  return result;
}

/**
 * Format diff result as a string (for testing/debugging)
 *
 * @param diff - Diff result
 * @returns Formatted string representation
 */
export function formatDiff(diff: TextDiffResult): string {
  const lines: string[] = [];

  for (const line of diff.lines) {
    const prefix =
      line.type === "added" ? "+" : line.type === "removed" ? "-" : " ";

    const lineNum = line.lineNumber ? ` ${line.lineNumber}` : "";
    lines.push(`${prefix}${lineNum} ${line.content}`);
  }

  return lines.join("\n");
}

/**
 * Get a summary of the diff
 *
 * @param diff - Diff result
 * @returns Summary string
 */
export function getDiffSummary(diff: TextDiffResult): string {
  if (!diff.hasChanges) {
    return "No changes";
  }

  const parts: string[] = [];
  if (diff.addedCount > 0) {
    parts.push(
      `${diff.addedCount} line${diff.addedCount > 1 ? "s" : ""} added`
    );
  }
  if (diff.removedCount > 0) {
    parts.push(
      `${diff.removedCount} line${diff.removedCount > 1 ? "s" : ""} removed`
    );
  }

  return parts.join(", ");
}
