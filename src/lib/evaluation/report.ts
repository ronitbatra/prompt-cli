/**
 * Comprehensive reporting utilities for evaluation results
 */

import type { EvaluationRunResult, FixtureResult } from "./types";
import type { AggregatedResults } from "./aggregate";
import { Colors, createHeader, colorize } from "../diff/terminal-format";

/**
 * Format a detailed report showing pass rate, failures, and metrics
 *
 * @param result - Single evaluation run result
 * @returns Formatted report string
 */
export function formatDetailedReport(result: EvaluationRunResult): string {
  const lines: string[] = [];

  // Header
  lines.push(createHeader("Evaluation Report", 70));
  lines.push("");

  // Pass Rate Section
  const passRate = result.passRate * 100;
  const passRateColor =
    passRate === 100
      ? Colors.green
      : passRate >= 50
        ? Colors.yellow
        : Colors.red;

  lines.push(createHeader("Pass Rate", 70));
  lines.push(
    `  ${colorize("Overall:", Colors.bright)} ${colorize(`${passRate.toFixed(1)}%`, passRateColor)}`
  );
  lines.push(
    `  ${colorize("Passed:", Colors.green)} ${result.passedFixtures} / ${result.totalFixtures}`
  );
  lines.push(
    `  ${colorize("Failed:", Colors.red)} ${result.failedFixtures} / ${result.totalFixtures}`
  );
  lines.push("");

  // Failures Section
  const failedFixtures = result.fixtureResults.filter((r) => !r.passed);
  if (failedFixtures.length > 0) {
    lines.push(createHeader("Failures", 70));
    failedFixtures.forEach((fixture, index) => {
      const promptRef = fixture.fixture.prompt;
      const description = fixture.fixture.metadata?.description || "";
      const descText = description ? ` - ${description}` : "";

      lines.push(
        `  ${index + 1}. ${colorize(promptRef, Colors.red)}${descText}`
      );

      // Show failed expectations
      const failedExpectations = fixture.expectationResults.filter(
        (er) => !er.passed
      );
      if (failedExpectations.length > 0) {
        failedExpectations.forEach((expResult) => {
          const type = expResult.expectation.type;
          let expDesc = "";
          switch (type) {
            case "contains":
              expDesc = `Expected to contain "${(expResult.expectation as { value: string }).value}"`;
              break;
            case "regex":
              expDesc = `Expected to match regex "${(expResult.expectation as { value: string }).value}"`;
              break;
            case "maxWords":
              expDesc = `Expected ≤ ${(expResult.expectation as { value: number }).value} words`;
              break;
          }
          lines.push(`     ${colorize("✗", Colors.red)} ${expDesc}`);
          if (expResult.error) {
            lines.push(
              `       ${colorize(`Error: ${expResult.error}`, Colors.dim)}`
            );
          }
        });
      }

      // Show error if fixture evaluation failed
      if (fixture.error) {
        lines.push(`     ${colorize(`Error: ${fixture.error}`, Colors.red)}`);
      }

      // Show output preview
      if (fixture.output) {
        const preview =
          fixture.output.length > 150
            ? fixture.output.substring(0, 150) + "..."
            : fixture.output;
        lines.push(`     ${colorize("Output:", Colors.dim)} ${preview}`);
      }
      lines.push("");
    });
  } else {
    lines.push(createHeader("Failures", 70));
    lines.push(
      `  ${colorize("No failures - all fixtures passed!", Colors.green)}`
    );
    lines.push("");
  }

  // Metrics Section
  lines.push(createHeader("Metrics", 70));

  // Timing metrics
  const durationSeconds = (result.duration / 1000).toFixed(2);
  lines.push(`  ${colorize("Duration:", Colors.bright)} ${durationSeconds}s`);
  lines.push(
    `  ${colorize("Started:", Colors.dim)} ${new Date(result.startedAt).toLocaleString()}`
  );
  lines.push(
    `  ${colorize("Completed:", Colors.dim)} ${new Date(result.completedAt).toLocaleString()}`
  );

  // Latency metrics
  if (result.averageLatency !== undefined) {
    lines.push(
      `  ${colorize("Average Latency:", Colors.bright)} ${result.averageLatency.toFixed(0)}ms`
    );
  }
  if (result.totalLatency !== undefined) {
    lines.push(
      `  ${colorize("Total Latency:", Colors.dim)} ${result.totalLatency.toFixed(0)}ms`
    );
  }

  // Token usage metrics
  if (result.totalTokens) {
    lines.push("");
    lines.push(`  ${colorize("Token Usage:", Colors.bright)}`);
    lines.push(
      `    ${colorize("Total:", Colors.bright)} ${result.totalTokens.total.toLocaleString()}`
    );
    lines.push(
      `    ${colorize("Input:", Colors.dim)} ${result.totalTokens.input.toLocaleString()}`
    );
    lines.push(
      `    ${colorize("Output:", Colors.dim)} ${result.totalTokens.output.toLocaleString()}`
    );
  }

  // Per-fixture metrics summary
  const fixturesWithMetrics = result.fixtureResults.filter(
    (r) => r.latency !== undefined || r.tokens !== undefined
  );
  if (fixturesWithMetrics.length > 0) {
    lines.push("");
    lines.push(`  ${colorize("Per-Fixture Averages:", Colors.bright)}`);
    if (result.averageLatency !== undefined) {
      lines.push(
        `    ${colorize("Latency:", Colors.dim)} ${result.averageLatency.toFixed(0)}ms`
      );
    }
  }

  lines.push("");

  return lines.join("\n");
}

/**
 * Format aggregated results report
 *
 * @param aggregated - Aggregated results from multiple runs
 * @returns Formatted report string
 */
export function formatAggregatedReport(aggregated: AggregatedResults): string {
  const lines: string[] = [];

  // Header
  lines.push(createHeader("Aggregated Evaluation Report", 70));
  lines.push("");

  // Pass Rate Section
  const overallPassRate = aggregated.overallPassRate * 100;
  const averagePassRate = aggregated.averagePassRate * 100;
  const passRateColor =
    overallPassRate === 100
      ? Colors.green
      : overallPassRate >= 50
        ? Colors.yellow
        : Colors.red;

  lines.push(createHeader("Pass Rate", 70));
  lines.push(
    `  ${colorize("Overall Pass Rate:", Colors.bright)} ${colorize(`${overallPassRate.toFixed(1)}%`, passRateColor)}`
  );
  lines.push(
    `  ${colorize("Average Pass Rate:", Colors.dim)} ${averagePassRate.toFixed(1)}%`
  );
  lines.push(
    `  ${colorize("Total Passed:", Colors.green)} ${aggregated.totalPassed} / ${aggregated.totalFixtures}`
  );
  lines.push(
    `  ${colorize("Total Failed:", Colors.red)} ${aggregated.totalFailed} / ${aggregated.totalFixtures}`
  );
  lines.push("");

  // Failures Summary
  const allFailedFixtures = aggregated.allFixtureResults.filter(
    (r) => !r.passed
  );
  if (allFailedFixtures.length > 0) {
    lines.push(createHeader("Failures Summary", 70));
    lines.push(
      `  ${colorize("Total Failures:", Colors.red)} ${allFailedFixtures.length}`
    );

    // Group failures by prompt
    const failuresByPrompt = new Map<string, FixtureResult[]>();
    allFailedFixtures.forEach((fixture) => {
      const prompt = fixture.fixture.prompt;
      if (!failuresByPrompt.has(prompt)) {
        failuresByPrompt.set(prompt, []);
      }
      failuresByPrompt.get(prompt)!.push(fixture);
    });

    lines.push("");
    lines.push(`  ${colorize("Failures by Prompt:", Colors.bright)}`);
    failuresByPrompt.forEach((failures, prompt) => {
      lines.push(
        `    ${colorize(prompt, Colors.red)}: ${failures.length} failure(s)`
      );
    });
    lines.push("");
  } else {
    lines.push(createHeader("Failures Summary", 70));
    lines.push(`  ${colorize("No failures across all runs!", Colors.green)}`);
    lines.push("");
  }

  // Metrics Section
  lines.push(createHeader("Metrics", 70));
  lines.push(
    `  ${colorize("Total Runs:", Colors.bright)} ${aggregated.totalRuns}`
  );
  lines.push(
    `  ${colorize("Total Duration:", Colors.bright)} ${(aggregated.totalDuration / 1000).toFixed(2)}s`
  );
  lines.push(
    `  ${colorize("Average Duration:", Colors.dim)} ${(aggregated.averageDuration / 1000).toFixed(2)}s per run`
  );

  // Latency metrics
  if (aggregated.averageLatency !== undefined) {
    lines.push(
      `  ${colorize("Average Latency:", Colors.bright)} ${aggregated.averageLatency.toFixed(0)}ms`
    );
  }

  // Token usage metrics
  if (aggregated.totalTokens) {
    lines.push("");
    lines.push(`  ${colorize("Total Token Usage:", Colors.bright)}`);
    lines.push(
      `    ${colorize("Total:", Colors.bright)} ${aggregated.totalTokens.total.toLocaleString()}`
    );
    lines.push(
      `    ${colorize("Input:", Colors.dim)} ${aggregated.totalTokens.input.toLocaleString()}`
    );
    lines.push(
      `    ${colorize("Output:", Colors.dim)} ${aggregated.totalTokens.output.toLocaleString()}`
    );
  }

  // Date range
  lines.push("");
  lines.push(`  ${colorize("Date Range:", Colors.bright)}`);
  lines.push(
    `    ${colorize("Earliest:", Colors.dim)} ${new Date(aggregated.dateRange.earliest).toLocaleString()}`
  );
  lines.push(
    `    ${colorize("Latest:", Colors.dim)} ${new Date(aggregated.dateRange.latest).toLocaleString()}`
  );

  lines.push("");

  return lines.join("\n");
}

/**
 * Format a compact one-line summary with key metrics
 *
 * @param result - Evaluation run result
 * @returns Compact summary string
 */
export function formatCompactMetrics(result: EvaluationRunResult): string {
  const passRate = (result.passRate * 100).toFixed(1);
  const passRateColor =
    result.passRate === 1
      ? Colors.green
      : result.passRate >= 0.5
        ? Colors.yellow
        : Colors.red;

  const parts: string[] = [];
  parts.push(
    `${colorize(`${result.passedFixtures}/${result.totalFixtures}`, Colors.bright)} passed`
  );
  parts.push(`${colorize(`${passRate}%`, passRateColor)} pass rate`);
  parts.push(`${(result.duration / 1000).toFixed(1)}s`);

  if (result.totalTokens) {
    parts.push(`${result.totalTokens.total.toLocaleString()} tokens`);
  }

  if (result.averageLatency !== undefined) {
    parts.push(`${result.averageLatency.toFixed(0)}ms avg latency`);
  }

  return parts.join(" | ");
}
