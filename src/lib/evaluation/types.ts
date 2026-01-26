/**
 * Evaluation fixture schema types
 *
 * Evaluation fixtures are stored as JSONL (JSON Lines) files where each line
 * represents a single test case with a prompt reference, variables, and expectations.
 */

/**
 * Expectation types for evaluating prompt outputs
 */
export type ExpectationType = "contains" | "regex" | "maxWords";

/**
 * Base interface for all expectation types
 */
export interface BaseExpectation {
  type: ExpectationType;
}

/**
 * Expectation that checks if output contains a specific string
 */
export interface ContainsExpectation extends BaseExpectation {
  type: "contains";
  value: string;
  caseSensitive?: boolean; // Default: false
}

/**
 * Expectation that checks if output matches a regular expression
 */
export interface RegexExpectation extends BaseExpectation {
  type: "regex";
  value: string; // Regular expression pattern
  flags?: string; // Regex flags (e.g., "i" for case-insensitive)
}

/**
 * Expectation that checks if output has at most N words
 */
export interface MaxWordsExpectation extends BaseExpectation {
  type: "maxWords";
  value: number; // Maximum number of words allowed
}

/**
 * Union type for all expectation types
 */
export type Expectation =
  | ContainsExpectation
  | RegexExpectation
  | MaxWordsExpectation;

/**
 * A single evaluation fixture (one line in a JSONL file)
 */
export interface EvaluationFixture {
  /**
   * Prompt reference (e.g., "greeting@v1" or "greeting" for latest)
   */
  prompt: string;

  /**
   * Variables to use when rendering the prompt template
   */
  variables: Record<string, unknown>;

  /**
   * List of expectations to check against the output
   */
  expectations: Expectation[];

  /**
   * Optional metadata for this test case
   */
  metadata?: {
    /**
     * Human-readable description of this test case
     */
    description?: string;

    /**
     * Tags for categorizing test cases
     */
    tags?: string[];

    /**
     * Expected output (for reference, not validation)
     */
    expectedOutput?: string;
  };
}

/**
 * Result of evaluating a single expectation
 */
export interface ExpectationResult {
  /**
   * The expectation that was evaluated
   */
  expectation: Expectation;

  /**
   * Whether the expectation passed
   */
  passed: boolean;

  /**
   * Error message if the expectation failed
   */
  error?: string;

  /**
   * Additional details about the evaluation
   */
  details?: Record<string, unknown>;
}

/**
 * Result of evaluating a single fixture
 */
export interface FixtureResult {
  /**
   * The fixture that was evaluated
   */
  fixture: EvaluationFixture;

  /**
   * The rendered prompt (template with variables interpolated)
   */
  renderedPrompt: string;

  /**
   * The mock output (for mock provider)
   */
  output?: string;

  /**
   * Results for each expectation
   */
  expectationResults: ExpectationResult[];

  /**
   * Whether all expectations passed
   */
  passed: boolean;

  /**
   * Error message if fixture evaluation failed
   */
  error?: string;

  /**
   * Provider latency in milliseconds (if available)
   */
  latency?: number;

  /**
   * Token usage information (if available)
   */
  tokens?: {
    /**
     * Number of input tokens (prompt tokens)
     */
    input: number;

    /**
     * Number of output tokens (completion tokens)
     */
    output: number;

    /**
     * Total tokens
     */
    total: number;
  };
}

/**
 * Complete evaluation run result
 */
export interface EvaluationRunResult {
  /**
   * Timestamp when the evaluation started
   */
  startedAt: string;

  /**
   * Timestamp when the evaluation completed
   */
  completedAt: string;

  /**
   * Duration in milliseconds
   */
  duration: number;

  /**
   * Results for each fixture
   */
  fixtureResults: FixtureResult[];

  /**
   * Total number of fixtures evaluated
   */
  totalFixtures: number;

  /**
   * Number of fixtures that passed all expectations
   */
  passedFixtures: number;

  /**
   * Number of fixtures that failed
   */
  failedFixtures: number;

  /**
   * Overall pass rate (0-1)
   */
  passRate: number;

  /**
   * Aggregate token usage across all fixtures
   */
  totalTokens?: {
    /**
     * Total input tokens across all fixtures
     */
    input: number;

    /**
     * Total output tokens across all fixtures
     */
    output: number;

    /**
     * Total tokens across all fixtures
     */
    total: number;
  };

  /**
   * Average latency per fixture in milliseconds
   */
  averageLatency?: number;

  /**
   * Total latency across all fixtures in milliseconds
   */
  totalLatency?: number;
}
