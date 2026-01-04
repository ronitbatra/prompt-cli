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
      `Config file not found: ${configPath}\n` +
        "Run 'promptforge init' to create a workspace."
    );
  }

  try {
    const fileContents = fs.readFileSync(configPath, "utf-8");
    const parsed = yaml.load(fileContents) as Partial<PromptforgeConfig>;

    // Validate required fields
    if (!parsed.version) {
      throw new Error("Config file must have a 'version' field");
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
      throw new Error(`Failed to load config: ${error.message}`);
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
