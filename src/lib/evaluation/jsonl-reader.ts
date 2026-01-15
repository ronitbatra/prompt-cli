/**
 * JSONL (JSON Lines) file reader for evaluation fixtures
 */

import fs from "fs";
import path from "path";
import type { EvaluationFixture } from "./types";
import { validateJsonlLine } from "./schema";
import type { PromptforgeConfig } from "../workspace/types";
import { getConfigPath } from "../workspace/config";

/**
 * Result of reading a JSONL file
 */
export interface JsonlReadResult {
  /**
   * Successfully parsed and validated fixtures
   */
  fixtures: EvaluationFixture[];

  /**
   * Errors encountered while reading/parsing
   */
  errors: Array<{
    lineNumber: number;
    line: string;
    error: string;
  }>;

  /**
   * Warnings encountered during validation
   */
  warnings: Array<{
    lineNumber: number;
    warning: string;
  }>;

  /**
   * Total number of lines processed
   */
  totalLines: number;
}

/**
 * Read and parse a JSONL file containing evaluation fixtures
 *
 * @param filePath - Path to the JSONL file
 * @returns Read result with fixtures, errors, and warnings
 *
 * @example
 * ```typescript
 * const result = readJsonlFile("evals/greeting.jsonl");
 * if (result.errors.length > 0) {
 *   console.error("Errors:", result.errors);
 * }
 * for (const fixture of result.fixtures) {
 *   // Process fixture
 * }
 * ```
 */
export function readJsonlFile(filePath: string): JsonlReadResult {
  const fixtures: EvaluationFixture[] = [];
  const errors: Array<{ lineNumber: number; line: string; error: string }> = [];
  const warnings: Array<{ lineNumber: number; warning: string }> = [];

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    throw new Error(`JSONL file not found: ${filePath}`);
  }

  // Read file content
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split(/\r?\n/);

  let lineNumber = 0;
  for (const line of lines) {
    lineNumber++;

    // Skip empty lines (but still count them in totalLines)
    const trimmedLine = line.trim();
    if (trimmedLine === "") {
      continue;
    }

    // Validate and parse the line
    const validationResult = validateJsonlLine(trimmedLine, lineNumber);

    // Collect errors
    if (!validationResult.isValid) {
      errors.push({
        lineNumber,
        line: trimmedLine,
        error: validationResult.errors.join("; "),
      });
      continue; // Skip invalid lines
    }

    // Collect warnings
    if (validationResult.warnings.length > 0) {
      warnings.push(
        ...validationResult.warnings.map((warning) => ({
          lineNumber,
          warning,
        }))
      );
    }

    // Parse the JSON (we know it's valid from validation)
    try {
      const fixture = JSON.parse(trimmedLine) as EvaluationFixture;
      fixtures.push(fixture);
    } catch (error) {
      // This shouldn't happen if validation passed, but handle it anyway
      errors.push({
        lineNumber,
        line: trimmedLine,
        error: `Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  return {
    fixtures,
    errors,
    warnings,
    totalLines: lineNumber,
  };
}

/**
 * Discover all JSONL files in the evals directory
 *
 * @param workspaceRoot - Root directory of the workspace
 * @param config - Workspace configuration
 * @returns Array of JSONL file paths
 */
export function discoverJsonlFiles(
  workspaceRoot: string,
  config: PromptforgeConfig
): string[] {
  const evalsDir = path.join(workspaceRoot, getConfigPath(config, "evals"));

  // Check if evals directory exists
  if (!fs.existsSync(evalsDir)) {
    return [];
  }

  const files: string[] = [];
  const entries = fs.readdirSync(evalsDir, { withFileTypes: true });

  for (const entry of entries) {
    // Only process .jsonl files
    if (entry.isFile() && entry.name.endsWith(".jsonl")) {
      files.push(path.join(evalsDir, entry.name));
    }
  }

  return files.sort(); // Return sorted for consistent ordering
}

/**
 * Read all JSONL files from the evals directory
 *
 * @param workspaceRoot - Root directory of the workspace
 * @param config - Workspace configuration
 * @returns Map of file paths to read results
 */
export function readAllJsonlFiles(
  workspaceRoot: string,
  config: PromptforgeConfig
): Map<string, JsonlReadResult> {
  const files = discoverJsonlFiles(workspaceRoot, config);
  const results = new Map<string, JsonlReadResult>();

  for (const filePath of files) {
    try {
      const result = readJsonlFile(filePath);
      results.set(filePath, result);
    } catch (error) {
      // Create error result for files that couldn't be read
      results.set(filePath, {
        fixtures: [],
        errors: [
          {
            lineNumber: 0,
            line: "",
            error: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        warnings: [],
        totalLines: 0,
      });
    }
  }

  return results;
}

/**
 * Read a specific JSONL file by name (without extension)
 *
 * @param workspaceRoot - Root directory of the workspace
 * @param fileName - Name of the file (e.g., "greeting" for "greeting.jsonl")
 * @param config - Workspace configuration
 * @returns Read result, or null if file not found
 */
export function readJsonlFileByName(
  workspaceRoot: string,
  fileName: string,
  config: PromptforgeConfig
): JsonlReadResult | null {
  const evalsDir = path.join(workspaceRoot, getConfigPath(config, "evals"));
  const filePath = path.join(evalsDir, `${fileName}.jsonl`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  return readJsonlFile(filePath);
}
