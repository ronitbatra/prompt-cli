import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  readCredential,
  requireCredential,
  readOpenAIKey,
  requireOpenAIKey,
  readAnthropicKey,
  requireAnthropicKey,
  hasCredential,
  getCredentialInfo,
} from "./credentials";

describe("Credentials", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    // Clear relevant env vars
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("readCredential", () => {
    it("should return explicit value when provided", () => {
      const result = readCredential({
        explicit: "explicit-key",
        envVars: ["TEST_KEY"],
      });

      expect(result.value).toBe("explicit-key");
      expect(result.source).toBe("explicit");
    });

    it("should read from environment variable", () => {
      process.env.TEST_KEY = "env-key";

      const result = readCredential({
        envVars: ["TEST_KEY"],
      });

      expect(result.value).toBe("env-key");
      expect(result.source).toBe("environment");
      expect(result.envVar).toBe("TEST_KEY");
    });

    it("should use first available environment variable", () => {
      process.env.FIRST_KEY = "first";
      process.env.SECOND_KEY = "second";

      const result = readCredential({
        envVars: ["FIRST_KEY", "SECOND_KEY"],
      });

      expect(result.value).toBe("first");
      expect(result.envVar).toBe("FIRST_KEY");
    });

    it("should return undefined if not found", () => {
      const result = readCredential({
        envVars: ["NONEXISTENT_KEY"],
      });

      expect(result.value).toBeUndefined();
      expect(result.source).toBe("not_found");
    });

    it("should trim whitespace from values", () => {
      process.env.TEST_KEY = "  key-value  ";

      const result = readCredential({
        envVars: ["TEST_KEY"],
      });

      expect(result.value).toBe("key-value");
    });

    it("should ignore empty strings", () => {
      process.env.TEST_KEY = "";

      const result = readCredential({
        envVars: ["TEST_KEY"],
      });

      expect(result.value).toBeUndefined();
    });

    it("should ignore whitespace-only strings", () => {
      process.env.TEST_KEY = "   ";

      const result = readCredential({
        envVars: ["TEST_KEY"],
      });

      expect(result.value).toBeUndefined();
    });
  });

  describe("requireCredential", () => {
    it("should return value when found", () => {
      process.env.TEST_KEY = "test-value";

      const value = requireCredential({
        envVars: ["TEST_KEY"],
      });

      expect(value).toBe("test-value");
    });

    it("should throw error when not found", () => {
      expect(() => {
        requireCredential({
          envVars: ["NONEXISTENT_KEY"],
        });
      }).toThrow("Credential is required");
    });

    it("should use custom error message", () => {
      expect(() => {
        requireCredential({
          envVars: ["NONEXISTENT_KEY"],
          errorMessage: "Custom error message",
        });
      }).toThrow("Custom error message");
    });
  });

  describe("readOpenAIKey", () => {
    it("should read from OPENAI_API_KEY", () => {
      process.env.OPENAI_API_KEY = "openai-key";

      const key = readOpenAIKey();

      expect(key).toBe("openai-key");
    });

    it("should read from OPENAI_KEY if OPENAI_API_KEY not set", () => {
      process.env.OPENAI_KEY = "openai-key-alt";

      const key = readOpenAIKey();

      expect(key).toBe("openai-key-alt");
    });

    it("should prefer OPENAI_API_KEY over OPENAI_KEY", () => {
      process.env.OPENAI_API_KEY = "primary-key";
      process.env.OPENAI_KEY = "secondary-key";

      const key = readOpenAIKey();

      expect(key).toBe("primary-key");
    });

    it("should use explicit key when provided", () => {
      const key = readOpenAIKey("explicit-key");

      expect(key).toBe("explicit-key");
    });

    it("should return undefined if not found", () => {
      const key = readOpenAIKey();

      expect(key).toBeUndefined();
    });
  });

  describe("requireOpenAIKey", () => {
    it("should return key when found", () => {
      process.env.OPENAI_API_KEY = "test-key";

      const key = requireOpenAIKey();

      expect(key).toBe("test-key");
    });

    it("should throw error with helpful message when not found", () => {
      expect(() => {
        requireOpenAIKey();
      }).toThrow("OpenAI API key is required");
    });

    it("should use explicit key when provided", () => {
      const key = requireOpenAIKey("explicit-key");

      expect(key).toBe("explicit-key");
    });
  });

  describe("readAnthropicKey", () => {
    it("should read from ANTHROPIC_API_KEY", () => {
      process.env.ANTHROPIC_API_KEY = "anthropic-key";

      const key = readAnthropicKey();

      expect(key).toBe("anthropic-key");
    });

    it("should read from ANTHROPIC_KEY if ANTHROPIC_API_KEY not set", () => {
      process.env.ANTHROPIC_KEY = "anthropic-key-alt";

      const key = readAnthropicKey();

      expect(key).toBe("anthropic-key-alt");
    });

    it("should return undefined if not found", () => {
      const key = readAnthropicKey();

      expect(key).toBeUndefined();
    });
  });

  describe("requireAnthropicKey", () => {
    it("should return key when found", () => {
      process.env.ANTHROPIC_API_KEY = "test-key";

      const key = requireAnthropicKey();

      expect(key).toBe("test-key");
    });

    it("should throw error with helpful message when not found", () => {
      expect(() => {
        requireAnthropicKey();
      }).toThrow("Anthropic API key is required");
    });
  });

  describe("hasCredential", () => {
    it("should return true when credential exists", () => {
      process.env.TEST_KEY = "value";

      const exists = hasCredential({
        envVars: ["TEST_KEY"],
      });

      expect(exists).toBe(true);
    });

    it("should return false when credential does not exist", () => {
      const exists = hasCredential({
        envVars: ["NONEXISTENT_KEY"],
      });

      expect(exists).toBe(false);
    });

    it("should return true for explicit value", () => {
      const exists = hasCredential({
        explicit: "value",
      });

      expect(exists).toBe(true);
    });
  });

  describe("getCredentialInfo", () => {
    it("should return info about found credential", () => {
      process.env.TEST_KEY = "value";

      const info = getCredentialInfo({
        envVars: ["TEST_KEY", "OTHER_KEY"],
      });

      expect(info.found).toBe(true);
      expect(info.source).toBe("environment");
      expect(info.envVarsChecked).toEqual(["TEST_KEY", "OTHER_KEY"]);
      expect(info.envVarsFound).toEqual(["TEST_KEY"]);
    });

    it("should return info about not found credential", () => {
      const info = getCredentialInfo({
        envVars: ["NONEXISTENT_KEY"],
      });

      expect(info.found).toBe(false);
      expect(info.source).toBe("not_found");
      expect(info.envVarsFound).toEqual([]);
    });

    it("should return info about explicit credential", () => {
      const info = getCredentialInfo({
        explicit: "explicit-value",
        envVars: ["TEST_KEY"],
      });

      expect(info.found).toBe(true);
      expect(info.source).toBe("explicit");
    });
  });
});
