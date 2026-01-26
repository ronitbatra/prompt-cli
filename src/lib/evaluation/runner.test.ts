import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import {
  evaluateFixture,
  runEvaluation,
  runEvaluationFromFile,
} from "./runner";
import { MockProvider } from "./provider";
import type { EvaluationFixture } from "./types";
import type { PromptforgeConfig } from "../workspace/types";
import { discoverWorkspace, loadConfig } from "../workspace";

describe("Evaluation Runner", () => {
  let testDir: string;
  let config: PromptforgeConfig;
  let provider: MockProvider;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), "promptforge-test-"));
    config = {
      version: "1.0",
      paths: {
        prompts: "prompts",
        evals: "evals",
      },
    };
    provider = new MockProvider({ deterministic: true });

    // Create test prompt
    const promptsDir = path.join(testDir, "prompts", "test-prompt", "v1");
    fs.mkdirSync(promptsDir, { recursive: true });

    fs.writeFileSync(
      path.join(promptsDir, "test-prompt.prompt.md"),
      "Hello {{userName}}!",
      "utf-8"
    );

    fs.writeFileSync(
      path.join(promptsDir, "test-prompt.meta.json"),
      JSON.stringify({
        name: "test-prompt",
        version: "v1",
        variables: ["userName"],
      }),
      "utf-8"
    );
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe("evaluateFixture", () => {
    it("should evaluate a fixture successfully", async () => {
      const fixture: EvaluationFixture = {
        prompt: "test-prompt@v1",
        variables: { userName: "Alice" },
        expectations: [
          { type: "maxWords", value: 100 }, // Will pass with mock output
        ],
      };

      const result = await evaluateFixture(fixture, testDir, config, provider);

      expect(result.passed).toBe(true);
      expect(result.renderedPrompt).toBe("Hello Alice!");
      expect(result.output).toBeDefined();
      expect(result.expectationResults).toHaveLength(1);
      expect(result.expectationResults.every((r) => r.passed)).toBe(true);
    });

    it("should fail when expectation fails", async () => {
      const fixture: EvaluationFixture = {
        prompt: "test-prompt@v1",
        variables: { userName: "Alice" },
        expectations: [
          { type: "contains", value: "Bob" }, // This will fail
        ],
      };

      const result = await evaluateFixture(fixture, testDir, config, provider);

      expect(result.passed).toBe(false);
      expect(result.expectationResults[0].passed).toBe(false);
      expect(result.expectationResults[0].error).toBeDefined();
    });

    it("should handle missing prompt", async () => {
      const fixture: EvaluationFixture = {
        prompt: "nonexistent@v1",
        variables: { userName: "Alice" },
        expectations: [],
      };

      const result = await evaluateFixture(fixture, testDir, config, provider);

      expect(result.passed).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain("not found");
    });

    it("should handle missing variables", async () => {
      const fixture: EvaluationFixture = {
        prompt: "test-prompt@v1",
        variables: {}, // Missing userName
        expectations: [],
      };

      const result = await evaluateFixture(fixture, testDir, config, provider);

      expect(result.passed).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain("Missing required template variables");
    });

    it("should render prompt correctly", async () => {
      const fixture: EvaluationFixture = {
        prompt: "test-prompt@v1",
        variables: { userName: "Bob" },
        expectations: [],
      };

      const result = await evaluateFixture(fixture, testDir, config, provider);

      expect(result.renderedPrompt).toBe("Hello Bob!");
    });
  });

  describe("runEvaluation", () => {
    it("should evaluate multiple fixtures", async () => {
      // Use expectations that will pass with mock provider output
      const fixtures: EvaluationFixture[] = [
        {
          prompt: "test-prompt@v1",
          variables: { userName: "Alice" },
          expectations: [{ type: "maxWords", value: 100 }], // Will pass
        },
        {
          prompt: "test-prompt@v1",
          variables: { userName: "Bob" },
          expectations: [{ type: "maxWords", value: 100 }], // Will pass
        },
      ];

      const result = await runEvaluation(fixtures, testDir, config, {
        provider,
      });

      expect(result.totalFixtures).toBe(2);
      expect(result.passedFixtures).toBe(2);
      expect(result.failedFixtures).toBe(0);
      expect(result.passRate).toBe(1);
      expect(result.fixtureResults).toHaveLength(2);
    });

    it("should calculate pass rate correctly", async () => {
      const fixtures: EvaluationFixture[] = [
        {
          prompt: "test-prompt@v1",
          variables: { userName: "Alice" },
          expectations: [{ type: "maxWords", value: 100 }], // Pass
        },
        {
          prompt: "test-prompt@v1",
          variables: { userName: "Bob" },
          expectations: [{ type: "maxWords", value: 1 }], // Fail - mock output has more words
        },
      ];

      const result = await runEvaluation(fixtures, testDir, config, {
        provider,
      });

      expect(result.totalFixtures).toBe(2);
      expect(result.passedFixtures).toBe(1);
      expect(result.failedFixtures).toBe(1);
      expect(result.passRate).toBe(0.5);
    });

    it("should include timestamps and duration", async () => {
      const fixtures: EvaluationFixture[] = [
        {
          prompt: "test-prompt@v1",
          variables: { userName: "Alice" },
          expectations: [],
        },
      ];

      const result = await runEvaluation(fixtures, testDir, config, {
        provider,
      });

      expect(result.startedAt).toBeDefined();
      expect(result.completedAt).toBeDefined();
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(new Date(result.startedAt).getTime()).toBeLessThanOrEqual(
        new Date(result.completedAt).getTime()
      );
    });

    it("should capture latency and token usage", async () => {
      const fixtures: EvaluationFixture[] = [
        {
          prompt: "test-prompt@v1",
          variables: { userName: "Alice" },
          expectations: [],
        },
      ];

      const result = await runEvaluation(fixtures, testDir, config, {
        provider,
      });

      // Check fixture result has latency and tokens
      expect(result.fixtureResults[0].latency).toBeDefined();
      expect(result.fixtureResults[0].tokens).toBeDefined();
      expect(result.fixtureResults[0].tokens?.input).toBeGreaterThan(0);
      expect(result.fixtureResults[0].tokens?.output).toBeGreaterThan(0);
      expect(result.fixtureResults[0].tokens?.total).toBeGreaterThan(0);

      // Check aggregated statistics
      expect(result.averageLatency).toBeDefined();
      expect(result.totalLatency).toBeDefined();
      expect(result.totalTokens).toBeDefined();
      expect(result.totalTokens?.total).toBeGreaterThan(0);
    });

    it("should stop on error when configured", async () => {
      const fixtures: EvaluationFixture[] = [
        {
          prompt: "nonexistent@v1", // This will fail
          variables: {},
          expectations: [],
        },
        {
          prompt: "test-prompt@v1",
          variables: { userName: "Alice" },
          expectations: [],
        },
      ];

      const result = await runEvaluation(fixtures, testDir, config, {
        provider,
        stopOnError: true,
      });

      // Should only process first fixture
      expect(result.totalFixtures).toBe(1);
    });

    it("should continue on error by default", async () => {
      const fixtures: EvaluationFixture[] = [
        {
          prompt: "nonexistent@v1", // This will fail
          variables: {},
          expectations: [],
        },
        {
          prompt: "test-prompt@v1",
          variables: { userName: "Alice" },
          expectations: [],
        },
      ];

      const result = await runEvaluation(fixtures, testDir, config, {
        provider,
      });

      // Should process both fixtures
      expect(result.totalFixtures).toBe(2);
      expect(result.failedFixtures).toBe(1);
      expect(result.passedFixtures).toBe(1);
    });
  });

  describe("runEvaluationFromFile", () => {
    it("should read fixtures from JSONL file and evaluate", async () => {
      const evalsDir = path.join(testDir, "evals");
      fs.mkdirSync(evalsDir, { recursive: true });

      const jsonlPath = path.join(evalsDir, "test.jsonl");
      const fixture: EvaluationFixture = {
        prompt: "test-prompt@v1",
        variables: { userName: "Alice" },
        expectations: [{ type: "contains", value: "Alice" }],
      };

      fs.writeFileSync(jsonlPath, JSON.stringify(fixture) + "\n", "utf-8");

      const result = await runEvaluationFromFile(jsonlPath, testDir, config, {
        provider,
      });

      expect(result.totalFixtures).toBe(1);
      expect(result.passedFixtures).toBe(1);
    });

    it("should throw error for invalid JSONL file", async () => {
      const evalsDir = path.join(testDir, "evals");
      fs.mkdirSync(evalsDir, { recursive: true });

      const jsonlPath = path.join(evalsDir, "invalid.jsonl");
      fs.writeFileSync(jsonlPath, "{ invalid json }\n", "utf-8");

      await expect(
        runEvaluationFromFile(jsonlPath, testDir, config, { provider })
      ).rejects.toThrow();
    });
  });
});
