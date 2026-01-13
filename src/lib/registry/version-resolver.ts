import { PromptDirectoryStructure } from "./prompt-structure";
import { discoverPrompt, discoverPromptVersion } from "./prompt-discovery";
import type { PromptVersion } from "../types/prompt";
import type { PromptforgeConfig } from "../workspace/types";

/**
 * Result of resolving a prompt reference
 */
export interface ResolvedPromptVersion {
  name: string;
  version: string;
  promptVersion: PromptVersion;
  reference: string; // The resolved reference (e.g., "greeting@v1")
}

/**
 * Resolve a prompt reference to a specific version
 * Supports both "name@version" and "name" formats
 *
 * @param workspaceRoot - Root directory of the workspace
 * @param promptRef - Prompt reference (e.g., "greeting@v1" or "greeting")
 * @param config - Workspace configuration
 * @returns Resolved prompt version information
 * @throws Error if prompt or version not found
 *
 * @example
 * ```typescript
 * // Resolve specific version
 * const resolved = resolvePromptVersion(workspaceRoot, "greeting@v1", config);
 * console.log(resolved.version); // "v1"
 * console.log(resolved.reference); // "greeting@v1"
 *
 * // Resolve latest version
 * const resolved = resolvePromptVersion(workspaceRoot, "greeting", config);
 * console.log(resolved.version); // "v2" (latest)
 * console.log(resolved.reference); // "greeting@v2"
 * ```
 */
export function resolvePromptVersion(
  workspaceRoot: string,
  promptRef: string,
  config: PromptforgeConfig
): ResolvedPromptVersion {
  const { name, version } = PromptDirectoryStructure.parsePromptRef(promptRef);

  // If version is explicitly specified, resolve to that version
  if (version) {
    const promptVersion = discoverPromptVersion(
      workspaceRoot,
      name,
      version,
      config
    );

    if (!promptVersion) {
      throw new Error(
        `Prompt version not found: ${name}@${version}\n` +
          `Available versions can be checked with discoverPrompt("${name}")`
      );
    }

    return {
      name,
      version,
      promptVersion,
      reference: PromptDirectoryStructure.formatPromptRef(name, version),
    };
  }

  // Otherwise, resolve to latest version
  const prompt = discoverPrompt(workspaceRoot, name, config);

  if (!prompt) {
    throw new Error(`Prompt not found: ${name}`);
  }

  if (prompt.versions.length === 0) {
    throw new Error(`Prompt "${name}" has no valid versions`);
  }

  // Get the latest version (already sorted in discoverPrompt)
  const latestVersion = prompt.versions[prompt.versions.length - 1];

  return {
    name,
    version: latestVersion.version,
    promptVersion: latestVersion,
    reference: PromptDirectoryStructure.formatPromptRef(
      name,
      latestVersion.version
    ),
  };
}

/**
 * Check if a prompt reference is valid and can be resolved
 *
 * @param workspaceRoot - Root directory of the workspace
 * @param promptRef - Prompt reference to check
 * @param config - Workspace configuration
 * @returns True if the reference can be resolved, false otherwise
 */
export function canResolvePromptVersion(
  workspaceRoot: string,
  promptRef: string,
  config: PromptforgeConfig
): boolean {
  try {
    resolvePromptVersion(workspaceRoot, promptRef, config);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all available versions for a prompt
 *
 * @param workspaceRoot - Root directory of the workspace
 * @param promptName - Name of the prompt
 * @param config - Workspace configuration
 * @returns Array of version strings (e.g., ["v1", "v2", "v3"])
 * @throws Error if prompt not found
 */
export function getAvailableVersions(
  workspaceRoot: string,
  promptName: string,
  config: PromptforgeConfig
): string[] {
  const prompt = discoverPrompt(workspaceRoot, promptName, config);

  if (!prompt) {
    throw new Error(`Prompt not found: ${promptName}`);
  }

  return prompt.versions.map((v) => v.version);
}

/**
 * Get the latest version string for a prompt
 *
 * @param workspaceRoot - Root directory of the workspace
 * @param promptName - Name of the prompt
 * @param config - Workspace configuration
 * @returns Latest version string (e.g., "v2")
 * @throws Error if prompt not found or has no versions
 */
export function getLatestVersion(
  workspaceRoot: string,
  promptName: string,
  config: PromptforgeConfig
): string {
  const prompt = discoverPrompt(workspaceRoot, promptName, config);

  if (!prompt) {
    throw new Error(`Prompt not found: ${promptName}`);
  }

  if (prompt.versions.length === 0) {
    throw new Error(`Prompt "${promptName}" has no valid versions`);
  }

  return prompt.latestVersion;
}

/**
 * Normalize a prompt reference to always include version
 * If version is not specified, resolves to latest version
 *
 * @param workspaceRoot - Root directory of the workspace
 * @param promptRef - Prompt reference (e.g., "greeting" or "greeting@v1")
 * @param config - Workspace configuration
 * @returns Normalized reference with version (e.g., "greeting@v2")
 * @throws Error if prompt not found
 */
export function normalizePromptRef(
  workspaceRoot: string,
  promptRef: string,
  config: PromptforgeConfig
): string {
  const resolved = resolvePromptVersion(workspaceRoot, promptRef, config);
  return resolved.reference;
}
