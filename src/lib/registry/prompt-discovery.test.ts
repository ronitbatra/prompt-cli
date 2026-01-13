import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import {
  discoverPrompts,
  discoverPrompt,
  discoverPromptVersion,
  getPromptNames,
  promptExists,
  loadTemplate,
  loadTemplateByVersion,
  loadLatestTemplate,
  loadPromptVersion,
  loadMetadata,
  loadMetadataByVersion,
  loadLatestMetadata,
} from "./prompt-discovery";
import { createDefaultConfig } from "../workspace/config";
import { PromptDirectoryStructure } from "./prompt-structure";
import type { PromptforgeConfig } from "../workspace/types";

describe("Prompt Discovery", () => {
  let testDir: string;
  let config: PromptforgeConfig;

  beforeEach(() => {
    // Create temporary directory for each test
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), "promptforge-test-"));
    config = createDefaultConfig();

    // Create prompts directory
    const promptsDir = path.join(testDir, "prompts");
    fs.mkdirSync(promptsDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up temporary directory
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe("discoverPrompts", () => {
    it("should return empty array when prompts directory does not exist", () => {
      const emptyDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "promptforge-empty-")
      );
      const emptyConfig = createDefaultConfig();

      const prompts = discoverPrompts(emptyDir, emptyConfig);

      expect(prompts).toEqual([]);

      fs.rmSync(emptyDir, { recursive: true, force: true });
    });

    it("should return empty array when prompts directory is empty", () => {
      const prompts = discoverPrompts(testDir, config);
      expect(prompts).toEqual([]);
    });

    it("should discover a single prompt with one version", () => {
      // Create prompt structure
      createTestPrompt(
        testDir,
        "greeting",
        "v1",
        {
          name: "greeting",
          version: "v1",
          description: "A greeting prompt",
          variables: ["userName"],
        },
        "Hello {{userName}}!"
      );

      const prompts = discoverPrompts(testDir, config);

      expect(prompts).toHaveLength(1);
      expect(prompts[0].name).toBe("greeting");
      expect(prompts[0].versions).toHaveLength(1);
      expect(prompts[0].latestVersion).toBe("v1");
    });

    it("should discover multiple prompts", () => {
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

      const prompts = discoverPrompts(testDir, config);

      expect(prompts).toHaveLength(2);
      expect(prompts.map((p) => p.name)).toContain("greeting");
      expect(prompts.map((p) => p.name)).toContain("farewell");
    });

    it("should discover multiple versions of the same prompt", () => {
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

      const prompts = discoverPrompts(testDir, config);

      expect(prompts).toHaveLength(1);
      expect(prompts[0].versions).toHaveLength(2);
      expect(prompts[0].latestVersion).toBe("v2");
    });

    it("should skip invalid version directories", () => {
      const promptsDir = path.join(testDir, "prompts");
      const promptDir = path.join(promptsDir, "greeting");
      fs.mkdirSync(promptDir, { recursive: true });

      // Create invalid version directory (not starting with 'v')
      const invalidDir = path.join(promptDir, "invalid");
      fs.mkdirSync(invalidDir, { recursive: true });

      const prompts = discoverPrompts(testDir, config);

      expect(prompts).toHaveLength(0);
    });

    it("should skip prompts with missing files", () => {
      const promptsDir = path.join(testDir, "prompts");
      const promptDir = path.join(promptsDir, "incomplete");
      const versionDir = path.join(promptDir, "v1");
      fs.mkdirSync(versionDir, { recursive: true });

      // Create only template file, missing metadata
      const templatePath = path.join(versionDir, "incomplete.prompt.md");
      fs.writeFileSync(templatePath, "Template");

      const prompts = discoverPrompts(testDir, config);

      expect(prompts).toHaveLength(0);
    });
  });

  describe("discoverPrompt", () => {
    it("should return null for non-existent prompt", () => {
      const prompt = discoverPrompt(testDir, "nonexistent", config);
      expect(prompt).toBeNull();
    });

    it("should discover a prompt with all versions", () => {
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

      const prompt = discoverPrompt(testDir, "greeting", config);

      expect(prompt).not.toBeNull();
      expect(prompt?.name).toBe("greeting");
      expect(prompt?.versions).toHaveLength(2);
      expect(prompt?.latestVersion).toBe("v2");
    });
  });

  describe("discoverPromptVersion", () => {
    it("should return null when files are missing", () => {
      const version = discoverPromptVersion(testDir, "greeting", "v1", config);
      expect(version).toBeNull();
    });

    it("should discover a valid prompt version", () => {
      const metadata = {
        name: "greeting",
        version: "v1",
        description: "A greeting",
        variables: ["userName"],
      };
      const template = "Hello {{userName}}!";

      createTestPrompt(testDir, "greeting", "v1", metadata, template);

      const version = discoverPromptVersion(testDir, "greeting", "v1", config);

      expect(version).not.toBeNull();
      expect(version?.name).toBe("greeting");
      expect(version?.version).toBe("v1");
      expect(version?.template).toBe(template);
      expect(version?.metadata).toMatchObject(metadata);
    });

    it("should throw error when metadata name doesn't match", () => {
      const metadata = {
        name: "wrong-name",
        version: "v1",
      };
      createTestPrompt(testDir, "greeting", "v1", metadata, "Template");

      expect(() => {
        discoverPromptVersion(testDir, "greeting", "v1", config);
      }).toThrow();
    });

    it("should throw error when metadata version doesn't match", () => {
      const metadata = {
        name: "greeting",
        version: "v2", // Wrong version
      };
      createTestPrompt(testDir, "greeting", "v1", metadata, "Template");

      expect(() => {
        discoverPromptVersion(testDir, "greeting", "v1", config);
      }).toThrow();
    });
  });

  describe("getPromptNames", () => {
    it("should return empty array when no prompts exist", () => {
      const names = getPromptNames(testDir, config);
      expect(names).toEqual([]);
    });

    it("should return all prompt names", () => {
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

      const names = getPromptNames(testDir, config);
      expect(names).toHaveLength(2);
      expect(names).toContain("greeting");
      expect(names).toContain("farewell");
    });
  });

  describe("promptExists", () => {
    it("should return false for non-existent prompt", () => {
      expect(promptExists(testDir, "nonexistent", config)).toBe(false);
    });

    it("should return true for existing prompt", () => {
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

      expect(promptExists(testDir, "greeting", config)).toBe(true);
    });
  });

  describe("loadTemplate", () => {
    it("should load template by prompt reference with version", () => {
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

      const template = loadTemplate(testDir, "greeting@v1", config);
      expect(template).toBe("Hello v1!");
    });

    it("should load latest template when version not specified", () => {
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

      const template = loadTemplate(testDir, "greeting", config);
      expect(template).toBe("Hello v2!"); // Should load latest (v2)
    });

    it("should throw error for non-existent prompt", () => {
      expect(() => {
        loadTemplate(testDir, "nonexistent", config);
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
        loadTemplate(testDir, "greeting@v99", config);
      }).toThrow("Template not found");
    });
  });

  describe("loadTemplateByVersion", () => {
    it("should load template for specific version", () => {
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

      const template = loadTemplateByVersion(testDir, "greeting", "v1", config);
      expect(template).toBe("Hello v1!");
    });

    it("should throw error when template file doesn't exist", () => {
      expect(() => {
        loadTemplateByVersion(testDir, "nonexistent", "v1", config);
      }).toThrow("Template not found");
    });
  });

  describe("loadLatestTemplate", () => {
    it("should load latest version template", () => {
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

      const template = loadLatestTemplate(testDir, "greeting", config);
      expect(template).toBe("Hello v3!"); // Should be v3 (latest)
    });

    it("should throw error for non-existent prompt", () => {
      expect(() => {
        loadLatestTemplate(testDir, "nonexistent", config);
      }).toThrow("Prompt not found: nonexistent");
    });
  });

  describe("loadPromptVersion", () => {
    it("should load PromptVersion by reference with version", () => {
      const metadata = {
        name: "greeting",
        version: "v1",
        description: "A greeting",
        variables: ["userName"],
      };
      createTestPrompt(
        testDir,
        "greeting",
        "v1",
        metadata,
        "Hello {{userName}}!"
      );

      const version = loadPromptVersion(testDir, "greeting@v1", config);

      expect(version.name).toBe("greeting");
      expect(version.version).toBe("v1");
      expect(version.template).toBe("Hello {{userName}}!");
      expect(version.metadata).toMatchObject(metadata);
    });

    it("should load latest PromptVersion when version not specified", () => {
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

      const version = loadPromptVersion(testDir, "greeting", config);

      expect(version.version).toBe("v2"); // Should be latest
      expect(version.template).toBe("Hello v2!");
    });

    it("should throw error for non-existent prompt", () => {
      expect(() => {
        loadPromptVersion(testDir, "nonexistent", config);
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
        loadPromptVersion(testDir, "greeting@v99", config);
      }).toThrow("Prompt version not found");
    });
  });

  describe("loadMetadata", () => {
    it("should load metadata by prompt reference with version", () => {
      const metadata = {
        name: "greeting",
        version: "v1",
        description: "A greeting prompt",
        variables: ["userName"],
      };
      createTestPrompt(testDir, "greeting", "v1", metadata, "Hello!");

      const loadedMetadata = loadMetadata(testDir, "greeting@v1", config);
      expect(loadedMetadata).toMatchObject(metadata);
    });

    it("should load latest metadata when version not specified", () => {
      createTestPrompt(
        testDir,
        "greeting",
        "v1",
        {
          name: "greeting",
          version: "v1",
          description: "Version 1",
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
          description: "Version 2",
        },
        "Hello v2!"
      );

      const metadata = loadMetadata(testDir, "greeting", config);
      expect(metadata.version).toBe("v2"); // Should load latest (v2)
      expect(metadata.description).toBe("Version 2");
    });

    it("should throw error for non-existent prompt", () => {
      expect(() => {
        loadMetadata(testDir, "nonexistent", config);
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
        loadMetadata(testDir, "greeting@v99", config);
      }).toThrow("Metadata not found");
    });
  });

  describe("loadMetadataByVersion", () => {
    it("should load metadata for specific version", () => {
      const metadata = {
        name: "greeting",
        version: "v1",
        description: "A greeting",
        variables: ["userName"],
        tags: ["greeting", "example"],
      };
      createTestPrompt(testDir, "greeting", "v1", metadata, "Hello!");

      const loadedMetadata = loadMetadataByVersion(
        testDir,
        "greeting",
        "v1",
        config
      );
      expect(loadedMetadata).toMatchObject(metadata);
    });

    it("should throw error when metadata file doesn't exist", () => {
      expect(() => {
        loadMetadataByVersion(testDir, "nonexistent", "v1", config);
      }).toThrow("Metadata not found");
    });

    it("should throw error when metadata name doesn't match", () => {
      const metadata = {
        name: "wrong-name",
        version: "v1",
      };
      createTestPrompt(testDir, "greeting", "v1", metadata, "Template");

      expect(() => {
        loadMetadataByVersion(testDir, "greeting", "v1", config);
      }).toThrow("does not match prompt directory");
    });

    it("should throw error when metadata version doesn't match", () => {
      const metadata = {
        name: "greeting",
        version: "v2", // Wrong version
      };
      createTestPrompt(testDir, "greeting", "v1", metadata, "Template");

      expect(() => {
        loadMetadataByVersion(testDir, "greeting", "v1", config);
      }).toThrow("does not match version directory");
    });

    it("should throw error for invalid JSON", () => {
      const promptsDir = path.join(testDir, "prompts");
      const promptDir = path.join(promptsDir, "greeting");
      const versionDir = path.join(promptDir, "v1");
      fs.mkdirSync(versionDir, { recursive: true });

      const metadataPath = path.join(versionDir, "greeting.meta.json");
      fs.writeFileSync(metadataPath, "invalid json {", "utf-8");

      expect(() => {
        loadMetadataByVersion(testDir, "greeting", "v1", config);
      }).toThrow("Invalid JSON");
    });
  });

  describe("loadLatestMetadata", () => {
    it("should load latest version metadata", () => {
      createTestPrompt(
        testDir,
        "greeting",
        "v1",
        {
          name: "greeting",
          version: "v1",
          description: "Version 1",
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
          description: "Version 2",
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
          description: "Version 3",
        },
        "Hello v3!"
      );

      const metadata = loadLatestMetadata(testDir, "greeting", config);
      expect(metadata.version).toBe("v3"); // Should be v3 (latest)
      expect(metadata.description).toBe("Version 3");
    });

    it("should throw error for non-existent prompt", () => {
      expect(() => {
        loadLatestMetadata(testDir, "nonexistent", config);
      }).toThrow("Prompt not found: nonexistent");
    });
  });
});

/**
 * Helper function to create a test prompt structure
 */
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
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), "utf-8");
}
