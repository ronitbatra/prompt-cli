import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import {
  readJsonlFile,
  discoverJsonlFiles,
  readAllJsonlFiles,
  readJsonlFileByName,
} from "./jsonl-reader";
import type { PromptforgeConfig } from "../workspace/types";

describe("JSONL Reader", () => {
  let testDir: string;
  let config: PromptforgeConfig;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), "promptforge-test-"));
    config = {
      version: "1.0",
      paths: {
        evals: "evals",
      },
    };
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe("readJsonlFile", () => {
    it("should read valid JSONL file", () => {
      const filePath = path.join(testDir, "test.jsonl");
      const content =
        JSON.stringify({
          prompt: "greeting@v1",
          variables: { userName: "Alice" },
          expectations: [{ type: "contains", value: "Alice" }],
        }) + "\n";

      fs.writeFileSync(filePath, content, "utf-8");

      const result = readJsonlFile(filePath);

      expect(result.fixtures).toHaveLength(1);
      expect(result.fixtures[0].prompt).toBe("greeting@v1");
      expect(result.errors).toHaveLength(0);
      // totalLines includes the trailing newline as an empty line
      expect(result.totalLines).toBeGreaterThanOrEqual(1);
    });

    it("should read multiple fixtures", () => {
      const filePath = path.join(testDir, "test.jsonl");
      const fixtures = [
        {
          prompt: "greeting@v1",
          variables: { userName: "Alice" },
          expectations: [{ type: "contains", value: "Alice" }],
        },
        {
          prompt: "greeting@v1",
          variables: { userName: "Bob" },
          expectations: [{ type: "contains", value: "Bob" }],
        },
      ];

      const content = fixtures.map((f) => JSON.stringify(f)).join("\n") + "\n";
      fs.writeFileSync(filePath, content, "utf-8");

      const result = readJsonlFile(filePath);

      expect(result.fixtures).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    it("should skip empty lines", () => {
      const filePath = path.join(testDir, "test.jsonl");
      const content =
        JSON.stringify({
          prompt: "greeting@v1",
          variables: { userName: "Alice" },
          expectations: [{ type: "contains", value: "Alice" }],
        }) +
        "\n\n" +
        JSON.stringify({
          prompt: "greeting@v1",
          variables: { userName: "Bob" },
          expectations: [{ type: "contains", value: "Bob" }],
        }) +
        "\n";

      fs.writeFileSync(filePath, content, "utf-8");

      const result = readJsonlFile(filePath);

      expect(result.fixtures).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    it("should handle invalid JSON", () => {
      const filePath = path.join(testDir, "test.jsonl");
      const content = "{ invalid json }\n";

      fs.writeFileSync(filePath, content, "utf-8");

      const result = readJsonlFile(filePath);

      expect(result.fixtures).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].lineNumber).toBe(1);
      expect(result.errors[0].error).toContain("Invalid JSON");
    });

    it("should handle invalid fixture schema", () => {
      const filePath = path.join(testDir, "test.jsonl");
      const content =
        JSON.stringify({
          // Missing required fields
          prompt: "greeting@v1",
        }) + "\n";

      fs.writeFileSync(filePath, content, "utf-8");

      const result = readJsonlFile(filePath);

      expect(result.fixtures).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain("variables");
    });

    it("should collect warnings", () => {
      const filePath = path.join(testDir, "test.jsonl");
      const content =
        JSON.stringify({
          prompt: "greeting@v1",
          variables: { userName: "Alice" },
          expectations: [], // Empty expectations should generate warning
        }) + "\n";

      fs.writeFileSync(filePath, content, "utf-8");

      const result = readJsonlFile(filePath);

      expect(result.fixtures).toHaveLength(1);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("should throw error if file doesn't exist", () => {
      const filePath = path.join(testDir, "nonexistent.jsonl");

      expect(() => {
        readJsonlFile(filePath);
      }).toThrow("not found");
    });

    it("should handle Windows line endings (CRLF)", () => {
      const filePath = path.join(testDir, "test.jsonl");
      const content =
        JSON.stringify({
          prompt: "greeting@v1",
          variables: { userName: "Alice" },
          expectations: [{ type: "contains", value: "Alice" }],
        }) + "\r\n";

      fs.writeFileSync(filePath, content, "utf-8");

      const result = readJsonlFile(filePath);

      expect(result.fixtures).toHaveLength(1);
    });
  });

  describe("discoverJsonlFiles", () => {
    it("should discover JSONL files in evals directory", () => {
      const evalsDir = path.join(testDir, "evals");
      fs.mkdirSync(evalsDir, { recursive: true });

      fs.writeFileSync(path.join(evalsDir, "greeting.jsonl"), "");
      fs.writeFileSync(path.join(evalsDir, "test.jsonl"), "");
      fs.writeFileSync(path.join(evalsDir, "not-jsonl.txt"), "");

      const files = discoverJsonlFiles(testDir, config);

      expect(files).toHaveLength(2);
      expect(files.some((f) => f.includes("greeting.jsonl"))).toBe(true);
      expect(files.some((f) => f.includes("test.jsonl"))).toBe(true);
      expect(files.some((f) => f.includes("not-jsonl.txt"))).toBe(false);
    });

    it("should return empty array if evals directory doesn't exist", () => {
      const files = discoverJsonlFiles(testDir, config);

      expect(files).toHaveLength(0);
    });

    it("should return sorted files", () => {
      const evalsDir = path.join(testDir, "evals");
      fs.mkdirSync(evalsDir, { recursive: true });

      fs.writeFileSync(path.join(evalsDir, "zebra.jsonl"), "");
      fs.writeFileSync(path.join(evalsDir, "apple.jsonl"), "");
      fs.writeFileSync(path.join(evalsDir, "banana.jsonl"), "");

      const files = discoverJsonlFiles(testDir, config);

      expect(files).toHaveLength(3);
      // Should be sorted
      const fileNames = files.map((f) => path.basename(f));
      expect(fileNames).toEqual(["apple.jsonl", "banana.jsonl", "zebra.jsonl"]);
    });
  });

  describe("readAllJsonlFiles", () => {
    it("should read all JSONL files", () => {
      const evalsDir = path.join(testDir, "evals");
      fs.mkdirSync(evalsDir, { recursive: true });

      const fixture1 = {
        prompt: "greeting@v1",
        variables: { userName: "Alice" },
        expectations: [{ type: "contains", value: "Alice" }],
      };
      const fixture2 = {
        prompt: "greeting@v1",
        variables: { userName: "Bob" },
        expectations: [{ type: "contains", value: "Bob" }],
      };

      fs.writeFileSync(
        path.join(evalsDir, "greeting.jsonl"),
        JSON.stringify(fixture1) + "\n",
        "utf-8"
      );
      fs.writeFileSync(
        path.join(evalsDir, "test.jsonl"),
        JSON.stringify(fixture2) + "\n",
        "utf-8"
      );

      const results = readAllJsonlFiles(testDir, config);

      expect(results.size).toBe(2);
      expect(
        Array.from(results.values()).every((r) => r.fixtures.length > 0)
      ).toBe(true);
    });

    it("should handle files with errors", () => {
      const evalsDir = path.join(testDir, "evals");
      fs.mkdirSync(evalsDir, { recursive: true });

      fs.writeFileSync(
        path.join(evalsDir, "valid.jsonl"),
        JSON.stringify({
          prompt: "greeting@v1",
          variables: { userName: "Alice" },
          expectations: [{ type: "contains", value: "Alice" }],
        }) + "\n",
        "utf-8"
      );
      fs.writeFileSync(
        path.join(evalsDir, "invalid.jsonl"),
        "{ invalid json }\n",
        "utf-8"
      );

      const results = readAllJsonlFiles(testDir, config);

      expect(results.size).toBe(2);
      const validResult = Array.from(results.values()).find(
        (r) => r.fixtures.length > 0
      );
      const invalidResult = Array.from(results.values()).find(
        (r) => r.errors.length > 0
      );

      expect(validResult).toBeDefined();
      expect(invalidResult).toBeDefined();
    });
  });

  describe("readJsonlFileByName", () => {
    it("should read file by name", () => {
      const evalsDir = path.join(testDir, "evals");
      fs.mkdirSync(evalsDir, { recursive: true });

      const fixture = {
        prompt: "greeting@v1",
        variables: { userName: "Alice" },
        expectations: [{ type: "contains", value: "Alice" }],
      };

      fs.writeFileSync(
        path.join(evalsDir, "greeting.jsonl"),
        JSON.stringify(fixture) + "\n",
        "utf-8"
      );

      const result = readJsonlFileByName(testDir, "greeting", config);

      expect(result).not.toBeNull();
      expect(result!.fixtures).toHaveLength(1);
      expect(result!.fixtures[0].prompt).toBe("greeting@v1");
    });

    it("should return null if file doesn't exist", () => {
      const evalsDir = path.join(testDir, "evals");
      fs.mkdirSync(evalsDir, { recursive: true });

      const result = readJsonlFileByName(testDir, "nonexistent", config);

      expect(result).toBeNull();
    });
  });
});
