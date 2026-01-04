/**
 * Prompt directory structure:
 *
 * prompts/
 *   {name}/
 *     v1/
 *       {name}.prompt.md    # Template file
 *       {name}.meta.json     # Metadata file
 *     v2/
 *       {name}.prompt.md
 *       {name}.meta.json
 *
 * Example:
 * prompts/
 *   greeting/
 *     v1/
 *       greeting.prompt.md
 *       greeting.meta.json
 *     v2/
 *       greeting.prompt.md
 *       greeting.meta.json
 */

export interface PromptMetadata {
  name: string;
  version: string;
  description?: string;
  variables?: string[]; // Required template variables
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PromptVersion {
  name: string;
  version: string;
  template: string; // Content from .prompt.md
  metadata: PromptMetadata;
}

export interface Prompt {
  name: string;
  versions: PromptVersion[];
  latestVersion: string;
}
