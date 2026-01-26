import { describe, it, expect, beforeEach, afterEach, beforeAll } from "vitest";
import { createProviderFromConfig, getDefaultProviderType } from "./provider-factory";
import type { PromptforgeConfig } from "../workspace/types";
import { registerProviders } from "./providers/index";

describe("Provider Factory", () => {
  const originalEnv = process.env;

  beforeAll(() => {
    // Ensure providers are registered
    registerProviders();
  });

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("createProviderFromConfig", () => {
    it("should create mock provider by default", async () => {
      const config: PromptforgeConfig = {
        version: "1.0",
      };

      const provider = await createProviderFromConfig(config);

      expect(provider.getType()).toBe("mock");
    });

    it("should create mock provider when explicitly specified", async () => {
      const config: PromptforgeConfig = {
        version: "1.0",
        provider: {
          type: "mock",
        },
      };

      const provider = await createProviderFromConfig(config);

      expect(provider.getType()).toBe("mock");
    });

    it("should create OpenAI provider when specified", async () => {
      process.env.OPENAI_API_KEY = "test-key";

      const config: PromptforgeConfig = {
        version: "1.0",
        provider: {
          type: "openai",
        },
      };

      const provider = await createProviderFromConfig(config);

      expect(provider.getType()).toBe("openai");
    });

    it("should use OpenAI config options", async () => {
      process.env.OPENAI_API_KEY = "test-key";

      const config: PromptforgeConfig = {
        version: "1.0",
        provider: {
          type: "openai",
          openai: {
            model: "gpt-4",
            temperature: 0.7,
            maxTokens: 100,
          },
        },
      };

      const provider = await createProviderFromConfig(config);

      expect(provider.getType()).toBe("openai");
      // Provider should be created successfully with custom options
    });

    it("should use provider name from config", async () => {
      const config: PromptforgeConfig = {
        version: "1.0",
        provider: {
          type: "mock",
          name: "custom-provider",
        },
      };

      const provider = await createProviderFromConfig(config);

      expect(provider.getName()).toBe("custom-provider");
    });

    it("should throw error for unregistered provider type", async () => {
      const config: PromptforgeConfig = {
        version: "1.0",
        provider: {
          type: "anthropic" as any, // Not yet registered
        },
      };

      await expect(createProviderFromConfig(config)).rejects.toThrow(
        "not registered"
      );
    });
  });

  describe("getDefaultProviderType", () => {
    it("should return mock as default", () => {
      const config: PromptforgeConfig = {
        version: "1.0",
      };

      const providerType = getDefaultProviderType(config);

      expect(providerType).toBe("mock");
    });

    it("should return provider type from config", () => {
      const config: PromptforgeConfig = {
        version: "1.0",
        provider: {
          type: "openai",
        },
      };

      const providerType = getDefaultProviderType(config);

      expect(providerType).toBe("openai");
    });

    it("should return evaluation defaultProvider if set", () => {
      const config: PromptforgeConfig = {
        version: "1.0",
        evaluation: {
          defaultProvider: "openai",
        },
      };

      const providerType = getDefaultProviderType(config);

      expect(providerType).toBe("openai");
    });

    it("should prioritize provider.type over evaluation.defaultProvider", () => {
      const config: PromptforgeConfig = {
        version: "1.0",
        provider: {
          type: "mock",
        },
        evaluation: {
          defaultProvider: "openai",
        },
      };

      const providerType = getDefaultProviderType(config);

      expect(providerType).toBe("mock");
    });
  });
});
