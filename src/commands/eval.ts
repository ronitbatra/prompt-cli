import { Command, Args, Flags } from "@oclif/core";
import { discoverWorkspace, loadConfig } from "../lib/workspace";
import {
  readJsonlFile,
  discoverJsonlFiles,
  runEvaluationFromFile,
  formatEvaluationSummary,
  formatDetailedReport,
  formatAggregatedReport,
  formatCompactMetrics,
} from "../lib/evaluation";
import {
  getLatestResults,
  loadLatestResults,
  listResults,
  loadResults,
} from "../lib/evaluation/results";
import {
  aggregateRuns,
  aggregatePromptResults,
  aggregateRecentRuns,
} from "../lib/evaluation/aggregate";
import { createProviderFromConfig } from "../lib/evaluation/provider-factory";
import path from "path";

export default class Eval extends Command {
  static override description =
    "Run evaluations on prompt fixtures and generate reports.\n" +
    "Evaluates prompts against test fixtures defined in JSONL files.";

  static override examples = [
    "<%= config.bin %> eval",
    "<%= config.bin %> eval greeting.jsonl",
    "<%= config.bin %> eval --latest",
    "<%= config.bin %> eval --latest --detailed",
    "<%= config.bin %> eval --latest --compact",
    "<%= config.bin %> eval --aggregate",
    "<%= config.bin %> eval --aggregate --detailed",
    "<%= config.bin %> eval --aggregate-prompt greeting",
    "<%= config.bin %> eval --aggregate-recent 5",
    "<%= config.bin %> eval greeting.jsonl --provider mock",
  ];

  static override flags = {
    latest: Flags.boolean({
      char: "l",
      description: "Show results from the latest evaluation run",
      default: false,
    }),
    aggregate: Flags.boolean({
      char: "a",
      description: "Aggregate results from multiple runs",
      default: false,
    }),
    "aggregate-prompt": Flags.string({
      description: "Aggregate results for a specific prompt",
    }),
    "aggregate-recent": Flags.integer({
      description: "Aggregate results from the last N runs",
    }),
    file: Flags.string({
      char: "f",
      description: "Specific JSONL file to evaluate (default: all files in evals/)",
    }),
    provider: Flags.string({
      char: "p",
      description: "Provider to use (mock, openai, etc.) - overrides config",
    }),
    "no-save": Flags.boolean({
      description: "Don't save results to runs/ directory",
      default: false,
    }),
    "detailed": Flags.boolean({
      description: "Show detailed report with pass rate, failures, and metrics",
      default: false,
    }),
    compact: Flags.boolean({
      char: "c",
      description: "Show compact one-line summary",
      default: false,
    }),
  };

  static override args = {
    jsonlFile: Args.string({
      description:
        "Optional JSONL file to evaluate (if not using --file flag)",
      required: false,
    }),
  };

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Eval);

    // Discover workspace
    const workspaceRoot = discoverWorkspace();
    const config = loadConfig(workspaceRoot);

    try {
      // Handle --latest flag: show latest results
      if (flags.latest) {
        await this.showLatestResults(workspaceRoot, config, flags);
        return;
      }

      // Handle aggregation flags
      if (flags.aggregate || flags["aggregate-prompt"] || flags["aggregate-recent"]) {
        await this.showAggregatedResults(workspaceRoot, config, flags);
        return;
      }

      // Determine which file(s) to evaluate
      const jsonlFile = flags.file || args.jsonlFile;

      if (jsonlFile) {
        // Evaluate specific file
        await this.evaluateFile(
          path.join(workspaceRoot, "evals", jsonlFile),
          workspaceRoot,
          config,
          flags
        );
      } else {
        // Evaluate all JSONL files
        await this.evaluateAllFiles(workspaceRoot, config, flags);
      }
    } catch (error) {
      if (error instanceof Error) {
        this.error(error.message);
      } else {
        this.error(`Failed to run evaluation: ${String(error)}`);
      }
    }
  }

  private async showLatestResults(
    workspaceRoot: string,
    config: any,
    flags: any
  ): Promise<void> {
    const latestPath = getLatestResults(workspaceRoot, config);

    if (!latestPath) {
      this.error(
        `No evaluation results found.\n\n` +
          `Run an evaluation first:\n` +
          `  prompt-cli eval`
      );
      // Exit with code 1 for CI: no results found
      this.exit(1);
      return;
    }

    const results = loadResults(latestPath);

    this.log(`Latest evaluation results: ${path.basename(latestPath)}\n`);

    // Use detailed report if requested, otherwise use standard summary
    if (flags.detailed) {
      this.log(formatDetailedReport(results));
    } else if (flags.compact) {
      this.log(formatCompactMetrics(results));
    } else {
      const summary = formatEvaluationSummary(results, {
        showPassed: false,
      });
      this.log(summary);
    }

    // Set exit code for CI: 0 if all passed, 1 if any failed
    if (results.failedFixtures > 0) {
      this.exit(1);
    }
  }

  private async showAggregatedResults(
    workspaceRoot: string,
    config: any,
    flags: any
  ): Promise<void> {
    let aggregated;

    try {
      if (flags["aggregate-prompt"]) {
        // Aggregate by prompt
        aggregated = aggregatePromptResults(
          workspaceRoot,
          config,
          flags["aggregate-prompt"]
        );
        this.log(
          `Aggregated results for prompt: ${flags["aggregate-prompt"]}\n`
        );
      } else if (flags["aggregate-recent"]) {
        // Aggregate recent runs
        aggregated = aggregateRecentRuns(
          workspaceRoot,
          config,
          flags["aggregate-recent"]
        );
        this.log(
          `Aggregated results from last ${flags["aggregate-recent"]} run(s)\n`
        );
      } else {
        // Aggregate all runs
        aggregated = aggregateRuns(workspaceRoot, config);
        this.log("Aggregated results from all runs\n");
      }
    } catch (error) {
      if (error instanceof Error) {
        this.error(error.message);
      } else {
        this.error(`Failed to aggregate results: ${String(error)}`);
      }
      return;
    }

    // Display aggregated report
    if (flags.detailed) {
      this.log(formatAggregatedReport(aggregated));
    } else if (flags.compact) {
      // For aggregated, show a compact summary
      const overallPassRate = (aggregated.overallPassRate * 100).toFixed(1);
      const parts: string[] = [];
      parts.push(`${aggregated.totalRuns} runs`);
      parts.push(`${aggregated.totalPassed}/${aggregated.totalFixtures} passed`);
      parts.push(`${overallPassRate}% pass rate`);
      parts.push(`${(aggregated.totalDuration / 1000).toFixed(1)}s total`);
      if (aggregated.totalTokens) {
        parts.push(`${aggregated.totalTokens.total.toLocaleString()} tokens`);
      }
      this.log(parts.join(" | "));
    } else {
      // Standard aggregated summary
      this.log("=".repeat(60));
      this.log("Aggregated Evaluation Statistics");
      this.log("=".repeat(60));
      this.log("");
      this.log(`  Total Runs: ${aggregated.totalRuns}`);
      this.log(`  Total Fixtures: ${aggregated.totalFixtures}`);
      this.log(`  Passed: ${aggregated.totalPassed}`);
      this.log(`  Failed: ${aggregated.totalFailed}`);
      this.log(
        `  Overall Pass Rate: ${(aggregated.overallPassRate * 100).toFixed(1)}%`
      );
      this.log(
        `  Average Pass Rate: ${(aggregated.averagePassRate * 100).toFixed(1)}%`
      );
      this.log("");

      if (aggregated.totalTokens) {
        this.log(
          `  Total Tokens: ${aggregated.totalTokens.total.toLocaleString()} ` +
            `(${aggregated.totalTokens.input.toLocaleString()} in, ` +
            `${aggregated.totalTokens.output.toLocaleString()} out)`
        );
      }

      if (aggregated.averageLatency) {
        this.log(`  Average Latency: ${aggregated.averageLatency.toFixed(0)}ms`);
      }

      this.log(
        `  Total Duration: ${(aggregated.totalDuration / 1000).toFixed(2)}s`
      );
      this.log(
        `  Average Duration: ${(aggregated.averageDuration / 1000).toFixed(2)}s per run`
      );
      this.log("");
      this.log(
        `  Date Range: ${new Date(aggregated.dateRange.earliest).toLocaleString()} - ` +
          `${new Date(aggregated.dateRange.latest).toLocaleString()}`
      );
      this.log("");
    }

    // Set exit code for CI: 0 if all passed, 1 if any failed
    if (aggregated.totalFailed > 0) {
      this.exit(1);
    }
  }

  private async evaluateFile(
    jsonlFilePath: string,
    workspaceRoot: string,
    config: any,
    flags: any
  ): Promise<void> {
    // Create provider (from config or override)
    let provider;
    if (flags.provider) {
      // Override provider from flag
      const providerConfig = {
        ...config.provider,
        type: flags.provider as any,
      };
      provider = await createProviderFromConfig({
        ...config,
        provider: providerConfig,
      });
    } else {
      // Use provider from config
      provider = await createProviderFromConfig(config);
    }

    // Run evaluation
    const result = await runEvaluationFromFile(
      jsonlFilePath,
      workspaceRoot,
      config,
      {
        provider,
        saveResults: !flags["no-save"],
      }
    );

    // Display summary
    if (flags.detailed) {
      this.log(formatDetailedReport(result));
    } else if (flags.compact) {
      this.log(formatCompactMetrics(result));
    } else {
      const summary = formatEvaluationSummary(result, {
        showPassed: false,
      });
      this.log(summary);
    }

    // Show where results were saved
    if (!flags["no-save"]) {
      const latestPath = getLatestResults(workspaceRoot, config);
      if (latestPath) {
        this.log(`\nResults saved to: ${path.relative(workspaceRoot, latestPath)}`);
      }
    }

    // Set exit code for CI: 0 if all passed, 1 if any failed
    if (result.failedFixtures > 0) {
      this.exit(1);
    }
  }

  private async evaluateAllFiles(
    workspaceRoot: string,
    config: any,
    flags: any
  ): Promise<void> {
    const jsonlFiles = discoverJsonlFiles(workspaceRoot, config);

    if (jsonlFiles.length === 0) {
      this.error(
        `No JSONL evaluation files found.\n\n` +
          `Expected location: ${path.join(workspaceRoot, "evals", "*.jsonl")}\n\n` +
          `Create evaluation fixtures in the evals/ directory.`
      );
      return;
    }

    this.log(`Found ${jsonlFiles.length} evaluation file(s)\n`);

    // Create provider
    let provider;
    if (flags.provider) {
      const providerConfig = {
        ...config.provider,
        type: flags.provider as any,
      };
      provider = await createProviderFromConfig({
        ...config,
        provider: providerConfig,
      });
    } else {
      provider = await createProviderFromConfig(config);
    }

    // Track overall failure status across all files
    let hasFailures = false;

    // Evaluate each file
    for (const jsonlFile of jsonlFiles) {
      const relativePath = path.relative(workspaceRoot, jsonlFile);
      this.log(`Evaluating: ${relativePath}`);

      const result = await runEvaluationFromFile(
        jsonlFile,
        workspaceRoot,
        config,
        {
          provider,
          saveResults: !flags["no-save"],
        }
      );

      // Track if this file had failures
      if (result.failedFixtures > 0) {
        hasFailures = true;
      }

      // Show summary for each file
      if (flags.detailed) {
        this.log(formatDetailedReport(result));
      } else if (flags.compact) {
        this.log(formatCompactMetrics(result));
      } else {
        const summary = formatEvaluationSummary(result, {
          showPassed: false,
        });
        this.log(summary);
      }
      this.log("");
    }

    // Show latest results location
    if (!flags["no-save"]) {
      const latestPath = getLatestResults(workspaceRoot, config);
      if (latestPath) {
        this.log(`Latest results: ${path.relative(workspaceRoot, latestPath)}`);
      }
    }

    // Set exit code for CI: 0 if all passed, 1 if any failed
    if (hasFailures) {
      this.exit(1);
    }
  }
}
