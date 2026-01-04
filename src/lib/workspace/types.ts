/**
 * Configuration schema for promptforge.yaml
 *
 * This file defines the structure of the workspace configuration file.
 * The config file is located at the root of a Promptforge workspace.
 */

/**
 * Directory paths configuration
 */
export interface WorkspacePaths {
  /** Directory where prompts are stored (default: "prompts") */
  prompts?: string;
  /** Directory where eval fixtures are stored (default: "evals") */
  evals?: string;
  /** Directory where run artifacts are stored (default: "runs") */
  runs?: string;
}

/**
 * Workspace metadata
 */
export interface WorkspaceMetadata {
  /** Optional workspace name */
  name?: string;
}

/**
 * Provider configuration (for Phase 6)
 */
export interface ProviderConfig {
  /** Provider type: "mock" for testing, "openai", "anthropic" for real providers */
  type?: "mock" | "openai" | "anthropic";
}

/**
 * Evaluation configuration (for Phase 5)
 */
export interface EvaluationConfig {
  /** Default provider to use for evaluations */
  defaultProvider?: string;
}

/**
 * Main Promptforge workspace configuration schema
 *
 * This matches the structure of promptforge.yaml
 */
export interface PromptforgeConfig {
  /** Config schema version (for future migrations) */
  version: string;

  /** Workspace metadata */
  workspace?: WorkspaceMetadata;

  /** Directory paths (defaults: prompts, evals, runs) */
  paths?: WorkspacePaths;

  /** Provider configuration (optional, defaults to mock) */
  provider?: ProviderConfig;

  /** Evaluation settings (optional) */
  evaluation?: EvaluationConfig;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Omit<PromptforgeConfig, "version"> = {
  paths: {
    prompts: "prompts",
    evals: "evals",
    runs: "runs",
  },
  provider: {
    type: "mock",
  },
  evaluation: {
    defaultProvider: "mock",
  },
};
