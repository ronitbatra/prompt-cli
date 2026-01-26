/**
 * Aggregation utilities for combining multiple evaluation results
 */

import type { EvaluationRunResult, FixtureResult } from "./types";
import { listResults, loadResults } from "./results";
import type { PromptforgeConfig } from "../workspace/types";

/**
 * Options for aggregating results
 */
export interface AggregateOptions {
  /**
   * Maximum number of runs to aggregate (default: all)
   */
  maxRuns?: number;

  /**
   * Filter by prompt name (optional)
   */
  promptName?: string;

  /**
   * Filter by date range (optional)
   */
  dateRange?: {
    start?: Date;
    end?: Date;
  };
}

/**
 * Aggregated evaluation statistics across multiple runs
 */
export interface AggregatedResults {
  /**
   * Number of runs aggregated
   */
  totalRuns: number;

  /**
   * Total fixtures evaluated across all runs
   */
  totalFixtures: number;

  /**
   * Total fixtures that passed across all runs
   */
  totalPassed: number;

  /**
   * Total fixtures that failed across all runs
   */
  totalFailed: number;

  /**
   * Overall pass rate (0-1)
   */
  overallPassRate: number;

  /**
   * Average pass rate per run
   */
  averagePassRate: number;

  /**
   * Total tokens used across all runs
   */
  totalTokens?: {
    input: number;
    output: number;
    total: number;
  };

  /**
   * Average latency across all runs
   */
  averageLatency?: number;

  /**
   * Total duration across all runs (milliseconds)
   */
  totalDuration: number;

  /**
   * Average duration per run (milliseconds)
   */
  averageDuration: number;

  /**
   * Individual run results
   */
  runs: EvaluationRunResult[];

  /**
   * All fixture results from all runs
   */
  allFixtureResults: FixtureResult[];

  /**
   * Date range of aggregated runs
   */
  dateRange: {
    earliest: string;
    latest: string;
  };
}

/**
 * Aggregate results from multiple evaluation runs
 *
 * @param results - Array of evaluation run results to aggregate
 * @returns Aggregated statistics
 */
export function aggregateResults(
  results: EvaluationRunResult[]
): AggregatedResults {
  if (results.length === 0) {
    throw new Error("Cannot aggregate empty results array");
  }

  // Aggregate fixture statistics
  const allFixtureResults = results.flatMap((r) => r.fixtureResults);
  const totalFixtures = allFixtureResults.length;
  const totalPassed = allFixtureResults.filter((r) => r.passed).length;
  const totalFailed = totalFixtures - totalPassed;
  const overallPassRate = totalFixtures > 0 ? totalPassed / totalFixtures : 0;

  // Calculate average pass rate per run
  const averagePassRate =
    results.length > 0
      ? results.reduce((sum, r) => sum + r.passRate, 0) / results.length
      : 0;

  // Aggregate token usage
  const runsWithTokens = results.filter((r) => r.totalTokens);
  let totalTokens: AggregatedResults["totalTokens"] | undefined;
  if (runsWithTokens.length > 0) {
    totalTokens = runsWithTokens.reduce(
      (acc, r) => {
        if (r.totalTokens) {
          acc.input += r.totalTokens.input;
          acc.output += r.totalTokens.output;
          acc.total += r.totalTokens.total;
        }
        return acc;
      },
      { input: 0, output: 0, total: 0 }
    );
  }

  // Aggregate latency
  const runsWithLatency = results.filter((r) => r.averageLatency !== undefined);
  const averageLatency =
    runsWithLatency.length > 0
      ? runsWithLatency.reduce((sum, r) => sum + (r.averageLatency || 0), 0) /
        runsWithLatency.length
      : undefined;

  // Aggregate duration
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  const averageDuration = totalDuration / results.length;

  // Find date range
  const dates = results.map((r) => new Date(r.startedAt));
  dates.sort((a, b) => a.getTime() - b.getTime());
  const earliest = dates[0].toISOString();
  const latest = dates[dates.length - 1].toISOString();

  return {
    totalRuns: results.length,
    totalFixtures,
    totalPassed,
    totalFailed,
    overallPassRate,
    averagePassRate,
    totalTokens,
    averageLatency,
    totalDuration,
    averageDuration,
    runs: results,
    allFixtureResults,
    dateRange: {
      earliest,
      latest,
    },
  };
}

/**
 * Load and aggregate results from multiple runs
 *
 * @param workspaceRoot - Root directory of the workspace
 * @param config - Workspace configuration
 * @param options - Aggregation options
 * @returns Aggregated results
 */
export function aggregateRuns(
  workspaceRoot: string,
  config: PromptforgeConfig,
  options: AggregateOptions = {}
): AggregatedResults {
  const { maxRuns, promptName, dateRange } = options;

  // Get all result files
  let resultFiles = listResults(workspaceRoot, config);

  // Apply filters
  if (maxRuns) {
    resultFiles = resultFiles.slice(0, maxRuns);
  }

  // Load results
  const results: EvaluationRunResult[] = [];
  for (const filePath of resultFiles) {
    try {
      const result = loadResults(filePath);

      // Filter by date range
      if (dateRange) {
        const resultDate = new Date(result.startedAt);
        if (dateRange.start && resultDate < dateRange.start) {
          continue;
        }
        if (dateRange.end && resultDate > dateRange.end) {
          continue;
        }
      }

      // Filter by prompt name
      if (promptName) {
        const hasPrompt = result.fixtureResults.some((fr) =>
          fr.fixture.prompt.includes(promptName)
        );
        if (!hasPrompt) {
          continue;
        }
      }

      results.push(result);
    } catch (error) {
      // Skip invalid result files
      console.warn(`Warning: Skipping invalid result file: ${filePath}`);
    }
  }

  if (results.length === 0) {
    throw new Error(
      `No evaluation results found to aggregate.\n\n` +
        `Run evaluations first: prompt-cli eval`
    );
  }

  return aggregateResults(results);
}

/**
 * Get aggregated statistics for a specific prompt across all runs
 *
 * @param workspaceRoot - Root directory of the workspace
 * @param config - Workspace configuration
 * @param promptName - Name of the prompt to aggregate
 * @returns Aggregated results filtered by prompt
 */
export function aggregatePromptResults(
  workspaceRoot: string,
  config: PromptforgeConfig,
  promptName: string
): AggregatedResults {
  return aggregateRuns(workspaceRoot, config, {
    promptName,
  });
}

/**
 * Get aggregated statistics for the last N runs
 *
 * @param workspaceRoot - Root directory of the workspace
 * @param config - Workspace configuration
 * @param count - Number of recent runs to aggregate
 * @returns Aggregated results from recent runs
 */
export function aggregateRecentRuns(
  workspaceRoot: string,
  config: PromptforgeConfig,
  count: number
): AggregatedResults {
  return aggregateRuns(workspaceRoot, config, {
    maxRuns: count,
  });
}
