/**
 * OpenAI provider implementation
 *
 * This provider integrates with OpenAI's API to generate real LLM outputs.
 */

import type {
  Provider,
  ProviderType,
  BaseProviderConfig,
} from "../provider-types";
import type { ProviderResult } from "../provider";
import { requireOpenAIKey } from "../credentials";

/**
 * OpenAI-specific configuration
 */
export interface OpenAIProviderConfig extends BaseProviderConfig {
  type: "openai";

  /**
   * OpenAI API key (or read from OPENAI_API_KEY environment variable)
   */
  apiKey?: string;

  /**
   * Model to use (default: "gpt-3.5-turbo")
   */
  model?: string;

  /**
   * Maximum tokens in the response (optional)
   */
  maxTokens?: number;

  /**
   * Temperature for generation (0-2, default: 1)
   */
  temperature?: number;

  /**
   * Base URL for API (default: "https://api.openai.com/v1")
   */
  baseURL?: string;
}

/**
 * OpenAI API response structure
 */
interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * OpenAI API error response structure
 */
interface OpenAIErrorResponse {
  error: {
    message: string;
    type: string;
    code?: string;
  };
}

/**
 * OpenAI provider implementation
 */
export class OpenAIProvider implements Provider {
  private config: Required<
    Pick<OpenAIProviderConfig, "model" | "temperature" | "baseURL">
  > &
    Pick<OpenAIProviderConfig, "apiKey" | "maxTokens" | "name">;

  constructor(config: OpenAIProviderConfig) {
    // Read API key from config or environment using credential manager
    const apiKey = requireOpenAIKey(config.apiKey);

    this.config = {
      apiKey,
      model: config.model || "gpt-3.5-turbo",
      temperature: config.temperature ?? 1,
      maxTokens: config.maxTokens,
      baseURL: config.baseURL || "https://api.openai.com/v1",
      name: config.name,
    };
  }

  async generate(prompt: string): Promise<ProviderResult> {
    const startTime = Date.now();

    // Validate before making request
    await this.validate();

    try {
      const response = await fetch(`${this.config.baseURL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: this.config.temperature,
          ...(this.config.maxTokens && { max_tokens: this.config.maxTokens }),
        }),
      });

      const latency = Date.now() - startTime;

      if (!response.ok) {
        const errorData = (await response.json()) as OpenAIErrorResponse;
        const status = response.status;
        const errorMsg = errorData.error?.message || response.statusText;

        // Provide helpful error messages for common status codes
        let helpfulMessage = `OpenAI API error (${status}): ${errorMsg}`;

        if (status === 401) {
          helpfulMessage +=
            "\n\nYour API key is invalid or missing.\n" +
            "Please check your OPENAI_API_KEY environment variable or config.";
        } else if (status === 429) {
          helpfulMessage +=
            "\n\nRate limit exceeded. Please wait a moment and try again.";
        } else if (status === 500 || status === 503) {
          helpfulMessage +=
            "\n\nOpenAI service is temporarily unavailable. Please try again later.";
        }

        throw new Error(helpfulMessage);
      }

      const data = (await response.json()) as OpenAIResponse;

      // Extract the generated text
      const output =
        data.choices[0]?.message?.content ||
        data.choices[0]?.message?.content ||
        "";

      if (!output) {
        throw new Error("No content in OpenAI response");
      }

      return {
        output,
        latency,
        tokens: {
          input: data.usage.prompt_tokens,
          output: data.usage.completion_tokens,
          total: data.usage.total_tokens,
        },
      };
    } catch (error) {
      const latency = Date.now() - startTime;

      // Re-throw with latency information if it's a known error
      if (error instanceof Error) {
        throw new Error(`${error.message} (latency: ${latency}ms)`);
      }

      throw error;
    }
  }

  getType(): ProviderType {
    return "openai";
  }

  getName(): string | undefined {
    return this.config.name;
  }

  async validate(): Promise<void> {
    // API key is already validated in constructor via requireOpenAIKey
    // But we can add additional validation here if needed
    if (!this.config.apiKey || this.config.apiKey.trim() === "") {
      throw new Error("OpenAI API key cannot be empty");
    }

    // Validate temperature range
    if (this.config.temperature < 0 || this.config.temperature > 2) {
      throw new Error(
        `Temperature must be between 0 and 2, got ${this.config.temperature}`
      );
    }

    // Validate model name format (basic check)
    if (!this.config.model || this.config.model.trim() === "") {
      throw new Error("Model name cannot be empty");
    }
  }
}

/**
 * Create an OpenAI provider instance
 *
 * @param config - OpenAI provider configuration
 * @returns OpenAI provider instance
 */
export function createOpenAIProvider(
  config: OpenAIProviderConfig
): OpenAIProvider {
  return new OpenAIProvider(config);
}
