import { describe, it, expect } from "vitest";
import { formatEvaluationSummary, formatCompactSummary } from "./summary";
import type {
  EvaluationRunResult,
  FixtureResult,
  EvaluationFixture,
} from "./types";

describe("Evaluation Summary", () => {
  const createMockResult = (
    fixtureResults: FixtureResult[]
  ): EvaluationRunResult => {
    const passedFixtures = fixtureResults.filter((r) => r.passed).length;
    const totalFixtures = fixtureResults.length;

    return {
      startedAt: "2024-01-01T00:00:00.000Z",
      completedAt: "2024-01-01T00:00:01.000Z",
      duration: 1000,
      fixtureResults,
      totalFixtures,
      passedFixtures,
      failedFixtures: totalFixtures - passedFixtures,
      passRate: totalFixtures > 0 ? passedFixtures / totalFixtures : 0,
    };
  };

  const createMockFixture = (
    prompt: string,
    passed: boolean,
    expectations: Array<{ type: string; value: unknown }> = []
  ): FixtureResult => {
    const fixture: EvaluationFixture = {
      prompt,
      variables: { userName: "Alice" },
      expectations: expectations as any,
    };

    return {
      fixture,
      renderedPrompt: "Hello Alice!",
      output: "Hello Alice! This is a response.",
      expectationResults: expectations.map((exp) => ({
        expectation: exp as any,
        passed,
        error: passed ? undefined : "Expectation failed",
      })),
      passed,
    };
  };

  describe("formatEvaluationSummary", () => {
    it("should format summary with all passed", () => {
      const result = createMockResult([
        createMockFixture("greeting@v1", true, [
          { type: "contains", value: "Hello" },
        ]),
      ]);

      const summary = formatEvaluationSummary(result);

      expect(summary).toContain("Evaluation Summary");
      expect(summary).toContain("Pass Rate:");
      expect(summary).toMatch(/100/); // Match 100 with or without color codes
      expect(summary).toContain("All fixtures passed");
    });

    it("should format summary with failures", () => {
      const result = createMockResult([
        createMockFixture("greeting@v1", false, [
          { type: "contains", value: "Bob" },
        ]),
      ]);

      const summary = formatEvaluationSummary(result);

      expect(summary).toContain("Failed Fixtures");
      expect(summary).toContain("FAIL");
      expect(summary).toContain("greeting@v1");
    });

    it("should show passed fixtures when requested", () => {
      const result = createMockResult([
        createMockFixture("greeting@v1", true),
        createMockFixture("greeting@v2", false),
      ]);

      const summary = formatEvaluationSummary(result, { showPassed: true });

      expect(summary).toContain("Passed Fixtures");
      expect(summary).toContain("Failed Fixtures");
    });

    it("should format expectation results", () => {
      const result = createMockResult([
        createMockFixture("greeting@v1", false, [
          { type: "contains", value: "Hello" },
          { type: "maxWords", value: 5 },
        ]),
      ]);

      const summary = formatEvaluationSummary(result);

      expect(summary).toContain("contains");
      expect(summary).toMatch(/words/); // The maxWords expectation shows as "has ≤ X words"
    });

    it("should handle fixtures with errors", () => {
      const fixture: EvaluationFixture = {
        prompt: "nonexistent@v1",
        variables: {},
        expectations: [],
      };

      const result = createMockResult([
        {
          fixture,
          renderedPrompt: "",
          expectationResults: [],
          passed: false,
          error: "Prompt not found",
        },
      ]);

      const summary = formatEvaluationSummary(result);

      expect(summary).toContain("Error:");
      expect(summary).toContain("Prompt not found");
    });

    it("should show output preview for failed fixtures", () => {
      const result = createMockResult([
        createMockFixture("greeting@v1", false, [
          { type: "contains", value: "Bob" },
        ]),
      ]);

      const summary = formatEvaluationSummary(result);

      expect(summary).toContain("Output:");
    });

    it("should handle empty results", () => {
      const result = createMockResult([]);

      const summary = formatEvaluationSummary(result);

      expect(summary).toContain("Total Fixtures:");
      expect(summary).toMatch(/0/); // Match 0 with or without color codes
      expect(summary).toContain("Pass Rate:");
    });
  });

  describe("formatCompactSummary", () => {
    it("should format compact summary for all passed", () => {
      const result = createMockResult([createMockFixture("greeting@v1", true)]);

      const summary = formatCompactSummary(result);

      expect(summary).toContain("PASS");
      expect(summary).toContain("1/1");
      expect(summary).toMatch(/100/); // Match 100 with or without color codes
    });

    it("should format compact summary for failures", () => {
      const result = createMockResult([
        createMockFixture("greeting@v1", false),
        createMockFixture("greeting@v2", true),
      ]);

      const summary = formatCompactSummary(result);

      expect(summary).toContain("FAIL");
      expect(summary).toContain("1/2");
      expect(summary).toMatch(/50/); // Match 50 with or without color codes
    });

    it("should handle empty results", () => {
      const result = createMockResult([]);

      const summary = formatCompactSummary(result);

      expect(summary).toContain("0/0");
    });
  });
});
