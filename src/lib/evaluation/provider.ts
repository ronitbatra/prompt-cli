/**
 * Provider interface and implementations for generating prompt outputs
 */

/**
 * Result of calling a provider
 */
export interface ProviderResult {
  /**
   * The generated output text
   */
  output: string;

  /**
   * Latency in milliseconds
   */
  latency: number;

  /**
   * Token usage information
   */
  tokens?: {
    /**
     * Number of input tokens (prompt tokens)
     */
    input: number;

    /**
     * Number of output tokens (completion tokens)
     */
    output: number;

    /**
     * Total tokens
     */
    total: number;
  };
}

/**
 * Provider interface for generating prompt outputs
 */
export interface Provider {
  /**
   * Generate output for a given prompt
   *
   * @param prompt - The rendered prompt text
   * @returns Promise resolving to provider result
   */
  generate(prompt: string): Promise<ProviderResult>;
}

/**
 * Configuration options for the mock provider
 */
export interface MockProviderOptions {
  /**
   * Fixed response to return (if provided, this will always be returned)
   */
  fixedResponse?: string;

  /**
   * Simulated latency in milliseconds (default: 100)
   */
  latency?: number;

  /**
   * Whether to generate deterministic output based on prompt hash (default: true)
   */
  deterministic?: boolean;

  /**
   * Custom response generator function
   */
  responseGenerator?: (prompt: string) => string;
}

/**
 * Mock provider for testing and deterministic evaluation
 * 
 * This provider simulates LLM responses without calling external APIs.
 * It can be configured to return fixed responses, generate deterministic
 * outputs based on prompt content, or use custom response generators.
 */
export class MockProvider implements Provider {
  private options: Required<Omit<MockProviderOptions, "fixedResponse" | "responseGenerator">> &
    Pick<MockProviderOptions, "fixedResponse" | "responseGenerator">;

  constructor(options: MockProviderOptions = {}) {
    this.options = {
      latency: options.latency ?? 100,
      deterministic: options.deterministic ?? true,
      fixedResponse: options.fixedResponse,
      responseGenerator: options.responseGenerator,
    };
  }

  async generate(prompt: string): Promise<ProviderResult> {
    const startTime = Date.now();

    // Simulate latency
    await this.simulateLatency();

    // Generate output
    let output: string;
    if (this.options.fixedResponse !== undefined) {
      output = this.options.fixedResponse;
    } else if (this.options.responseGenerator) {
      output = this.options.responseGenerator(prompt);
    } else if (this.options.deterministic) {
      output = this.generateDeterministicResponse(prompt);
    } else {
      output = this.generateRandomResponse(prompt);
    }

    const latency = Date.now() - startTime;

    // Estimate token counts (rough approximation: 1 token ≈ 4 characters)
    const inputTokens = Math.ceil(prompt.length / 4);
    const outputTokens = Math.ceil(output.length / 4);

    return {
      output,
      latency,
      tokens: {
        input: inputTokens,
        output: outputTokens,
        total: inputTokens + outputTokens,
      },
    };
  }

  /**
   * Simulate network latency
   */
  private async simulateLatency(): Promise<void> {
    if (this.options.latency > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.options.latency));
    }
  }

  /**
   * Generate a deterministic response based on prompt content
   * Uses a simple hash of the prompt to generate consistent outputs
   */
  private generateDeterministicResponse(prompt: string): string {
    // Simple hash function for determinism
    const hash = this.simpleHash(prompt);
    
    // Generate response based on hash
    // This creates a deterministic but varied response
    const responses = [
      `This is a mock response to your prompt. The prompt contains ${prompt.length} characters.`,
      `I understand you're asking about: "${prompt.substring(0, 50)}${prompt.length > 50 ? "..." : ""}". Here's a helpful response.`,
      `Based on your prompt, here's what I think: The input is ${prompt.split(/\s+/).length} words long and contains important information.`,
      `Thank you for your prompt. I've processed it and here's my response.`,
    ];

    const index = hash % responses.length;
    return responses[Math.abs(index)];
  }

  /**
   * Generate a random response (for non-deterministic mode)
   */
  private generateRandomResponse(prompt: string): string {
    const responses = [
      `Mock response 1 for prompt: ${prompt.substring(0, 30)}...`,
      `Mock response 2: I received your prompt.`,
      `Mock response 3: Here's a generated response.`,
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  /**
   * Simple hash function for deterministic output
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }
}

/**
 * Create a mock provider instance
 *
 * @param options - Configuration options
 * @returns Mock provider instance
 */
export function createMockProvider(options?: MockProviderOptions): MockProvider {
  return new MockProvider(options);
}
