import fs from "fs";
import path from "path";
import { PromptDirectoryStructure } from "./prompt-structure";
import type { Prompt, PromptVersion, PromptMetadata } from "../types/prompt";
import type { PromptforgeConfig } from "../workspace/types";
import { getConfigPath } from "../workspace/config";

/**
 * Discover all prompts in the workspace
 *
 * @param workspaceRoot - Root directory of the workspace
 * @param config - Workspace configuration
 * @returns Array of discovered prompts
 */
export function discoverPrompts(
  workspaceRoot: string,
  config: PromptforgeConfig
): Prompt[] {
  const promptsDir = path.join(workspaceRoot, getConfigPath(config, "prompts"));

  // Check if prompts directory exists
  if (!fs.existsSync(promptsDir)) {
    return [];
  }

  const prompts: Prompt[] = [];
  const entries = fs.readdirSync(promptsDir, { withFileTypes: true });

  // Iterate through each entry in prompts directory
  for (const entry of entries) {
    // Only process directories (skip files)
    if (!entry.isDirectory()) {
      continue;
    }

    const promptName = entry.name;

    try {
      const prompt = discoverPrompt(workspaceRoot, promptName, config);
      if (prompt) {
        prompts.push(prompt);
      }
    } catch (error) {
      // Log error but continue discovering other prompts
      console.warn(
        `Warning: Failed to discover prompt "${promptName}": ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return prompts;
}

/**
 * Discover a single prompt and all its versions
 *
 * @param workspaceRoot - Root directory of the workspace
 * @param promptName - Name of the prompt to discover
 * @param config - Workspace configuration
 * @returns Prompt object with all versions, or null if invalid
 */
export function discoverPrompt(
  workspaceRoot: string,
  promptName: string,
  config: PromptforgeConfig
): Prompt | null {
  const promptDir = PromptDirectoryStructure.getPromptDir(
    workspaceRoot,
    promptName
  );

  // Check if prompt directory exists
  if (!fs.existsSync(promptDir)) {
    return null;
  }

  const versions: PromptVersion[] = [];
  const entries = fs.readdirSync(promptDir, { withFileTypes: true });

  // Find all version directories
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const versionName = entry.name;

    // Validate version format (should start with 'v' followed by digits)
    if (!/^v\d+$/.test(versionName)) {
      continue; // Skip invalid version directories
    }

    try {
      const version = discoverPromptVersion(
        workspaceRoot,
        promptName,
        versionName,
        config
      );
      if (version) {
        versions.push(version);
      }
    } catch (error) {
      console.warn(
        `Warning: Failed to discover version "${versionName}" of prompt "${promptName}": ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  if (versions.length === 0) {
    return null; // No valid versions found
  }

  // Sort versions and find latest (highest version number)
  versions.sort((a, b) => {
    const aNum = parseInt(a.version.replace("v", ""), 10);
    const bNum = parseInt(b.version.replace("v", ""), 10);
    return aNum - bNum; // Sort ascending
  });

  const latestVersion = versions[versions.length - 1].version;

  return {
    name: promptName,
    versions,
    latestVersion,
  };
}

/**
 * Discover a specific prompt version
 *
 * @param workspaceRoot - Root directory of the workspace
 * @param promptName - Name of the prompt
 * @param version - Version identifier (e.g., "v1")
 * @param config - Workspace configuration
 * @returns PromptVersion object, or null if invalid
 */
export function discoverPromptVersion(
  workspaceRoot: string,
  promptName: string,
  version: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _config: PromptforgeConfig
): PromptVersion | null {
  const templatePath = PromptDirectoryStructure.getTemplatePath(
    workspaceRoot,
    promptName,
    version
  );
  const metadataPath = PromptDirectoryStructure.getMetadataPath(
    workspaceRoot,
    promptName,
    version
  );

  // Check if both required files exist
  if (!fs.existsSync(templatePath) || !fs.existsSync(metadataPath)) {
    return null;
  }

  try {
    // Read template file
    const template = fs.readFileSync(templatePath, "utf-8");

    // Read and parse metadata file
    const metadataContent = fs.readFileSync(metadataPath, "utf-8");
    const metadata = JSON.parse(metadataContent);

    // Validate metadata structure
    if (!metadata.name || !metadata.version) {
      throw new Error(
        `Metadata missing required fields: name and version in ${metadataPath}`
      );
    }

    // Validate metadata matches directory structure
    if (metadata.name !== promptName) {
      throw new Error(
        `Metadata name "${metadata.name}" does not match prompt directory "${promptName}"`
      );
    }

    if (metadata.version !== version) {
      throw new Error(
        `Metadata version "${metadata.version}" does not match version directory "${version}"`
      );
    }

    return {
      name: promptName,
      version,
      template,
      metadata,
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in metadata file: ${metadataPath}`);
    }
    throw error;
  }
}

/**
 * Get all prompt names in the workspace
 *
 * @param workspaceRoot - Root directory of the workspace
 * @param config - Workspace configuration
 * @returns Array of prompt names
 */
export function getPromptNames(
  workspaceRoot: string,
  config: PromptforgeConfig
): string[] {
  const prompts = discoverPrompts(workspaceRoot, config);
  return prompts.map((p) => p.name);
}

/**
 * Check if a prompt exists
 *
 * @param workspaceRoot - Root directory of the workspace
 * @param promptName - Name of the prompt to check
 * @param config - Workspace configuration
 * @returns True if prompt exists, false otherwise
 */
export function promptExists(
  workspaceRoot: string,
  promptName: string,
  config: PromptforgeConfig
): boolean {
  const prompt = discoverPrompt(workspaceRoot, promptName, config);
  return prompt !== null;
}

/**
 * Load a prompt template by reference
 * Supports both "name@version" and "name" formats (uses latest version if not specified)
 *
 * @param workspaceRoot - Root directory of the workspace
 * @param promptRef - Prompt reference (e.g., "greeting@v1" or "greeting")
 * @param config - Workspace configuration
 * @returns The template content as a string
 * @throws Error if prompt or version not found
 *
 * @example
 * ```typescript
 * // Load specific version
 * const template = loadTemplate(workspaceRoot, "greeting@v1", config);
 *
 * // Load latest version
 * const template = loadTemplate(workspaceRoot, "greeting", config);
 * ```
 */
export function loadTemplate(
  workspaceRoot: string,
  promptRef: string,
  config: PromptforgeConfig
): string {
  const { name, version } = PromptDirectoryStructure.parsePromptRef(promptRef);

  // If version is specified, load that specific version
  if (version) {
    return loadTemplateByVersion(workspaceRoot, name, version, config);
  }

  // Otherwise, load the latest version
  return loadLatestTemplate(workspaceRoot, name, config);
}

/**
 * Load a prompt template for a specific version
 *
 * @param workspaceRoot - Root directory of the workspace
 * @param promptName - Name of the prompt
 * @param version - Version identifier (e.g., "v1")
 * @param config - Workspace configuration
 * @returns The template content as a string
 * @throws Error if prompt or version not found
 */
export function loadTemplateByVersion(
  workspaceRoot: string,
  promptName: string,
  version: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _config: PromptforgeConfig
): string {
  const templatePath = PromptDirectoryStructure.getTemplatePath(
    workspaceRoot,
    promptName,
    version
  );

  if (!fs.existsSync(templatePath)) {
    throw new Error(
      `Template not found: ${promptName}@${version}\n` +
        `Expected file: ${templatePath}`
    );
  }

  try {
    return fs.readFileSync(templatePath, "utf-8");
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to read template file: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Load the latest version of a prompt template
 *
 * @param workspaceRoot - Root directory of the workspace
 * @param promptName - Name of the prompt
 * @param config - Workspace configuration
 * @returns The template content as a string
 * @throws Error if prompt not found or has no versions
 */
export function loadLatestTemplate(
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

  // Get the latest version (already sorted in discoverPrompt)
  const latestVersion = prompt.versions[prompt.versions.length - 1];
  return latestVersion.template;
}

/**
 * Load a prompt template and return the full PromptVersion object
 * Supports both "name@version" and "name" formats (uses latest version if not specified)
 *
 * @param workspaceRoot - Root directory of the workspace
 * @param promptRef - Prompt reference (e.g., "greeting@v1" or "greeting")
 * @param config - Workspace configuration
 * @returns The PromptVersion object containing template and metadata
 * @throws Error if prompt or version not found
 */
export function loadPromptVersion(
  workspaceRoot: string,
  promptRef: string,
  config: PromptforgeConfig
): PromptVersion {
  const { name, version } = PromptDirectoryStructure.parsePromptRef(promptRef);

  // If version is specified, load that specific version
  if (version) {
    const promptVersion = discoverPromptVersion(
      workspaceRoot,
      name,
      version,
      config
    );
    if (!promptVersion) {
      throw new Error(`Prompt version not found: ${name}@${version}`);
    }
    return promptVersion;
  }

  // Otherwise, load the latest version
  const prompt = discoverPrompt(workspaceRoot, name, config);
  if (!prompt) {
    throw new Error(`Prompt not found: ${name}`);
  }

  if (prompt.versions.length === 0) {
    throw new Error(`Prompt "${name}" has no valid versions`);
  }

  // Get the latest version (already sorted in discoverPrompt)
  return prompt.versions[prompt.versions.length - 1];
}

/**
 * Load prompt metadata by reference
 * Supports both "name@version" and "name" formats (uses latest version if not specified)
 *
 * @param workspaceRoot - Root directory of the workspace
 * @param promptRef - Prompt reference (e.g., "greeting@v1" or "greeting")
 * @param config - Workspace configuration
 * @returns The metadata object
 * @throws Error if prompt or version not found
 *
 * @example
 * ```typescript
 * // Load specific version metadata
 * const metadata = loadMetadata(workspaceRoot, "greeting@v1", config);
 *
 * // Load latest version metadata
 * const metadata = loadMetadata(workspaceRoot, "greeting", config);
 * ```
 */
export function loadMetadata(
  workspaceRoot: string,
  promptRef: string,
  config: PromptforgeConfig
): PromptMetadata {
  const { name, version } = PromptDirectoryStructure.parsePromptRef(promptRef);

  // If version is specified, load that specific version
  if (version) {
    return loadMetadataByVersion(workspaceRoot, name, version, config);
  }

  // Otherwise, load the latest version
  return loadLatestMetadata(workspaceRoot, name, config);
}

/**
 * Load prompt metadata for a specific version
 *
 * @param workspaceRoot - Root directory of the workspace
 * @param promptName - Name of the prompt
 * @param version - Version identifier (e.g., "v1")
 * @param config - Workspace configuration
 * @returns The metadata object
 * @throws Error if prompt or version not found
 */
export function loadMetadataByVersion(
  workspaceRoot: string,
  promptName: string,
  version: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _config: PromptforgeConfig
): PromptMetadata {
  const metadataPath = PromptDirectoryStructure.getMetadataPath(
    workspaceRoot,
    promptName,
    version
  );

  if (!fs.existsSync(metadataPath)) {
    throw new Error(
      `Metadata not found: ${promptName}@${version}\n` +
        `Expected file: ${metadataPath}`
    );
  }

  try {
    const metadataContent = fs.readFileSync(metadataPath, "utf-8");
    const metadata = JSON.parse(metadataContent) as PromptMetadata;

    // Validate metadata structure
    if (!metadata.name || !metadata.version) {
      throw new Error(
        `Metadata missing required fields: name and version in ${metadataPath}`
      );
    }

    // Validate metadata matches directory structure
    if (metadata.name !== promptName) {
      throw new Error(
        `Metadata name "${metadata.name}" does not match prompt directory "${promptName}"`
      );
    }

    if (metadata.version !== version) {
      throw new Error(
        `Metadata version "${metadata.version}" does not match version directory "${version}"`
      );
    }

    return metadata;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in metadata file: ${metadataPath}`);
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to load metadata: ${String(error)}`);
  }
}

/**
 * Load the latest version of a prompt's metadata
 *
 * @param workspaceRoot - Root directory of the workspace
 * @param promptName - Name of the prompt
 * @param config - Workspace configuration
 * @returns The metadata object
 * @throws Error if prompt not found or has no versions
 */
export function loadLatestMetadata(
  workspaceRoot: string,
  promptName: string,
  config: PromptforgeConfig
): PromptMetadata {
  const prompt = discoverPrompt(workspaceRoot, promptName, config);

  if (!prompt) {
    throw new Error(`Prompt not found: ${promptName}`);
  }

  if (prompt.versions.length === 0) {
    throw new Error(`Prompt "${promptName}" has no valid versions`);
  }

  // Get the latest version (already sorted in discoverPrompt)
  const latestVersion = prompt.versions[prompt.versions.length - 1];
  return latestVersion.metadata;
}
