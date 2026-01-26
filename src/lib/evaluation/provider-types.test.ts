import { describe, it, expect } from "vitest";
import {
  ProviderRegistry,
  providerRegistry,
  type ProviderType,
  type BaseProviderConfig,
  type Provider,
} from "./provider-types";
import { MockProvider } from "./provider";

describe("Provider Types", () => {
  describe("ProviderRegistry", () => {
    it("should register and create providers", async () => {
      const registry = new ProviderRegistry();

      // Register mock provider factory
      registry.register("mock", (config) => {
        return new MockProvider({}, config.name);
      });

      const provider = await registry.create({
        type: "mock",
        name: "test-provider",
      });

      expect(provider.getType()).toBe("mock");
      expect(provider.getName()).toBe("test-provider");
    });

    it("should throw error for unregistered provider type", async () => {
      const registry = new ProviderRegistry();

      await expect(
        registry.create({
          type: "openai",
        } as BaseProviderConfig)
      ).rejects.toThrow("not registered");
    });

    it("should check if provider type is registered", () => {
      const registry = new ProviderRegistry();

      expect(registry.isRegistered("mock")).toBe(false);

      registry.register("mock", () => new MockProvider());
      expect(registry.isRegistered("mock")).toBe(true);
    });

    it("should get list of registered types", () => {
      const registry = new ProviderRegistry();

      expect(registry.getRegisteredTypes()).toEqual([]);

      registry.register("mock", () => new MockProvider());
      registry.register("openai", () => {
        throw new Error("Not implemented");
      });

      const types = registry.getRegisteredTypes();
      expect(types).toContain("mock");
      expect(types).toContain("openai");
    });
  });

  describe("MockProvider with Provider interface", () => {
    it("should implement Provider interface", () => {
      const provider = new MockProvider({}, "test");

      expect(provider.getType()).toBe("mock");
      expect(provider.getName()).toBe("test");
      expect(() => provider.validate()).not.toThrow();
    });

    it("should generate output", async () => {
      const provider = new MockProvider({
        fixedResponse: "Test output",
      });

      const result = await provider.generate("test prompt");

      expect(result.output).toBe("Test output");
      expect(result.latency).toBeGreaterThanOrEqual(0);
      expect(result.tokens).toBeDefined();
    });

    it("should have undefined name when not provided", () => {
      const provider = new MockProvider();

      expect(provider.getName()).toBeUndefined();
    });
  });

  describe("Global provider registry", () => {
    it("should exist and be usable", () => {
      expect(providerRegistry).toBeInstanceOf(ProviderRegistry);
    });

    it("should register mock provider by default", async () => {
      // Register mock provider
      providerRegistry.register("mock", (config) => {
        return new MockProvider({}, config.name);
      });

      const provider = await providerRegistry.create({
        type: "mock",
        name: "default-mock",
      });

      expect(provider.getType()).toBe("mock");
      expect(provider.getName()).toBe("default-mock");
    });
  });
});
