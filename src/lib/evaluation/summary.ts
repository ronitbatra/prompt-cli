/**
 * Terminal summary output for evaluation results
 */

import type {
  EvaluationRunResult,
  FixtureResult,
  ExpectationResult,
} from "./types";
import { Colors, createHeader, colorize } from "../diff/terminal-format";

/**
 * Format a single expectation result for display
 */
function formatExpectationResult(result: ExpectationResult): string {
  const status = result.passed
    ? colorize("✓", Colors.green)
    : colorize("✗", Colors.red);

  const type = result.expectation.type;
  let description = "";

  switch (type) {
    case "contains":
      description = `contains "${(result.expectation as { value: string }).value}"`;
      break;
    case "regex":
      description = `matches regex "${(result.expectation as { value: string }).value}"`;
      break;
    case "maxWords":
      description = `has ≤ ${(result.expectation as { value: number }).value} words`;
      break;
  }

  if (!result.passed && result.error) {
    return `  ${status} ${description} ${colorize(`(${result.error})`, Colors.red)}`;
  }

  return `  ${status} ${description}`;
}

/**
 * Format a fixture result for display
 */
function formatFixtureResult(
  result: FixtureResult,
  index: number,
  totalFixtures: number
): string {
  const lines: string[] = [];

  // Fixture header
  const status = result.passed
    ? colorize("PASS", Colors.green)
    : colorize("FAIL", Colors.red);

  const promptRef = result.fixture.prompt;
  const description = result.fixture.metadata?.description || "";
  const descText = description ? ` - ${description}` : "";

  lines.push(
    `\n${status} [${index + 1}/${totalFixtures}] ${promptRef}${descText}`
  );

  // Show error if fixture failed to evaluate
  if (result.error) {
    lines.push(`  ${colorize(`Error: ${result.error}`, Colors.red)}`);
    return lines.join("\n");
  }

  // Show expectation results
  if (result.expectationResults.length > 0) {
    for (const expResult of result.expectationResults) {
      lines.push(formatExpectationResult(expResult));
    }
  } else {
    lines.push(`  ${colorize("No expectations defined", Colors.yellow)}`);
  }

  // Show output preview if failed
  if (!result.passed && result.output) {
    const preview =
      result.output.length > 100
        ? result.output.substring(0, 100) + "..."
        : result.output;
    lines.push(`  ${colorize("Output:", Colors.dim)} ${preview}`);
  }

  return lines.join("\n");
}

/**
 * Format overall summary statistics
 */
function formatSummaryStats(result: EvaluationRunResult): string {
  const lines: string[] = [];

  const passRate = (result.passRate * 100).toFixed(1);
  const passRateColor =
    result.passRate === 1
      ? Colors.green
      : result.passRate >= 0.5
        ? Colors.yellow
        : Colors.red;

  lines.push(createHeader("Evaluation Summary", 60));
  lines.push("");

  // Overall statistics
  lines.push(
    `  ${colorize("Total Fixtures:", Colors.bright)} ${result.totalFixtures}`
  );
  lines.push(`  ${colorize("Passed:", Colors.green)} ${result.passedFixtures}`);
  lines.push(`  ${colorize("Failed:", Colors.red)} ${result.failedFixtures}`);
  lines.push(
    `  ${colorize("Pass Rate:", Colors.bright)} ${colorize(`${passRate}%`, passRateColor)}`
  );
  lines.push("");

  // Timing information
  const durationSeconds = (result.duration / 1000).toFixed(2);
  lines.push(`  ${colorize("Duration:", Colors.dim)} ${durationSeconds}s`);
  lines.push(
    `  ${colorize("Started:", Colors.dim)} ${new Date(result.startedAt).toLocaleString()}`
  );

  // Latency and token usage
  if (result.averageLatency !== undefined) {
    lines.push(
      `  ${colorize("Avg Latency:", Colors.dim)} ${result.averageLatency.toFixed(0)}ms`
    );
  }
  if (result.totalLatency !== undefined) {
    lines.push(
      `  ${colorize("Total Latency:", Colors.dim)} ${result.totalLatency.toFixed(0)}ms`
    );
  }
  if (result.totalTokens) {
    lines.push(
      `  ${colorize("Total Tokens:", Colors.dim)} ${result.totalTokens.total.toLocaleString()} (${result.totalTokens.input.toLocaleString()} in, ${result.totalTokens.output.toLocaleString()} out)`
    );
  }
  lines.push("");

  return lines.join("\n");
}

/**
 * Format the complete evaluation summary for terminal output
 *
 * @param result - The evaluation run result
 * @param options - Formatting options
 * @returns Formatted string ready for terminal output
 */
export function formatEvaluationSummary(
  result: EvaluationRunResult,
  options: {
    showPassed?: boolean; // Show passed fixtures (default: false)
    showOutput?: boolean; // Show output for all fixtures (default: false)
  } = {}
): string {
  const { showPassed = false, showOutput = false } = options;
  const lines: string[] = [];

  // Summary statistics
  lines.push(formatSummaryStats(result));

  // Fixture results
  const failedResults = result.fixtureResults.filter((r) => !r.passed);
  const passedResults = result.fixtureResults.filter((r) => r.passed);

  // Show failed fixtures
  if (failedResults.length > 0) {
    lines.push(createHeader("Failed Fixtures", 60));
    failedResults.forEach((fixtureResult) => {
      const originalIndex = result.fixtureResults.indexOf(fixtureResult);
      lines.push(
        formatFixtureResult(fixtureResult, originalIndex, result.totalFixtures)
      );
    });
    lines.push("");
  }

  // Show passed fixtures if requested
  if (showPassed && passedResults.length > 0) {
    lines.push(createHeader("Passed Fixtures", 60));
    passedResults.forEach((fixtureResult) => {
      const originalIndex = result.fixtureResults.indexOf(fixtureResult);
      lines.push(
        formatFixtureResult(fixtureResult, originalIndex, result.totalFixtures)
      );
    });
    lines.push("");
  }

  // Final summary line
  if (result.passRate === 1) {
    lines.push(colorize("✓ All fixtures passed!", Colors.green));
  } else {
    lines.push(
      colorize(
        `✗ ${result.failedFixtures} fixture${result.failedFixtures > 1 ? "s" : ""} failed`,
        Colors.red
      )
    );
  }

  lines.push("");

  return lines.join("\n");
}

/**
 * Format a compact one-line summary
 */
export function formatCompactSummary(result: EvaluationRunResult): string {
  const passRate = (result.passRate * 100).toFixed(1);
  const passRateColor =
    result.passRate === 1
      ? Colors.green
      : result.passRate >= 0.5
        ? Colors.yellow
        : Colors.red;

  const status =
    result.passRate === 1
      ? colorize("PASS", Colors.green)
      : colorize("FAIL", Colors.red);

  return `${status} ${result.passedFixtures}/${result.totalFixtures} passed (${colorize(`${passRate}%`, passRateColor)})`;
}
