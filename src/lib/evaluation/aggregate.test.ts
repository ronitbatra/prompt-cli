import { describe, it, expect } from "vitest";
import {
  aggregateResults,
  aggregateRuns,
  aggregatePromptResults,
  aggregateRecentRuns,
} from "./aggregate";
import type { EvaluationRunResult } from "./types";
import type { PromptforgeConfig } from "../workspace/types";

describe("Result Aggregation", () => {
  const createMockResult = (
    overrides: Partial<EvaluationRunResult> = {}
  ): EvaluationRunResult => {
    return {
      startedAt: "2024-01-01T00:00:00.000Z",
      completedAt: "2024-01-01T00:00:01.000Z",
      duration: 1000,
      fixtureResults: [],
      totalFixtures: 0,
      passedFixtures: 0,
      failedFixtures: 0,
      passRate: 0,
      ...overrides,
    };
  };

  describe("aggregateResults", () => {
    it("should aggregate multiple runs", () => {
      const results: EvaluationRunResult[] = [
        createMockResult({
          totalFixtures: 5,
          passedFixtures: 4,
          failedFixtures: 1,
          passRate: 0.8,
          duration: 1000,
          fixtureResults: [
            {
              fixture: { prompt: "test1", variables: {}, expectations: [] },
              renderedPrompt: "",
              passed: true,
              expectationResults: [],
            },
            {
              fixture: { prompt: "test2", variables: {}, expectations: [] },
              renderedPrompt: "",
              passed: true,
              expectationResults: [],
            },
            {
              fixture: { prompt: "test3", variables: {}, expectations: [] },
              renderedPrompt: "",
              passed: true,
              expectationResults: [],
            },
            {
              fixture: { prompt: "test4", variables: {}, expectations: [] },
              renderedPrompt: "",
              passed: true,
              expectationResults: [],
            },
            {
              fixture: { prompt: "test5", variables: {}, expectations: [] },
              renderedPrompt: "",
              passed: false,
              expectationResults: [],
            },
          ],
        }),
        createMockResult({
          startedAt: "2024-01-01T00:00:02.000Z",
          completedAt: "2024-01-01T00:00:03.000Z",
          totalFixtures: 3,
          passedFixtures: 3,
          failedFixtures: 0,
          passRate: 1.0,
          duration: 500,
          fixtureResults: [
            {
              fixture: { prompt: "test6", variables: {}, expectations: [] },
              renderedPrompt: "",
              passed: true,
              expectationResults: [],
            },
            {
              fixture: { prompt: "test7", variables: {}, expectations: [] },
              renderedPrompt: "",
              passed: true,
              expectationResults: [],
            },
            {
              fixture: { prompt: "test8", variables: {}, expectations: [] },
              renderedPrompt: "",
              passed: true,
              expectationResults: [],
            },
          ],
        }),
      ];

      const aggregated = aggregateResults(results);

      expect(aggregated.totalRuns).toBe(2);
      expect(aggregated.totalFixtures).toBe(8);
      expect(aggregated.totalPassed).toBe(7);
      expect(aggregated.totalFailed).toBe(1);
      expect(aggregated.overallPassRate).toBeCloseTo(7 / 8);
      expect(aggregated.averagePassRate).toBeCloseTo(0.9);
      expect(aggregated.totalDuration).toBe(1500);
      expect(aggregated.averageDuration).toBe(750);
    });

    it("should aggregate token usage", () => {
      const results: EvaluationRunResult[] = [
        createMockResult({
          totalTokens: { input: 100, output: 50, total: 150 },
        }),
        createMockResult({
          totalTokens: { input: 200, output: 100, total: 300 },
        }),
      ];

      const aggregated = aggregateResults(results);

      expect(aggregated.totalTokens).toEqual({
        input: 300,
        output: 150,
        total: 450,
      });
    });

    it("should aggregate latency", () => {
      const results: EvaluationRunResult[] = [
        createMockResult({
          averageLatency: 100,
        }),
        createMockResult({
          averageLatency: 200,
        }),
      ];

      const aggregated = aggregateResults(results);

      expect(aggregated.averageLatency).toBe(150);
    });

    it("should calculate date range", () => {
      const results: EvaluationRunResult[] = [
        createMockResult({
          startedAt: "2024-01-01T00:00:00.000Z",
        }),
        createMockResult({
          startedAt: "2024-01-03T00:00:00.000Z",
        }),
        createMockResult({
          startedAt: "2024-01-02T00:00:00.000Z",
        }),
      ];

      const aggregated = aggregateResults(results);

      // Dates should be sorted correctly
      const earliestDate = new Date(aggregated.dateRange.earliest);
      const latestDate = new Date(aggregated.dateRange.latest);
      expect(earliestDate.getTime()).toBeLessThanOrEqual(latestDate.getTime());
      expect(earliestDate.toISOString()).toBe("2024-01-01T00:00:00.000Z");
      expect(latestDate.toISOString()).toBe("2024-01-03T00:00:00.000Z");
    });

    it("should throw error for empty results", () => {
      expect(() => {
        aggregateResults([]);
      }).toThrow("Cannot aggregate empty results");
    });

    it("should handle runs with no tokens", () => {
      const results: EvaluationRunResult[] = [
        createMockResult({
          totalTokens: { input: 100, output: 50, total: 150 },
        }),
        createMockResult({
          // No tokens
        }),
      ];

      const aggregated = aggregateResults(results);

      expect(aggregated.totalTokens).toEqual({
        input: 100,
        output: 50,
        total: 150,
      });
    });

    it("should include all fixture results", () => {
      const results: EvaluationRunResult[] = [
        createMockResult({
          fixtureResults: [
            {
              fixture: {
                prompt: "greeting@v1",
                variables: {},
                expectations: [],
              },
              renderedPrompt: "Hello",
              passed: true,
              expectationResults: [],
            },
          ],
        }),
        createMockResult({
          fixtureResults: [
            {
              fixture: {
                prompt: "greeting@v2",
                variables: {},
                expectations: [],
              },
              renderedPrompt: "Hi",
              passed: false,
              expectationResults: [],
            },
          ],
        }),
      ];

      const aggregated = aggregateResults(results);

      expect(aggregated.allFixtureResults).toHaveLength(2);
      expect(aggregated.allFixtureResults[0].fixture.prompt).toBe("greeting@v1");
      expect(aggregated.allFixtureResults[1].fixture.prompt).toBe("greeting@v2");
    });
  });

  describe("aggregateRuns", () => {
    it("should throw error when no results found", () => {
      const config: PromptforgeConfig = {
        version: "1.0",
        paths: {
          runs: "nonexistent",
        },
      };

      expect(() => {
        aggregateRuns("/tmp/test", config);
      }).toThrow("No evaluation results found");
    });
  });

  describe("aggregatePromptResults", () => {
    it("should be a function", () => {
      expect(typeof aggregatePromptResults).toBe("function");
    });
  });

  describe("aggregateRecentRuns", () => {
    it("should be a function", () => {
      expect(typeof aggregateRecentRuns).toBe("function");
    });
  });
});
