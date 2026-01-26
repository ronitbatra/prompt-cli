/**
 * Provider implementations and registration
 *
 * This module registers all available providers with the global registry.
 */

import { providerRegistry } from "../provider-types";
import { createOpenAIProvider, type OpenAIProviderConfig } from "./openai";
import { createMockProvider, type MockProviderOptions } from "../provider";
import type { BaseProviderConfig } from "../provider-types";

/**
 * Register all providers with the global registry
 */
export function registerProviders(): void {
  // Register mock provider
  providerRegistry.register("mock", (config: BaseProviderConfig) => {
    return createMockProvider({}, config.name);
  });

  // Register OpenAI provider
  providerRegistry.register("openai", (config: BaseProviderConfig) => {
    return createOpenAIProvider(config as OpenAIProviderConfig);
  });
}

// Auto-register providers when this module is imported
registerProviders();
