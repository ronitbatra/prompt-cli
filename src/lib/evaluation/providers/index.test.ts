import { describe, it, expect, beforeAll } from "vitest";
import { providerRegistry } from "../provider-types";
import type { BaseProviderConfig } from "../provider-types";
import { registerProviders } from "./index";

describe("Provider Registration", () => {
  beforeAll(() => {
    // Ensure providers are registered
    registerProviders();
  });

  it("should have mock provider registered", () => {
    expect(providerRegistry.isRegistered("mock")).toBe(true);
  });

  it("should have OpenAI provider registered", () => {
    expect(providerRegistry.isRegistered("openai")).toBe(true);
  });

  it("should create mock provider from registry", async () => {
    const config: BaseProviderConfig = {
      type: "mock",
      name: "test-mock",
    };

    const provider = await providerRegistry.create(config);

    expect(provider.getType()).toBe("mock");
    expect(provider.getName()).toBe("test-mock");
  });

  it("should create OpenAI provider from registry", async () => {
    const config: BaseProviderConfig = {
      type: "openai",
      apiKey: "test-key",
      name: "test-openai",
    };

    const provider = await providerRegistry.create(config);

    expect(provider.getType()).toBe("openai");
    expect(provider.getName()).toBe("test-openai");
  });

  it("should list registered provider types", () => {
    const types = providerRegistry.getRegisteredTypes();

    expect(types).toContain("mock");
    expect(types).toContain("openai");
  });
});
