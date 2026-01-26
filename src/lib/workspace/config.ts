import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import type { PromptforgeConfig } from "./types";
import { DEFAULT_CONFIG } from "./types";

/**
 * Configuration file name
 */
export const CONFIG_FILE_NAME = "promptforge.yaml";

/**
 * Load and parse promptforge.yaml from a directory
 */
export function loadConfig(workspaceRoot: string): PromptforgeConfig {
  const configPath = path.join(workspaceRoot, CONFIG_FILE_NAME);

  if (!fs.existsSync(configPath)) {
    throw new Error(
      `Configuration file not found: ${configPath}\n\n` +
        `This directory is not a Promptforge workspace.\n` +
        `To initialize a workspace, run:\n` +
        `  prompt-cli init\n\n` +
        `Or navigate to an existing workspace directory.`
    );
  }

  try {
    const fileContents = fs.readFileSync(configPath, "utf-8");
    const parsed = yaml.load(fileContents) as Partial<PromptforgeConfig>;

    // Validate required fields
    if (!parsed.version) {
      throw new Error(
        `Invalid configuration file: ${configPath}\n\n` +
          `The 'version' field is required in promptforge.yaml.\n` +
          `Please ensure your config file includes:\n` +
          `  version: "1.0"`
      );
    }

    // Merge with defaults
    // TypeScript needs explicit version to satisfy PromptforgeConfig interface
    return {
      version: parsed.version,
      ...DEFAULT_CONFIG,
      ...parsed,
      paths: {
        ...DEFAULT_CONFIG.paths,
        ...parsed.paths,
      },
      provider: {
        ...DEFAULT_CONFIG.provider,
        ...parsed.provider,
      },
      evaluation: {
        ...DEFAULT_CONFIG.evaluation,
        ...parsed.evaluation,
      },
    };
  } catch (error) {
    if (error instanceof Error) {
      // Check if it's a YAML parsing error
      if (error.message.includes("YAML") || error.message.includes("yaml")) {
        throw new Error(
          `Failed to parse configuration file: ${configPath}\n\n` +
            `The file contains invalid YAML syntax.\n` +
            `Error: ${error.message}\n\n` +
            `Please check the syntax of your promptforge.yaml file.`
        );
      }
      // Re-throw our custom errors as-is
      if (
        error.message.includes("not found") ||
        error.message.includes("Invalid")
      ) {
        throw error;
      }
      throw new Error(
        `Failed to load configuration file: ${configPath}\n\n` +
          `Error: ${error.message}\n\n` +
          `Please ensure the file exists and is readable.`
      );
    }
    throw error;
  }
}

/**
 * Generate a default config object
 */
export function createDefaultConfig(workspaceName?: string): PromptforgeConfig {
  return {
    version: "1.0",
    workspace: workspaceName ? { name: workspaceName } : undefined,
    ...DEFAULT_CONFIG,
  };
}

/**
 * Write config to promptforge.yaml file
 */
export function writeConfig(
  workspaceRoot: string,
  config: PromptforgeConfig
): void {
  const configPath = path.join(workspaceRoot, CONFIG_FILE_NAME);
  const yamlContent = yaml.dump(config, {
    indent: 2,
    lineWidth: -1, // Don't wrap lines
  });

  fs.writeFileSync(configPath, yamlContent, "utf-8");
}

/**
 * Get the path to a directory specified in config (with fallback to default)
 */
export function getConfigPath(
  config: PromptforgeConfig,
  key: keyof NonNullable<PromptforgeConfig["paths"]>
): string {
  return config.paths?.[key] ?? DEFAULT_CONFIG.paths![key]!;
}
