import { describe, it, expect, beforeEach } from "vitest";
import { MockProvider, createMockProvider } from "./provider";

describe("Mock Provider", () => {
  describe("MockProvider", () => {
    it("should generate output", async () => {
      const provider = new MockProvider();
      const prompt = "Hello, how are you?";

      const result = await provider.generate(prompt);

      expect(result.output).toBeDefined();
      expect(result.output.length).toBeGreaterThan(0);
      expect(result.latency).toBeGreaterThanOrEqual(0);
      expect(result.tokens).toBeDefined();
      expect(result.tokens!.input).toBeGreaterThan(0);
      expect(result.tokens!.output).toBeGreaterThan(0);
      expect(result.tokens!.total).toBe(
        result.tokens!.input + result.tokens!.output
      );
    });

    it("should return fixed response when configured", async () => {
      const fixedResponse = "This is a fixed response";
      const provider = new MockProvider({ fixedResponse });

      const result1 = await provider.generate("Prompt 1");
      const result2 = await provider.generate("Prompt 2");

      expect(result1.output).toBe(fixedResponse);
      expect(result2.output).toBe(fixedResponse);
    });

    it("should generate deterministic responses by default", async () => {
      const provider = new MockProvider({ deterministic: true });
      const prompt = "Test prompt";

      const result1 = await provider.generate(prompt);
      const result2 = await provider.generate(prompt);

      // Deterministic provider should return same output for same input
      expect(result1.output).toBe(result2.output);
    });

    it("should generate different responses for different prompts", async () => {
      const provider = new MockProvider({ deterministic: true });

      const result1 = await provider.generate("Prompt 1");
      const result2 = await provider.generate("Prompt 2");

      // Different prompts should generate different outputs
      expect(result1.output).not.toBe(result2.output);
    });

    it("should simulate latency", async () => {
      const latency = 200;
      const provider = new MockProvider({ latency });

      const startTime = Date.now();
      await provider.generate("Test");
      const endTime = Date.now();

      const actualLatency = endTime - startTime;
      // Allow some margin for test execution time
      expect(actualLatency).toBeGreaterThanOrEqual(latency - 50);
      expect(actualLatency).toBeLessThan(latency + 100);
    });

    it("should use custom response generator when provided", async () => {
      const generator = (prompt: string) => `Custom: ${prompt}`;
      const provider = new MockProvider({ responseGenerator: generator });

      const result = await provider.generate("test prompt");

      expect(result.output).toBe("Custom: test prompt");
    });

    it("should prioritize fixed response over generator", async () => {
      const fixedResponse = "Fixed";
      const generator = (prompt: string) => `Generated: ${prompt}`;
      const provider = new MockProvider({
        fixedResponse,
        responseGenerator: generator,
      });

      const result = await provider.generate("test");

      expect(result.output).toBe(fixedResponse);
    });

    it("should estimate token counts", async () => {
      const provider = new MockProvider();
      const prompt = "This is a test prompt with multiple words";

      const result = await provider.generate(prompt);

      expect(result.tokens).toBeDefined();
      expect(result.tokens!.input).toBeGreaterThan(0);
      expect(result.tokens!.output).toBeGreaterThan(0);
      // Rough check: tokens should be approximately length/4
      expect(result.tokens!.input).toBeGreaterThanOrEqual(
        Math.floor(prompt.length / 5)
      );
    });

    it("should handle empty prompt", async () => {
      const provider = new MockProvider();

      const result = await provider.generate("");

      expect(result.output).toBeDefined();
      expect(result.tokens!.input).toBe(0);
    });

    it("should handle very long prompts", async () => {
      const provider = new MockProvider();
      const longPrompt = "a".repeat(10000);

      const result = await provider.generate(longPrompt);

      expect(result.output).toBeDefined();
      expect(result.tokens!.input).toBeGreaterThan(1000);
    });
  });

  describe("createMockProvider", () => {
    it("should create provider with default options", async () => {
      const provider = createMockProvider();
      const result = await provider.generate("test");

      expect(result.output).toBeDefined();
      expect(result.latency).toBeGreaterThanOrEqual(0);
    });

    it("should create provider with custom options", async () => {
      const provider = createMockProvider({
        fixedResponse: "Custom response",
        latency: 50,
      });

      const result = await provider.generate("test");

      expect(result.output).toBe("Custom response");
    });
  });
});
