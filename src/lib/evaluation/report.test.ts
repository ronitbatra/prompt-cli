import { describe, it, expect } from "vitest";
import {
  formatDetailedReport,
  formatAggregatedReport,
  formatCompactMetrics,
} from "./report";
import type { EvaluationRunResult } from "./types";
import type { AggregatedResults } from "./aggregate";

describe("Report Formatting", () => {
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

  describe("formatDetailedReport", () => {
    it("should format a detailed report", () => {
      const result = createMockResult({
        totalFixtures: 5,
        passedFixtures: 4,
        failedFixtures: 1,
        passRate: 0.8,
      });

      const report = formatDetailedReport(result);
      expect(report).toContain("Evaluation Report");
      expect(report).toContain("Pass Rate");
      expect(report).toContain("Failures");
      expect(report).toContain("Metrics");
      expect(report).toContain("80.0%");
      expect(report).toContain("4 / 5");
      expect(report).toContain("1 / 5");
    });

    it("should include token metrics when available", () => {
      const result = createMockResult({
        totalTokens: {
          input: 100,
          output: 50,
          total: 150,
        },
      });

      const report = formatDetailedReport(result);
      expect(report).toContain("Token Usage");
      expect(report).toContain("150");
    });

    it("should include latency metrics when available", () => {
      const result = createMockResult({
        averageLatency: 100,
        totalLatency: 500,
      });

      const report = formatDetailedReport(result);
      expect(report).toContain("Average Latency");
      expect(report).toContain("100");
    });
  });

  describe("formatAggregatedReport", () => {
    it("should format aggregated report", () => {
      const aggregated: AggregatedResults = {
        totalRuns: 2,
        totalFixtures: 10,
        totalPassed: 8,
        totalFailed: 2,
        overallPassRate: 0.8,
        averagePassRate: 0.85,
        totalDuration: 2000,
        averageDuration: 1000,
        runs: [],
        allFixtureResults: [],
        dateRange: {
          earliest: "2024-01-01T00:00:00.000Z",
          latest: "2024-01-02T00:00:00.000Z",
        },
      };

      const report = formatAggregatedReport(aggregated);
      // Strip ANSI color codes for testing
      const reportWithoutColors = report.replace(/\u001b\[[0-9;]*m/g, "");
      expect(reportWithoutColors).toContain("Aggregated Evaluation Report");
      expect(reportWithoutColors).toContain("Pass Rate");
      expect(reportWithoutColors).toContain("Failures Summary");
      expect(reportWithoutColors).toContain("Metrics");
      expect(reportWithoutColors).toContain("80.0%");
      expect(reportWithoutColors).toContain("2");
      expect(reportWithoutColors).toContain("runs");
    });
  });

  describe("formatCompactMetrics", () => {
    it("should format compact metrics", () => {
      const result = createMockResult({
        totalFixtures: 5,
        passedFixtures: 4,
        passRate: 0.8,
        duration: 1000,
      });

      const compact = formatCompactMetrics(result);
      expect(compact).toContain("4/5");
      expect(compact).toContain("80.0%");
      expect(compact).toContain("1.0s");
    });

    it("should include tokens when available", () => {
      const result = createMockResult({
        totalTokens: {
          input: 100,
          output: 50,
          total: 150,
        },
      });

      const compact = formatCompactMetrics(result);
      expect(compact).toContain("150");
    });

    it("should include latency when available", () => {
      const result = createMockResult({
        averageLatency: 100,
      });

      const compact = formatCompactMetrics(result);
      expect(compact).toContain("100ms");
    });
  });
});
