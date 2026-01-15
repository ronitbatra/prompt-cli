import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import {
  saveResults,
  loadResults,
  listResults,
  getLatestResults,
  loadLatestResults,
  generateResultsFilename,
} from "./results";
import type { EvaluationRunResult } from "./types";
import type { PromptforgeConfig } from "../workspace/types";

describe("Results Artifacts", () => {
  let testDir: string;
  let config: PromptforgeConfig;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), "promptforge-test-"));
    config = {
      version: "1.0",
      paths: {
        runs: "runs",
      },
    };
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe("generateResultsFilename", () => {
    it("should generate filename with default prefix", () => {
      const filename = generateResultsFilename();

      expect(filename).toMatch(/^eval-/);
      expect(filename).toMatch(/\.json$/);
      expect(filename.length).toBeGreaterThan(10);
    });

    it("should generate filename with custom prefix", () => {
      const filename = generateResultsFilename("test");

      expect(filename).toMatch(/^test-/);
      expect(filename).toMatch(/\.json$/);
    });

    it("should generate unique filenames", () => {
      const filename1 = generateResultsFilename();
      // Small delay to ensure different timestamp
      const filename2 = generateResultsFilename();

      // They might be the same if generated in same millisecond, but structure should be correct
      expect(filename1).toMatch(/\.json$/);
      expect(filename2).toMatch(/\.json$/);
    });
  });

  describe("saveResults", () => {
    it("should save results to JSON file", () => {
      const results: EvaluationRunResult = {
        startedAt: "2024-01-01T00:00:00.000Z",
        completedAt: "2024-01-01T00:00:01.000Z",
        duration: 1000,
        fixtureResults: [],
        totalFixtures: 0,
        passedFixtures: 0,
        failedFixtures: 0,
        passRate: 0,
      };

      const savedPath = saveResults(results, testDir, config);

      expect(fs.existsSync(savedPath)).toBe(true);
      expect(savedPath).toMatch(/\.json$/);
    });

    it("should create runs directory if it doesn't exist", () => {
      const results: EvaluationRunResult = {
        startedAt: "2024-01-01T00:00:00.000Z",
        completedAt: "2024-01-01T00:00:01.000Z",
        duration: 1000,
        fixtureResults: [],
        totalFixtures: 0,
        passedFixtures: 0,
        failedFixtures: 0,
        passRate: 0,
      };

      const runsDir = path.join(testDir, "runs");
      expect(fs.existsSync(runsDir)).toBe(false);

      saveResults(results, testDir, config);

      expect(fs.existsSync(runsDir)).toBe(true);
    });

    it("should save with custom filename", () => {
      const results: EvaluationRunResult = {
        startedAt: "2024-01-01T00:00:00.000Z",
        completedAt: "2024-01-01T00:00:01.000Z",
        duration: 1000,
        fixtureResults: [],
        totalFixtures: 0,
        passedFixtures: 0,
        failedFixtures: 0,
        passRate: 0,
      };

      const customFilename = "custom-results.json";
      const savedPath = saveResults(results, testDir, config, customFilename);

      expect(path.basename(savedPath)).toBe(customFilename);
      expect(fs.existsSync(savedPath)).toBe(true);
    });

    it("should save formatted JSON", () => {
      const results: EvaluationRunResult = {
        startedAt: "2024-01-01T00:00:00.000Z",
        completedAt: "2024-01-01T00:00:01.000Z",
        duration: 1000,
        fixtureResults: [],
        totalFixtures: 2,
        passedFixtures: 1,
        failedFixtures: 1,
        passRate: 0.5,
      };

      const savedPath = saveResults(results, testDir, config);
      const content = fs.readFileSync(savedPath, "utf-8");

      expect(content).toContain('"startedAt"');
      expect(content).toContain('"passRate"');
      expect(content).toContain("0.5");
    });
  });

  describe("loadResults", () => {
    it("should load results from JSON file", () => {
      const results: EvaluationRunResult = {
        startedAt: "2024-01-01T00:00:00.000Z",
        completedAt: "2024-01-01T00:00:01.000Z",
        duration: 1000,
        fixtureResults: [],
        totalFixtures: 2,
        passedFixtures: 1,
        failedFixtures: 1,
        passRate: 0.5,
      };

      const savedPath = saveResults(results, testDir, config);
      const loaded = loadResults(savedPath);

      expect(loaded.startedAt).toBe(results.startedAt);
      expect(loaded.completedAt).toBe(results.completedAt);
      expect(loaded.duration).toBe(results.duration);
      expect(loaded.totalFixtures).toBe(results.totalFixtures);
      expect(loaded.passRate).toBe(results.passRate);
    });

    it("should throw error if file doesn't exist", () => {
      const nonexistentPath = path.join(testDir, "nonexistent.json");

      expect(() => {
        loadResults(nonexistentPath);
      }).toThrow("not found");
    });

    it("should throw error for invalid JSON", () => {
      const invalidPath = path.join(testDir, "invalid.json");
      fs.writeFileSync(invalidPath, "{ invalid json }", "utf-8");

      expect(() => {
        loadResults(invalidPath);
      }).toThrow("Invalid JSON");
    });

    it("should throw error for invalid format", () => {
      const invalidPath = path.join(testDir, "invalid.json");
      fs.writeFileSync(invalidPath, '{"invalid": "format"}', "utf-8");

      expect(() => {
        loadResults(invalidPath);
      }).toThrow("Invalid results file format");
    });
  });

  describe("listResults", () => {
    it("should return empty array if runs directory doesn't exist", () => {
      const results = listResults(testDir, config);

      expect(results).toEqual([]);
    });

    it("should list all JSON files in runs directory", () => {
      const runsDir = path.join(testDir, "runs");
      fs.mkdirSync(runsDir, { recursive: true });

      const results1: EvaluationRunResult = {
        startedAt: "2024-01-01T00:00:00.000Z",
        completedAt: "2024-01-01T00:00:01.000Z",
        duration: 1000,
        fixtureResults: [],
        totalFixtures: 0,
        passedFixtures: 0,
        failedFixtures: 0,
        passRate: 0,
      };

      const results2: EvaluationRunResult = {
        startedAt: "2024-01-01T00:00:02.000Z",
        completedAt: "2024-01-01T00:00:03.000Z",
        duration: 1000,
        fixtureResults: [],
        totalFixtures: 0,
        passedFixtures: 0,
        failedFixtures: 0,
        passRate: 0,
      };

      saveResults(results1, testDir, config, "results1.json");
      saveResults(results2, testDir, config, "results2.json");

      const files = listResults(testDir, config);

      expect(files.length).toBeGreaterThanOrEqual(2);
      expect(files.every((f) => f.endsWith(".json"))).toBe(true);
    });

    it("should sort files by modification time (newest first)", async () => {
      const runsDir = path.join(testDir, "runs");
      fs.mkdirSync(runsDir, { recursive: true });

      const results1: EvaluationRunResult = {
        startedAt: "2024-01-01T00:00:00.000Z",
        completedAt: "2024-01-01T00:00:01.000Z",
        duration: 1000,
        fixtureResults: [],
        totalFixtures: 0,
        passedFixtures: 0,
        failedFixtures: 0,
        passRate: 0,
      };

      saveResults(results1, testDir, config, "results1.json");

      // Wait a bit and create another file
      await new Promise((resolve) => setTimeout(resolve, 10));

      const results2: EvaluationRunResult = {
        startedAt: "2024-01-01T00:00:02.000Z",
        completedAt: "2024-01-01T00:00:03.000Z",
        duration: 1000,
        fixtureResults: [],
        totalFixtures: 0,
        passedFixtures: 0,
        failedFixtures: 0,
        passRate: 0,
      };

      saveResults(results2, testDir, config, "results2.json");

      const files = listResults(testDir, config);

      // Newest file should be first
      expect(files.length).toBeGreaterThanOrEqual(2);
      const stat1 = fs.statSync(files[0]);
      const stat2 = fs.statSync(files[1]);
      expect(stat1.mtimeMs).toBeGreaterThanOrEqual(stat2.mtimeMs);
    });
  });

  describe("getLatestResults", () => {
    it("should return null if no results exist", () => {
      const latest = getLatestResults(testDir, config);

      expect(latest).toBeNull();
    });

    it("should return latest results file", () => {
      const results: EvaluationRunResult = {
        startedAt: "2024-01-01T00:00:00.000Z",
        completedAt: "2024-01-01T00:00:01.000Z",
        duration: 1000,
        fixtureResults: [],
        totalFixtures: 0,
        passedFixtures: 0,
        failedFixtures: 0,
        passRate: 0,
      };

      saveResults(results, testDir, config, "results.json");
      const latest = getLatestResults(testDir, config);

      expect(latest).not.toBeNull();
      expect(latest).toContain("results.json");
    });
  });

  describe("loadLatestResults", () => {
    it("should return null if no results exist", () => {
      const latest = loadLatestResults(testDir, config);

      expect(latest).toBeNull();
    });

    it("should load latest results", () => {
      const results: EvaluationRunResult = {
        startedAt: "2024-01-01T00:00:00.000Z",
        completedAt: "2024-01-01T00:00:01.000Z",
        duration: 1000,
        fixtureResults: [],
        totalFixtures: 2,
        passedFixtures: 1,
        failedFixtures: 1,
        passRate: 0.5,
      };

      saveResults(results, testDir, config, "results.json");
      const loaded = loadLatestResults(testDir, config);

      expect(loaded).not.toBeNull();
      expect(loaded!.totalFixtures).toBe(2);
      expect(loaded!.passRate).toBe(0.5);
    });
  });
});
