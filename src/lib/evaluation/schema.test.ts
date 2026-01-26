import { describe, it, expect } from "vitest";
import {
  validateExpectation,
  validateFixture,
  validateJsonlLine,
} from "./schema";
import type { EvaluationFixture } from "./types";

describe("Evaluation Schema Validation", () => {
  describe("validateExpectation", () => {
    it("should validate contains expectation", () => {
      const expectation = { type: "contains", value: "hello" };
      const result = validateExpectation(expectation);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should validate contains expectation with caseSensitive", () => {
      const expectation = {
        type: "contains",
        value: "hello",
        caseSensitive: true,
      };
      const result = validateExpectation(expectation);

      expect(result.isValid).toBe(true);
    });

    it("should reject contains expectation without value", () => {
      const expectation = { type: "contains" };
      const result = validateExpectation(expectation);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "'contains' expectation must have a 'value' field (string)"
      );
    });

    it("should validate regex expectation", () => {
      const expectation = { type: "regex", value: "^Hello.*" };
      const result = validateExpectation(expectation);

      expect(result.isValid).toBe(true);
    });

    it("should validate regex expectation with flags", () => {
      const expectation = { type: "regex", value: "^hello.*", flags: "i" };
      const result = validateExpectation(expectation);

      expect(result.isValid).toBe(true);
    });

    it("should reject invalid regex pattern", () => {
      const expectation = { type: "regex", value: "[invalid" };
      const result = validateExpectation(expectation);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should validate maxWords expectation", () => {
      const expectation = { type: "maxWords", value: 100 };
      const result = validateExpectation(expectation);

      expect(result.isValid).toBe(true);
    });

    it("should reject maxWords with negative value", () => {
      const expectation = { type: "maxWords", value: -1 };
      const result = validateExpectation(expectation);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("'maxWords' value must be non-negative");
    });

    it("should reject invalid expectation type", () => {
      const expectation = { type: "invalid", value: "test" };
      const result = validateExpectation(expectation);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) => e.includes("Invalid expectation type"))
      ).toBe(true);
    });

    it("should reject non-object expectation", () => {
      const result = validateExpectation("not an object");

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Expectation must be an object");
    });
  });

  describe("validateFixture", () => {
    it("should validate complete fixture", () => {
      const fixture: EvaluationFixture = {
        prompt: "greeting@v1",
        variables: { userName: "Alice" },
        expectations: [{ type: "contains", value: "Alice" }],
      };
      const result = validateFixture(fixture);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should validate fixture with metadata", () => {
      const fixture: EvaluationFixture = {
        prompt: "greeting@v1",
        variables: { userName: "Alice" },
        expectations: [{ type: "contains", value: "Alice" }],
        metadata: {
          description: "Test greeting with Alice",
          tags: ["test", "greeting"],
          expectedOutput: "Hello Alice!",
        },
      };
      const result = validateFixture(fixture);

      expect(result.isValid).toBe(true);
    });

    it("should reject fixture without prompt", () => {
      const fixture = {
        variables: { userName: "Alice" },
        expectations: [{ type: "contains", value: "Alice" }],
      };
      const result = validateFixture(fixture);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Fixture must have a 'prompt' field (string)"
      );
    });

    it("should reject fixture without variables", () => {
      const fixture = {
        prompt: "greeting@v1",
        expectations: [{ type: "contains", value: "Alice" }],
      };
      const result = validateFixture(fixture);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Fixture must have a 'variables' field (object)"
      );
    });

    it("should reject fixture without expectations", () => {
      const fixture = {
        prompt: "greeting@v1",
        variables: { userName: "Alice" },
      };
      const result = validateFixture(fixture);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Fixture must have an 'expectations' field"
      );
    });

    it("should warn about empty expectations", () => {
      const fixture = {
        prompt: "greeting@v1",
        variables: { userName: "Alice" },
        expectations: [],
      };
      const result = validateFixture(fixture);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain("Fixture has no expectations");
    });

    it("should validate multiple expectations", () => {
      const fixture: EvaluationFixture = {
        prompt: "greeting@v1",
        variables: { userName: "Alice" },
        expectations: [
          { type: "contains", value: "Alice" },
          { type: "maxWords", value: 50 },
          { type: "regex", value: "^Hello" },
        ],
      };
      const result = validateFixture(fixture);

      expect(result.isValid).toBe(true);
    });

    it("should reject invalid expectation in array", () => {
      const fixture = {
        prompt: "greeting@v1",
        variables: { userName: "Alice" },
        expectations: [{ type: "invalid" }],
      };
      const result = validateFixture(fixture);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("Expectation 1"))).toBe(true);
    });

    it("should reject non-object fixture", () => {
      const result = validateFixture("not an object");

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Fixture must be an object");
    });
  });

  describe("validateJsonlLine", () => {
    it("should validate valid JSONL line", () => {
      const line = JSON.stringify({
        prompt: "greeting@v1",
        variables: { userName: "Alice" },
        expectations: [{ type: "contains", value: "Alice" }],
      });
      const result = validateJsonlLine(line, 1);

      expect(result.isValid).toBe(true);
    });

    it("should reject invalid JSON", () => {
      const line = "{ invalid json }";
      const result = validateJsonlLine(line, 1);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("Line 1"))).toBe(true);
      expect(result.errors.some((e) => e.includes("Invalid JSON"))).toBe(true);
    });

    it("should include line number in error messages", () => {
      const line = JSON.stringify({
        prompt: "greeting@v1",
        // Missing variables
        expectations: [],
      });
      const result = validateJsonlLine(line, 5);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("Line 5"))).toBe(true);
    });
  });
});
