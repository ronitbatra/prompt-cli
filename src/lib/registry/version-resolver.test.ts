import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import {
  resolvePromptVersion,
  canResolvePromptVersion,
  getAvailableVersions,
  getLatestVersion,
  normalizePromptRef,
} from "./version-resolver";
import { createDefaultConfig } from "../workspace/config";
import { PromptDirectoryStructure } from "./prompt-structure";
import type { PromptforgeConfig } from "../workspace/types";

describe("Version Resolver", () => {
  let testDir: string;
  let config: PromptforgeConfig;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), "promptforge-test-"));
    config = createDefaultConfig();

    const promptsDir = path.join(testDir, "prompts");
    fs.mkdirSync(promptsDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  function createTestPrompt(
    workspaceRoot: string,
    promptName: string,
    version: string,
    metadata: Record<string, unknown>,
    template: string
  ): void {
    const versionDir = PromptDirectoryStructure.getVersionDir(
      workspaceRoot,
      promptName,
      version
    );
    fs.mkdirSync(versionDir, { recursive: true });

    const templatePath = PromptDirectoryStructure.getTemplatePath(
      workspaceRoot,
      promptName,
      version
    );
    fs.writeFileSync(templatePath, template, "utf-8");

    const metadataPath = PromptDirectoryStructure.getMetadataPath(
      workspaceRoot,
      promptName,
      version
    );
    fs.writeFileSync(
      metadataPath,
      JSON.stringify(metadata, null, 2),
      "utf-8"
    );
  }

  describe("resolvePromptVersion", () => {
    it("should resolve specific version", () => {
      createTestPrompt(
        testDir,
        "greeting",
        "v1",
        {
          name: "greeting",
          version: "v1",
        },
        "Hello v1!"
      );

      const resolved = resolvePromptVersion(testDir, "greeting@v1", config);

      expect(resolved.name).toBe("greeting");
      expect(resolved.version).toBe("v1");
      expect(resolved.reference).toBe("greeting@v1");
      expect(resolved.promptVersion.template).toBe("Hello v1!");
    });

    it("should resolve latest version when no version specified", () => {
      createTestPrompt(
        testDir,
        "greeting",
        "v1",
        {
          name: "greeting",
          version: "v1",
        },
        "Hello v1!"
      );

      createTestPrompt(
        testDir,
        "greeting",
        "v2",
        {
          name: "greeting",
          version: "v2",
        },
        "Hello v2!"
      );

      const resolved = resolvePromptVersion(testDir, "greeting", config);

      expect(resolved.name).toBe("greeting");
      expect(resolved.version).toBe("v2"); // Latest
      expect(resolved.reference).toBe("greeting@v2");
      expect(resolved.promptVersion.template).toBe("Hello v2!");
    });

    it("should throw error for non-existent prompt", () => {
      expect(() => {
        resolvePromptVersion(testDir, "nonexistent", config);
      }).toThrow("Prompt not found: nonexistent");
    });

    it("should throw error for non-existent version", () => {
      createTestPrompt(
        testDir,
        "greeting",
        "v1",
        {
          name: "greeting",
          version: "v1",
        },
        "Hello!"
      );

      expect(() => {
        resolvePromptVersion(testDir, "greeting@v99", config);
      }).toThrow("Prompt version not found");
    });

    it("should handle multiple prompts with different versions", () => {
      createTestPrompt(
        testDir,
        "greeting",
        "v1",
        {
          name: "greeting",
          version: "v1",
        },
        "Hello!"
      );

      createTestPrompt(
        testDir,
        "farewell",
        "v1",
        {
          name: "farewell",
          version: "v1",
        },
        "Goodbye!"
      );

      const greeting = resolvePromptVersion(testDir, "greeting@v1", config);
      const farewell = resolvePromptVersion(testDir, "farewell@v1", config);

      expect(greeting.name).toBe("greeting");
      expect(farewell.name).toBe("farewell");
    });
  });

  describe("canResolvePromptVersion", () => {
    it("should return true for valid prompt reference", () => {
      createTestPrompt(
        testDir,
        "greeting",
        "v1",
        {
          name: "greeting",
          version: "v1",
        },
        "Hello!"
      );

      expect(canResolvePromptVersion(testDir, "greeting@v1", config)).toBe(
        true
      );
      expect(canResolvePromptVersion(testDir, "greeting", config)).toBe(true);
    });

    it("should return false for invalid prompt reference", () => {
      expect(canResolvePromptVersion(testDir, "nonexistent", config)).toBe(
        false
      );
      expect(canResolvePromptVersion(testDir, "greeting@v99", config)).toBe(
        false
      );
    });
  });

  describe("getAvailableVersions", () => {
    it("should return all available versions", () => {
      createTestPrompt(
        testDir,
        "greeting",
        "v1",
        {
          name: "greeting",
          version: "v1",
        },
        "Hello v1!"
      );

      createTestPrompt(
        testDir,
        "greeting",
        "v2",
        {
          name: "greeting",
          version: "v2",
        },
        "Hello v2!"
      );

      createTestPrompt(
        testDir,
        "greeting",
        "v3",
        {
          name: "greeting",
          version: "v3",
        },
        "Hello v3!"
      );

      const versions = getAvailableVersions(testDir, "greeting", config);

      expect(versions).toEqual(["v1", "v2", "v3"]);
    });

    it("should throw error for non-existent prompt", () => {
      expect(() => {
        getAvailableVersions(testDir, "nonexistent", config);
      }).toThrow("Prompt not found: nonexistent");
    });
  });

  describe("getLatestVersion", () => {
    it("should return latest version", () => {
      createTestPrompt(
        testDir,
        "greeting",
        "v1",
        {
          name: "greeting",
          version: "v1",
        },
        "Hello v1!"
      );

      createTestPrompt(
        testDir,
        "greeting",
        "v2",
        {
          name: "greeting",
          version: "v2",
        },
        "Hello v2!"
      );

      createTestPrompt(
        testDir,
        "greeting",
        "v3",
        {
          name: "greeting",
          version: "v3",
        },
        "Hello v3!"
      );

      const latest = getLatestVersion(testDir, "greeting", config);

      expect(latest).toBe("v3");
    });

    it("should throw error for non-existent prompt", () => {
      expect(() => {
        getLatestVersion(testDir, "nonexistent", config);
      }).toThrow("Prompt not found: nonexistent");
    });

    it("should throw error for prompt with no versions", () => {
      // When a prompt directory exists but has no valid versions,
      // discoverPrompt returns null, which is treated as "prompt not found"
      const promptsDir = path.join(testDir, "prompts");
      const promptDir = path.join(promptsDir, "empty");
      fs.mkdirSync(promptDir, { recursive: true });
      
      // Create an invalid version directory (not matching v\d+ pattern)
      const invalidVersionDir = path.join(promptDir, "invalid");
      fs.mkdirSync(invalidVersionDir, { recursive: true });

      // discoverPrompt returns null when no valid versions found
      expect(() => {
        getLatestVersion(testDir, "empty", config);
      }).toThrow("Prompt not found: empty");
    });
  });

  describe("normalizePromptRef", () => {
    it("should normalize reference with version", () => {
      createTestPrompt(
        testDir,
        "greeting",
        "v1",
        {
          name: "greeting",
          version: "v1",
        },
        "Hello!"
      );

      const normalized = normalizePromptRef(testDir, "greeting@v1", config);

      expect(normalized).toBe("greeting@v1");
    });

    it("should normalize reference without version to latest", () => {
      createTestPrompt(
        testDir,
        "greeting",
        "v1",
        {
          name: "greeting",
          version: "v1",
        },
        "Hello v1!"
      );

      createTestPrompt(
        testDir,
        "greeting",
        "v2",
        {
          name: "greeting",
          version: "v2",
        },
        "Hello v2!"
      );

      const normalized = normalizePromptRef(testDir, "greeting", config);

      expect(normalized).toBe("greeting@v2"); // Latest version
    });

    it("should throw error for non-existent prompt", () => {
      expect(() => {
        normalizePromptRef(testDir, "nonexistent", config);
      }).toThrow("Prompt not found: nonexistent");
    });
  });
});

