/**
 * Provider type definitions and interfaces for Phase 6
 *
 * This module defines the core provider interface and types needed
 * for integrating real LLM providers (OpenAI, Anthropic, etc.)
 */

import type { ProviderResult } from "./provider";

/**
 * Provider type identifiers
 */
export type ProviderType = "mock" | "openai" | "anthropic";

/**
 * Base configuration for all providers
 */
export interface BaseProviderConfig {
  /**
   * Provider type identifier
   */
  type: ProviderType;

  /**
   * Optional name for this provider instance
   */
  name?: string;
}

/**
 * Union type of all provider configurations
 */
export type ProviderConfig = BaseProviderConfig;

/**
 * Provider interface for generating prompt outputs
 *
 * All providers (mock, OpenAI, Anthropic, etc.) must implement this interface.
 */
export interface Provider {
  /**
   * Generate output for a given prompt
   *
   * @param prompt - The rendered prompt text
   * @returns Promise resolving to provider result with output, latency, and token usage
   */
  generate(prompt: string): Promise<ProviderResult>;

  /**
   * Get the provider type
   */
  getType(): ProviderType;

  /**
   * Get the provider name (if configured)
   */
  getName(): string | undefined;

  /**
   * Validate provider configuration and credentials
   *
   * @throws Error if provider is not properly configured
   */
  validate(): void | Promise<void>;
}

/**
 * Provider factory function type
 *
 * Creates a provider instance from configuration
 */
export type ProviderFactory = (
  config: BaseProviderConfig
) => Provider | Promise<Provider>;

/**
 * Provider registry for managing provider types and factories
 */
export class ProviderRegistry {
  private factories: Map<ProviderType, ProviderFactory> = new Map();

  /**
   * Register a provider factory
   *
   * @param type - Provider type identifier
   * @param factory - Factory function to create provider instances
   */
  register(type: ProviderType, factory: ProviderFactory): void {
    this.factories.set(type, factory);
  }

  /**
   * Create a provider instance from configuration
   *
   * @param config - Provider configuration
   * @returns Provider instance
   * @throws Error if provider type is not registered
   */
  async create(config: BaseProviderConfig): Promise<Provider> {
    const factory = this.factories.get(config.type);
    if (!factory) {
      throw new Error(
        `Provider type "${config.type}" is not registered. Available types: ${Array.from(this.factories.keys()).join(", ")}`
      );
    }

    return factory(config);
  }

  /**
   * Check if a provider type is registered
   *
   * @param type - Provider type identifier
   * @returns True if registered
   */
  isRegistered(type: ProviderType): boolean {
    return this.factories.has(type);
  }

  /**
   * Get list of registered provider types
   *
   * @returns Array of registered provider type identifiers
   */
  getRegisteredTypes(): ProviderType[] {
    return Array.from(this.factories.keys());
  }
}

/**
 * Global provider registry instance
 */
export const providerRegistry = new ProviderRegistry();
