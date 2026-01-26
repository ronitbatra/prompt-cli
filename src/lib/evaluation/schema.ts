/**
 * Schema validation for evaluation fixtures
 */

import type {
  EvaluationFixture,
  Expectation,
  ContainsExpectation,
  RegexExpectation,
  MaxWordsExpectation,
} from "./types";

/**
 * Validation result for a schema
 */
export interface SchemaValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate an expectation object
 */
export function validateExpectation(
  expectation: unknown
): SchemaValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!expectation || typeof expectation !== "object") {
    return {
      isValid: false,
      errors: ["Expectation must be an object"],
      warnings: [],
    };
  }

  const exp = expectation as Record<string, unknown>;

  // Check type field
  if (!exp.type || typeof exp.type !== "string") {
    errors.push("Expectation must have a 'type' field");
  } else {
    const validTypes = ["contains", "regex", "maxWords"];
    if (!validTypes.includes(exp.type)) {
      errors.push(
        `Invalid expectation type: ${exp.type}. Must be one of: ${validTypes.join(", ")}`
      );
    }
  }

  // Type-specific validation
  if (exp.type === "contains") {
    const containsExp = exp as unknown as ContainsExpectation;
    if (!containsExp.value || typeof containsExp.value !== "string") {
      errors.push("'contains' expectation must have a 'value' field (string)");
    }
    if (
      containsExp.caseSensitive !== undefined &&
      typeof containsExp.caseSensitive !== "boolean"
    ) {
      errors.push("'caseSensitive' must be a boolean if provided");
    }
  } else if (exp.type === "regex") {
    const regexExp = exp as unknown as RegexExpectation;
    if (!regexExp.value || typeof regexExp.value !== "string") {
      errors.push("'regex' expectation must have a 'value' field (string)");
    } else {
      // Validate regex pattern
      try {
        const flags = regexExp.flags || "";
        new RegExp(regexExp.value, flags);
      } catch (error) {
        errors.push(
          `Invalid regex pattern: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
    if (regexExp.flags !== undefined && typeof regexExp.flags !== "string") {
      errors.push("'flags' must be a string if provided");
    }
  } else if (exp.type === "maxWords") {
    const maxWordsExp = exp as unknown as MaxWordsExpectation;
    if (
      maxWordsExp.value === undefined ||
      typeof maxWordsExp.value !== "number"
    ) {
      errors.push("'maxWords' expectation must have a 'value' field (number)");
    } else if (maxWordsExp.value < 0) {
      errors.push("'maxWords' value must be non-negative");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate an evaluation fixture
 */
export function validateFixture(fixture: unknown): SchemaValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!fixture || typeof fixture !== "object") {
    return {
      isValid: false,
      errors: ["Fixture must be an object"],
      warnings: [],
    };
  }

  const fix = fixture as Record<string, unknown>;

  // Validate prompt field
  if (!fix.prompt || typeof fix.prompt !== "string") {
    errors.push("Fixture must have a 'prompt' field (string)");
  } else {
    // Validate prompt reference format (basic check)
    const promptRef = fix.prompt as string;
    if (promptRef.trim() === "") {
      errors.push("'prompt' field cannot be empty");
    }
  }

  // Validate variables field
  if (
    !fix.variables ||
    typeof fix.variables !== "object" ||
    Array.isArray(fix.variables)
  ) {
    errors.push("Fixture must have a 'variables' field (object)");
  }

  // Validate expectations field
  if (!fix.expectations) {
    errors.push("Fixture must have an 'expectations' field");
  } else if (!Array.isArray(fix.expectations)) {
    errors.push("'expectations' must be an array");
  } else {
    const expectations = fix.expectations as unknown[];
    if (expectations.length === 0) {
      warnings.push("Fixture has no expectations");
    }

    // Validate each expectation
    expectations.forEach((exp, index) => {
      const result = validateExpectation(exp);
      if (!result.isValid) {
        errors.push(`Expectation ${index + 1}: ${result.errors.join(", ")}`);
      }
      warnings.push(
        ...result.warnings.map((w) => `Expectation ${index + 1}: ${w}`)
      );
    });
  }

  // Validate metadata if present
  if (fix.metadata !== undefined) {
    if (typeof fix.metadata !== "object" || Array.isArray(fix.metadata)) {
      errors.push("'metadata' must be an object if provided");
    } else {
      const metadata = fix.metadata as Record<string, unknown>;
      if (
        metadata.description !== undefined &&
        typeof metadata.description !== "string"
      ) {
        errors.push("'metadata.description' must be a string if provided");
      }
      if (metadata.tags !== undefined) {
        if (!Array.isArray(metadata.tags)) {
          errors.push("'metadata.tags' must be an array if provided");
        } else {
          const invalidTags = metadata.tags.filter(
            (tag) => typeof tag !== "string"
          );
          if (invalidTags.length > 0) {
            errors.push("All tags must be strings");
          }
        }
      }
      if (
        metadata.expectedOutput !== undefined &&
        typeof metadata.expectedOutput !== "string"
      ) {
        errors.push("'metadata.expectedOutput' must be a string if provided");
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate a parsed JSONL line (fixture)
 * This is a convenience function that also provides better error messages
 */
export function validateJsonlLine(
  line: string,
  lineNumber: number
): SchemaValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch (error) {
    return {
      isValid: false,
      errors: [
        `Line ${lineNumber}: Invalid JSON - ${error instanceof Error ? error.message : String(error)}`,
      ],
      warnings: [],
    };
  }

  const result = validateFixture(parsed);
  if (!result.isValid) {
    result.errors = result.errors.map((err) => `Line ${lineNumber}: ${err}`);
  }
  if (result.warnings.length > 0) {
    result.warnings = result.warnings.map(
      (warn) => `Line ${lineNumber}: ${warn}`
    );
  }

  return result;
}
