/**
 * Results artifact generation and management
 */

import fs from "fs";
import path from "path";
import type { EvaluationRunResult } from "./types";
import type { PromptforgeConfig } from "../workspace/types";
import { getConfigPath } from "../workspace/config";

/**
 * Generate a unique filename for a results file
 * Uses timestamp to ensure uniqueness
 *
 * @param prefix - Optional prefix for the filename (e.g., "eval")
 * @returns Filename like "eval-20240105T123456.json"
 */
export function generateResultsFilename(prefix = "eval"): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, -5); // Remove colons and milliseconds
  return `${prefix}-${timestamp}.json`;
}

/**
 * Save evaluation results to a JSON file
 *
 * @param results - The evaluation run results to save
 * @param workspaceRoot - Root directory of the workspace
 * @param config - Workspace configuration
 * @param filename - Optional custom filename (default: auto-generated)
 * @returns Path to the saved results file
 */
export function saveResults(
  results: EvaluationRunResult,
  workspaceRoot: string,
  config: PromptforgeConfig,
  filename?: string
): string {
  const runsDir = path.join(workspaceRoot, getConfigPath(config, "runs"));

  // Ensure runs directory exists
  if (!fs.existsSync(runsDir)) {
    fs.mkdirSync(runsDir, { recursive: true });
  }

  // Generate filename if not provided
  const resultsFilename = filename || generateResultsFilename();
  const resultsPath = path.join(runsDir, resultsFilename);

  // Write results as formatted JSON
  const jsonContent = JSON.stringify(results, null, 2);
  fs.writeFileSync(resultsPath, jsonContent, "utf-8");

  return resultsPath;
}

/**
 * Load evaluation results from a JSON file
 *
 * @param resultsPath - Path to the results JSON file
 * @returns The evaluation run results
 */
export function loadResults(resultsPath: string): EvaluationRunResult {
  if (!fs.existsSync(resultsPath)) {
    throw new Error(
      `Results file not found: ${resultsPath}\n\n` +
        `No evaluation results found at this path.\n` +
        `Run an evaluation first: prompt-cli eval`
    );
  }

  try {
    const content = fs.readFileSync(resultsPath, "utf-8");
    const results = JSON.parse(content) as EvaluationRunResult;

    // Validate basic structure
    if (!results.startedAt || !results.completedAt || !results.fixtureResults) {
      throw new Error(
        `Invalid results file format: ${resultsPath}\n\n` +
          `The file exists but doesn't contain valid evaluation results.\n` +
          `Expected fields: startedAt, completedAt, fixtureResults`
      );
    }

    return results;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(
        `Invalid JSON in results file: ${resultsPath}\n\n` +
          `The file contains invalid JSON syntax.\n` +
          `Error: ${error.message}`
      );
    }
    if (error instanceof Error && error.message.includes("Invalid")) {
      throw error;
    }
    throw new Error(
      `Failed to load results file: ${resultsPath}\n\n` +
        `Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * List all results files in the runs directory
 *
 * @param workspaceRoot - Root directory of the workspace
 * @param config - Workspace configuration
 * @returns Array of results file paths, sorted by modification time (newest first)
 */
export function listResults(
  workspaceRoot: string,
  config: PromptforgeConfig
): string[] {
  const runsDir = path.join(workspaceRoot, getConfigPath(config, "runs"));

  if (!fs.existsSync(runsDir)) {
    return [];
  }

  const files = fs.readdirSync(runsDir, { withFileTypes: true });
  const resultsFiles = files
    .filter((file) => file.isFile() && file.name.endsWith(".json"))
    .map((file) => path.join(runsDir, file.name));

  // Sort by modification time (newest first)
  resultsFiles.sort((a, b) => {
    const statA = fs.statSync(a);
    const statB = fs.statSync(b);
    return statB.mtimeMs - statA.mtimeMs;
  });

  return resultsFiles;
}

/**
 * Get the latest results file
 *
 * @param workspaceRoot - Root directory of the workspace
 * @param config - Workspace configuration
 * @returns Path to the latest results file, or null if none exist
 */
export function getLatestResults(
  workspaceRoot: string,
  config: PromptforgeConfig
): string | null {
  const resultsFiles = listResults(workspaceRoot, config);
  return resultsFiles.length > 0 ? resultsFiles[0] : null;
}

/**
 * Load the latest evaluation results
 *
 * @param workspaceRoot - Root directory of the workspace
 * @param config - Workspace configuration
 * @returns The latest evaluation run results, or null if none exist
 */
export function loadLatestResults(
  workspaceRoot: string,
  config: PromptforgeConfig
): EvaluationRunResult | null {
  const latestPath = getLatestResults(workspaceRoot, config);
  if (!latestPath) {
    return null;
  }

  return loadResults(latestPath);
}
