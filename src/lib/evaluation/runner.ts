/**
 * Evaluation runner - orchestrates the evaluation process
 */

import type {
  EvaluationFixture,
  FixtureResult,
  EvaluationRunResult,
} from "./types";
import { loadPromptVersion } from "../registry/prompt-discovery";
import { renderTemplate } from "../renderer/template-renderer";
import type { Provider } from "./provider";
import { evaluateExpectations } from "./expectations";
import type { PromptforgeConfig } from "../workspace/types";

/**
 * Options for running evaluations
 */
export interface RunEvaluationOptions {
  /**
   * Provider to use for generating outputs
   */
  provider: Provider;

  /**
   * Whether to stop on first error (default: false)
   */
  stopOnError?: boolean;

  /**
   * Whether to continue on fixture errors (default: true)
   */
  continueOnError?: boolean;

  /**
   * Whether to save results to a JSON file (default: true)
   */
  saveResults?: boolean;

  /**
   * Custom filename for results (default: auto-generated)
   */
  resultsFilename?: string;
}

/**
 * Evaluate a single fixture
 *
 * @param fixture - The fixture to evaluate
 * @param workspaceRoot - Root directory of the workspace
 * @param config - Workspace configuration
 * @param provider - Provider to use for generating outputs
 * @returns Result of evaluating the fixture
 */
export async function evaluateFixture(
  fixture: EvaluationFixture,
  workspaceRoot: string,
  config: PromptforgeConfig,
  provider: Provider
): Promise<FixtureResult> {
  try {
    // Load the prompt version
    const promptVersion = loadPromptVersion(
      workspaceRoot,
      fixture.prompt,
      config
    );

    // Render the template with variables
    const renderedPrompt = renderTemplate(
      promptVersion.template,
      fixture.variables,
      {
        missingVariableStrategy: "error", // Fail fast on missing variables
      }
    );

    // Generate output using the provider
    const providerResult = await provider.generate(renderedPrompt);

    // Evaluate all expectations
    const expectationResults = evaluateExpectations(
      providerResult.output,
      fixture.expectations
    );

    // Check if all expectations passed
    const passed = expectationResults.every((result) => result.passed);

    return {
      fixture,
      renderedPrompt,
      output: providerResult.output,
      expectationResults,
      passed,
    };
  } catch (error) {
    return {
      fixture,
      renderedPrompt: "",
      expectationResults: [],
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Run evaluation on multiple fixtures
 *
 * @param fixtures - Array of fixtures to evaluate
 * @param workspaceRoot - Root directory of the workspace
 * @param config - Workspace configuration
 * @param options - Evaluation options
 * @returns Complete evaluation run result
 */
export async function runEvaluation(
  fixtures: EvaluationFixture[],
  workspaceRoot: string,
  config: PromptforgeConfig,
  options: RunEvaluationOptions
): Promise<EvaluationRunResult> {
  const startedAt = new Date().toISOString();
  const startTime = Date.now();

  const fixtureResults: FixtureResult[] = [];
  const { provider, continueOnError = true } = options;

  // Evaluate each fixture
  for (const fixture of fixtures) {
    try {
      const result = await evaluateFixture(
        fixture,
        workspaceRoot,
        config,
        provider
      );
      fixtureResults.push(result);

      // Stop on error if configured
      if (!result.passed && options.stopOnError) {
        break;
      }
    } catch (error) {
      // Handle fixture evaluation errors
      if (!continueOnError) {
        throw error;
      }

      fixtureResults.push({
        fixture,
        renderedPrompt: "",
        expectationResults: [],
        passed: false,
        error: error instanceof Error ? error.message : String(error),
      });

      // Stop on error if configured
      if (options.stopOnError) {
        break;
      }
    }
  }

  const completedAt = new Date().toISOString();
  const duration = Date.now() - startTime;

  // Calculate statistics
  const totalFixtures = fixtureResults.length;
  const passedFixtures = fixtureResults.filter((r) => r.passed).length;
  const failedFixtures = totalFixtures - passedFixtures;
  const passRate = totalFixtures > 0 ? passedFixtures / totalFixtures : 0;

  const result: EvaluationRunResult = {
    startedAt,
    completedAt,
    duration,
    fixtureResults,
    totalFixtures,
    passedFixtures,
    failedFixtures,
    passRate,
  };

  // Save results if configured
  if (options.saveResults !== false) {
    // Dynamic import to avoid circular dependencies
    const resultsModule = await import("./results.js");
    resultsModule.saveResults(result, workspaceRoot, config, options.resultsFilename);
  }

  return result;
}

/**
 * Evaluate fixtures from a JSONL file
 *
 * @param jsonlFilePath - Path to the JSONL file
 * @param workspaceRoot - Root directory of the workspace
 * @param config - Workspace configuration
 * @param options - Evaluation options
 * @returns Complete evaluation run result
 */
export async function runEvaluationFromFile(
  jsonlFilePath: string,
  workspaceRoot: string,
  config: PromptforgeConfig,
  options: RunEvaluationOptions
): Promise<EvaluationRunResult> {
  // Import here to avoid circular dependencies
  const { readJsonlFile } = await import("./jsonl-reader.js");

  // Read fixtures from file
  const readResult = readJsonlFile(jsonlFilePath);

  // Check for errors
  if (readResult.errors.length > 0) {
    throw new Error(
      `Failed to read JSONL file: ${readResult.errors.map((e) => e.error).join("; ")}`
    );
  }

  // Run evaluation (results will be saved automatically if saveResults is true)
  return runEvaluation(readResult.fixtures, workspaceRoot, config, options);
}
