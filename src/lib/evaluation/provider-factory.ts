/**
 * Provider factory for creating providers from workspace configuration
 */

import type { PromptforgeConfig } from "../workspace/types";
import { providerRegistry } from "./provider-types";
import type { BaseProviderConfig } from "./provider-types";
import type { OpenAIProviderConfig } from "./providers/openai";

/**
 * Create a provider instance from workspace configuration
 *
 * @param config - Workspace configuration
 * @returns Provider instance
 * @throws Error if provider type is invalid or not registered
 */
export async function createProviderFromConfig(
  config: PromptforgeConfig
): Promise<import("./provider-types").Provider> {
  // Get provider type from config (default to mock)
  const providerType = config.provider?.type || "mock";

  // Build base provider config
  const baseConfig: BaseProviderConfig = {
    type: providerType,
    name: config.provider?.name,
  };

  // Add provider-specific configuration
  let providerConfig: BaseProviderConfig;
  if (providerType === "openai") {
    const openaiOptions = config.provider?.openai || {};
    const openaiConfig: OpenAIProviderConfig = {
      ...baseConfig,
      type: "openai",
      model: openaiOptions.model,
      temperature: openaiOptions.temperature,
      maxTokens: openaiOptions.maxTokens,
      baseURL: openaiOptions.baseURL,
      apiKey: openaiOptions.apiKey,
    };
    providerConfig = openaiConfig;
  } else {
    // Mock provider or other providers use base config
    providerConfig = baseConfig;
  }

  // Create provider from registry
  return providerRegistry.create(providerConfig);
}

/**
 * Get the default provider type from config
 *
 * @param config - Workspace configuration
 * @returns Provider type identifier
 */
export function getDefaultProviderType(config: PromptforgeConfig): string {
  return config.provider?.type || config.evaluation?.defaultProvider || "mock";
}
