import { describe, it, expect } from "vitest";
import {
  extractVariables,
  validatePromptVersion,
  validateVariablesProvided,
  getTemplateVariables,
} from "./prompt-validation";
import type { PromptVersion, PromptMetadata } from "../types/prompt";

describe("Prompt Validation", () => {
  describe("extractVariables", () => {
    it("should extract single variable", () => {
      const template = "Hello {{userName}}!";
      const variables = extractVariables(template);
      expect(variables).toEqual(new Set(["userName"]));
    });

    it("should extract multiple variables", () => {
      const template = "Hello {{userName}}, your {{item}} is ready.";
      const variables = extractVariables(template);
      expect(variables).toEqual(new Set(["userName", "item"]));
    });

    it("should extract duplicate variables only once", () => {
      const template = "Hello {{userName}}, {{userName}} again!";
      const variables = extractVariables(template);
      expect(variables).toEqual(new Set(["userName"]));
    });

    it("should handle empty template", () => {
      const template = "";
      const variables = extractVariables(template);
      expect(variables).toEqual(new Set());
    });

    it("should handle template with no variables", () => {
      const template = "This is a plain text template.";
      const variables = extractVariables(template);
      expect(variables).toEqual(new Set());
    });

    it("should handle variables with underscores", () => {
      const template = "Hello {{user_name}} and {{item_id}}!";
      const variables = extractVariables(template);
      expect(variables).toEqual(new Set(["user_name", "item_id"]));
    });

    it("should ignore invalid variable syntax", () => {
      const template = "Hello {userName} and {{userName}}!";
      const variables = extractVariables(template);
      expect(variables).toEqual(new Set(["userName"]));
    });
  });

  describe("validatePromptVersion", () => {
    it("should validate a valid prompt version", () => {
      const promptVersion: PromptVersion = {
        name: "greeting",
        version: "v1",
        template: "Hello {{userName}}!",
        metadata: {
          name: "greeting",
          version: "v1",
          variables: ["userName"],
        },
      };

      const result = validatePromptVersion(promptVersion);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect missing name in metadata", () => {
      const promptVersion: PromptVersion = {
        name: "greeting",
        version: "v1",
        template: "Hello!",
        metadata: {
          version: "v1",
        } as PromptMetadata,
      };

      const result = validatePromptVersion(promptVersion);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Metadata missing required field: name");
    });

    it("should detect missing version in metadata", () => {
      const promptVersion: PromptVersion = {
        name: "greeting",
        version: "v1",
        template: "Hello!",
        metadata: {
          name: "greeting",
        } as PromptMetadata,
      };

      const result = validatePromptVersion(promptVersion);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Metadata missing required field: version"
      );
    });

    it("should detect name mismatch", () => {
      const promptVersion: PromptVersion = {
        name: "greeting",
        version: "v1",
        template: "Hello!",
        metadata: {
          name: "wrong-name",
          version: "v1",
        },
      };

      const result = validatePromptVersion(promptVersion);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("does not match"))).toBe(
        true
      );
    });

    it("should detect version mismatch", () => {
      const promptVersion: PromptVersion = {
        name: "greeting",
        version: "v1",
        template: "Hello!",
        metadata: {
          name: "greeting",
          version: "v2",
        },
      };

      const result = validatePromptVersion(promptVersion);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("does not match"))).toBe(
        true
      );
    });

    it("should warn about undeclared variables", () => {
      const promptVersion: PromptVersion = {
        name: "greeting",
        version: "v1",
        template: "Hello {{userName}} and {{tone}}!",
        metadata: {
          name: "greeting",
          version: "v1",
          variables: ["userName"], // Missing "tone"
        },
      };

      const result = validatePromptVersion(promptVersion);
      expect(result.isValid).toBe(true); // Warnings don't make it invalid
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes("not declared"))).toBe(
        true
      );
    });

    it("should warn about unused declared variables", () => {
      const promptVersion: PromptVersion = {
        name: "greeting",
        version: "v1",
        template: "Hello {{userName}}!",
        metadata: {
          name: "greeting",
          version: "v1",
          variables: ["userName", "unusedVar"], // "unusedVar" not in template
        },
      };

      const result = validatePromptVersion(promptVersion);
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes("not used"))).toBe(true);
    });

    it("should warn when template has variables but metadata doesn't declare any", () => {
      const promptVersion: PromptVersion = {
        name: "greeting",
        version: "v1",
        template: "Hello {{userName}}!",
        metadata: {
          name: "greeting",
          version: "v1",
          // No variables field
        },
      };

      const result = validatePromptVersion(promptVersion);
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(
        result.warnings.some((w) => w.includes("not declared"))
      ).toBe(true);
    });

    it("should handle perfect match between template and metadata variables", () => {
      const promptVersion: PromptVersion = {
        name: "greeting",
        version: "v1",
        template: "Hello {{userName}} and {{tone}}!",
        metadata: {
          name: "greeting",
          version: "v1",
          variables: ["userName", "tone"],
        },
      };

      const result = validatePromptVersion(promptVersion);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe("validateVariablesProvided", () => {
    it("should validate all required variables are provided", () => {
      const template = "Hello {{userName}} and {{tone}}!";
      const provided = {
        userName: "Alice",
        tone: "friendly",
      };

      const result = validateVariablesProvided(template, provided);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect missing required variables", () => {
      const template = "Hello {{userName}} and {{tone}}!";
      const provided = {
        userName: "Alice",
        // Missing "tone"
      };

      const result = validateVariablesProvided(template, provided);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.includes("Missing"))).toBe(true);
    });

    it("should warn about unused variables", () => {
      const template = "Hello {{userName}}!";
      const provided = {
        userName: "Alice",
        unusedVar: "value",
      };

      const result = validateVariablesProvided(template, provided);
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes("Unused"))).toBe(true);
    });

    it("should handle template with no variables", () => {
      const template = "Hello world!";
      const provided = {};

      const result = validateVariablesProvided(template, provided);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should handle empty provided variables for template with variables", () => {
      const template = "Hello {{userName}}!";
      const provided = {};

      const result = validateVariablesProvided(template, provided);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("getTemplateVariables", () => {
    it("should return sorted array of variables", () => {
      const template = "Hello {{zebra}} and {{apple}}!";
      const variables = getTemplateVariables(template);
      expect(variables).toEqual(["apple", "zebra"]);
    });

    it("should return empty array for template with no variables", () => {
      const template = "Hello world!";
      const variables = getTemplateVariables(template);
      expect(variables).toEqual([]);
    });

    it("should handle duplicate variables", () => {
      const template = "Hello {{userName}}, {{userName}} again!";
      const variables = getTemplateVariables(template);
      expect(variables).toEqual(["userName"]);
    });
  });
});

