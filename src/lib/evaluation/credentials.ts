/**
 * Credential management for LLM providers
 * 
 * This module provides utilities for reading credentials from environment variables
 * and other sources. It supports multiple credential sources and provides clear
 * error messages when credentials are missing.
 */

/**
 * Credential source priority:
 * 1. Explicitly provided value (highest priority)
 * 2. Environment variables
 * 3. Error if not found
 */

/**
 * Options for reading credentials
 */
export interface CredentialOptions {
  /**
   * Explicit credential value (takes highest priority)
   */
  explicit?: string;

  /**
   * Environment variable names to check (in order of priority)
   */
  envVars?: string[];

  /**
   * Custom error message when credential is not found
   */
  errorMessage?: string;
}

/**
 * Result of reading a credential
 */
export interface CredentialResult {
  /**
   * The credential value (if found)
   */
  value: string | undefined;

  /**
   * Source where the credential was found
   */
  source: "explicit" | "environment" | "not_found";

  /**
   * Environment variable name that was used (if found in env)
   */
  envVar?: string;
}

/**
 * Read a credential from various sources
 *
 * @param options - Credential reading options
 * @returns Credential result with value and source information
 */
export function readCredential(
  options: CredentialOptions
): CredentialResult {
  // Priority 1: Explicit value
  if (options.explicit !== undefined && options.explicit.trim() !== "") {
    return {
      value: options.explicit.trim(),
      source: "explicit",
    };
  }

  // Priority 2: Environment variables
  const envVars = options.envVars || [];
  for (const envVar of envVars) {
    const value = process.env[envVar];
    if (value !== undefined && value.trim() !== "") {
      return {
        value: value.trim(),
        source: "environment",
        envVar,
      };
    }
  }

  // Not found
  return {
    value: undefined,
    source: "not_found",
  };
}

/**
 * Read a credential and throw an error if not found
 *
 * @param options - Credential reading options
 * @returns The credential value
 * @throws Error if credential is not found
 */
export function requireCredential(options: CredentialOptions): string {
  const result = readCredential(options);

  if (result.value === undefined) {
    const envVarList =
      options.envVars && options.envVars.length > 0
        ? options.envVars.join(", ")
        : "none specified";
    const errorMessage =
      options.errorMessage ||
      `Credential is required. Set one of these environment variables: ${envVarList}`;

    throw new Error(errorMessage);
  }

  return result.value;
}

/**
 * Read OpenAI API key from various sources
 *
 * @param explicitKey - Explicitly provided API key
 * @returns The API key, or undefined if not found
 */
export function readOpenAIKey(explicitKey?: string): string | undefined {
  const result = readCredential({
    explicit: explicitKey,
    envVars: ["OPENAI_API_KEY", "OPENAI_KEY"],
  });

  return result.value;
}

/**
 * Require OpenAI API key and throw error if not found
 *
 * @param explicitKey - Explicitly provided API key
 * @returns The API key
 * @throws Error if API key is not found
 */
export function requireOpenAIKey(explicitKey?: string): string {
  return requireCredential({
    explicit: explicitKey,
    envVars: ["OPENAI_API_KEY", "OPENAI_KEY"],
    errorMessage:
      "OpenAI API key is required. Set OPENAI_API_KEY environment variable or provide apiKey in config.",
  });
}

/**
 * Read Anthropic API key from various sources
 *
 * @param explicitKey - Explicitly provided API key
 * @returns The API key, or undefined if not found
 */
export function readAnthropicKey(explicitKey?: string): string | undefined {
  const result = readCredential({
    explicit: explicitKey,
    envVars: ["ANTHROPIC_API_KEY", "ANTHROPIC_KEY"],
  });

  return result.value;
}

/**
 * Require Anthropic API key and throw error if not found
 *
 * @param explicitKey - Explicitly provided API key
 * @returns The API key
 * @throws Error if API key is not found
 */
export function requireAnthropicKey(explicitKey?: string): string {
  return requireCredential({
    explicit: explicitKey,
    envVars: ["ANTHROPIC_API_KEY", "ANTHROPIC_KEY"],
    errorMessage:
      "Anthropic API key is required. Set ANTHROPIC_API_KEY environment variable or provide apiKey in config.",
  });
}

/**
 * Check if a credential exists without reading it
 *
 * @param options - Credential reading options
 * @returns True if credential exists
 */
export function hasCredential(options: CredentialOptions): boolean {
  const result = readCredential(options);
  return result.value !== undefined;
}

/**
 * Get information about credential sources
 * Useful for debugging and error messages
 *
 * @param options - Credential reading options
 * @returns Object with credential status information
 */
export function getCredentialInfo(options: CredentialOptions): {
  found: boolean;
  source: CredentialResult["source"];
  envVarsChecked: string[];
  envVarsFound: string[];
} {
  const result = readCredential(options);
  const envVars = options.envVars || [];

  const envVarsFound = envVars.filter(
    (envVar) => process.env[envVar] !== undefined && process.env[envVar]!.trim() !== ""
  );

  return {
    found: result.value !== undefined,
    source: result.source,
    envVarsChecked: envVars,
    envVarsFound,
  };
}
