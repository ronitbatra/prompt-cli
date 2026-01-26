import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { OpenAIProvider, createOpenAIProvider } from "./openai";
import type { OpenAIProviderConfig } from "./openai";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("OpenAI Provider", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("constructor", () => {
    it("should create provider with config", () => {
      const config: OpenAIProviderConfig = {
        type: "openai",
        apiKey: "test-key",
        model: "gpt-4",
      };

      const provider = new OpenAIProvider(config);

      expect(provider.getType()).toBe("openai");
    });

    it("should read API key from environment", () => {
      process.env.OPENAI_API_KEY = "env-key";

      const config: OpenAIProviderConfig = {
        type: "openai",
      };

      const provider = new OpenAIProvider(config);

      // API key is stored internally, we can't directly access it
      // But validation should pass
      expect(provider.getType()).toBe("openai");
    });

    it("should throw error if API key is missing", () => {
      const config: OpenAIProviderConfig = {
        type: "openai",
      };

      expect(() => {
        new OpenAIProvider(config);
      }).toThrow("OpenAI API key is required");
    });

    it("should use default model if not specified", () => {
      const config: OpenAIProviderConfig = {
        type: "openai",
        apiKey: "test-key",
      };

      const provider = new OpenAIProvider(config);

      expect(provider.getType()).toBe("openai");
    });

    it("should accept custom base URL", () => {
      const config: OpenAIProviderConfig = {
        type: "openai",
        apiKey: "test-key",
        baseURL: "https://custom-api.com/v1",
      };

      const provider = new OpenAIProvider(config);

      expect(provider.getType()).toBe("openai");
    });
  });

  describe("validate", () => {
    it("should throw error if API key is missing in constructor", () => {
      const config: OpenAIProviderConfig = {
        type: "openai",
      };

      expect(() => {
        new OpenAIProvider(config);
      }).toThrow("OpenAI API key is required");
    });

    it("should throw error if API key is empty in constructor", () => {
      const config: OpenAIProviderConfig = {
        type: "openai",
        apiKey: "   ",
      };

      expect(() => {
        new OpenAIProvider(config);
      }).toThrow("OpenAI API key is required");
    });

    it("should throw error for invalid temperature", async () => {
      const config: OpenAIProviderConfig = {
        type: "openai",
        apiKey: "test-key",
        temperature: 3, // Invalid: > 2
      };

      const provider = new OpenAIProvider(config);

      await expect(provider.validate()).rejects.toThrow("Temperature");
    });

    it("should throw error for negative temperature", async () => {
      const config: OpenAIProviderConfig = {
        type: "openai",
        apiKey: "test-key",
        temperature: -1,
      };

      const provider = new OpenAIProvider(config);

      await expect(provider.validate()).rejects.toThrow("Temperature");
    });

    it("should pass validation with valid config", async () => {
      const config: OpenAIProviderConfig = {
        type: "openai",
        apiKey: "test-key",
        model: "gpt-3.5-turbo",
        temperature: 1,
      };

      const provider = new OpenAIProvider(config);

      await expect(provider.validate()).resolves.not.toThrow();
    });
  });

  describe("generate", () => {
    it("should generate output successfully", async () => {
      const mockResponse: any = {
        id: "chatcmpl-123",
        object: "chat.completion",
        created: 1677652288,
        model: "gpt-3.5-turbo",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: "Hello! How can I help you?",
            },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 8,
          total_tokens: 18,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const config: OpenAIProviderConfig = {
        type: "openai",
        apiKey: "test-key",
      };

      const provider = new OpenAIProvider(config);
      const result = await provider.generate("Hello");

      expect(result.output).toBe("Hello! How can I help you?");
      expect(result.tokens).toEqual({
        input: 10,
        output: 8,
        total: 18,
      });
      expect(result.latency).toBeGreaterThanOrEqual(0);
    });

    it("should handle API errors", async () => {
      const mockErrorResponse: any = {
        error: {
          message: "Invalid API key",
          type: "invalid_request_error",
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => mockErrorResponse,
      });

      const config: OpenAIProviderConfig = {
        type: "openai",
        apiKey: "invalid-key",
      };

      const provider = new OpenAIProvider(config);

      await expect(provider.generate("Hello")).rejects.toThrow(
        "OpenAI API error"
      );
    });

    it("should throw error if no content in response", async () => {
      const mockResponse: any = {
        choices: [
          {
            message: {
              content: "",
            },
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 0,
          total_tokens: 10,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const config: OpenAIProviderConfig = {
        type: "openai",
        apiKey: "test-key",
      };

      const provider = new OpenAIProvider(config);

      await expect(provider.generate("Hello")).rejects.toThrow(
        "No content in OpenAI response"
      );
    });

    it("should use custom model and temperature", async () => {
      const mockResponse: any = {
        choices: [
          {
            message: {
              content: "Response",
            },
          },
        ],
        usage: {
          prompt_tokens: 5,
          completion_tokens: 2,
          total_tokens: 7,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const config: OpenAIProviderConfig = {
        type: "openai",
        apiKey: "test-key",
        model: "gpt-4",
        temperature: 0.7,
      };

      const provider = new OpenAIProvider(config);
      await provider.generate("Test prompt");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/chat/completions"),
        expect.objectContaining({
          body: expect.stringContaining('"model":"gpt-4"'),
        })
      );

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(callBody.temperature).toBe(0.7);
    });
  });

  describe("createOpenAIProvider", () => {
    it("should create provider instance", () => {
      const config: OpenAIProviderConfig = {
        type: "openai",
        apiKey: "test-key",
      };

      const provider = createOpenAIProvider(config);

      expect(provider).toBeInstanceOf(OpenAIProvider);
      expect(provider.getType()).toBe("openai");
    });
  });
});
