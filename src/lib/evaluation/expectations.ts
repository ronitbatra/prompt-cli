/**
 * Expectation evaluators for checking prompt outputs
 */

import type {
  Expectation,
  ContainsExpectation,
  RegexExpectation,
  MaxWordsExpectation,
  ExpectationResult,
} from "./types";

/**
 * Count the number of words in a string
 * Words are separated by whitespace
 */
function countWords(text: string): number {
  if (!text || text.trim() === "") {
    return 0;
  }
  return text.trim().split(/\s+/).length;
}

/**
 * Evaluate a "contains" expectation
 * Checks if the output contains a specific string
 */
export function evaluateContains(
  output: string,
  expectation: ContainsExpectation
): ExpectationResult {
  const caseSensitive = expectation.caseSensitive ?? false;
  const searchValue = expectation.value;
  const outputToSearch = caseSensitive ? output : output.toLowerCase();
  const valueToFind = caseSensitive ? searchValue : searchValue.toLowerCase();

  const passed = outputToSearch.includes(valueToFind);

  return {
    expectation,
    passed,
    error: passed
      ? undefined
      : `Output does not contain "${searchValue}"${caseSensitive ? "" : " (case-insensitive)"}`,
    details: {
      searched: searchValue,
      caseSensitive,
      found: passed,
    },
  };
}

/**
 * Evaluate a "regex" expectation
 * Checks if the output matches a regular expression pattern
 */
export function evaluateRegex(
  output: string,
  expectation: RegexExpectation
): ExpectationResult {
  try {
    const flags = expectation.flags || "";
    const regex = new RegExp(expectation.value, flags);
    const passed = regex.test(output);

    return {
      expectation,
      passed,
      error: passed
        ? undefined
        : `Output does not match regex pattern: ${expectation.value}`,
      details: {
        pattern: expectation.value,
        flags: flags || "none",
        matched: passed,
        match: passed ? regex.exec(output)?.[0] : undefined,
      },
    };
  } catch (error) {
    return {
      expectation,
      passed: false,
      error: `Invalid regex pattern: ${error instanceof Error ? error.message : String(error)}`,
      details: {
        pattern: expectation.value,
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

/**
 * Evaluate a "maxWords" expectation
 * Checks if the output has at most N words
 */
export function evaluateMaxWords(
  output: string,
  expectation: MaxWordsExpectation
): ExpectationResult {
  const wordCount = countWords(output);
  const maxWords = expectation.value;
  const passed = wordCount <= maxWords;

  return {
    expectation,
    passed,
    error: passed
      ? undefined
      : `Output has ${wordCount} words, but maximum allowed is ${maxWords}`,
    details: {
      wordCount,
      maxWords,
      passed,
    },
  };
}

/**
 * Evaluate a single expectation against an output
 *
 * @param output - The output string to evaluate
 * @param expectation - The expectation to check
 * @returns Result of the evaluation
 */
export function evaluateExpectation(
  output: string,
  expectation: Expectation
): ExpectationResult {
  switch (expectation.type) {
    case "contains":
      return evaluateContains(output, expectation);
    case "regex":
      return evaluateRegex(output, expectation);
    case "maxWords":
      return evaluateMaxWords(output, expectation);
    default:
      // TypeScript should catch this, but handle for safety
      const exhaustiveCheck: never = expectation;
      return {
        expectation: exhaustiveCheck,
        passed: false,
        error: `Unknown expectation type: ${(expectation as Expectation).type}`,
      };
  }
}

/**
 * Evaluate multiple expectations against an output
 *
 * @param output - The output string to evaluate
 * @param expectations - Array of expectations to check
 * @returns Array of evaluation results
 */
export function evaluateExpectations(
  output: string,
  expectations: Expectation[]
): ExpectationResult[] {
  return expectations.map((expectation) =>
    evaluateExpectation(output, expectation)
  );
}
