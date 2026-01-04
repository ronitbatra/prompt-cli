import path from "path";

/**
 * Defines the prompt directory structure convention
 */
export class PromptDirectoryStructure {
  /**
   * Get the prompts directory path relative to workspace root
   */
  static getPromptsDir(workspaceRoot: string): string {
    return path.join(workspaceRoot, "prompts");
  }

  /**
   * Get the directory path for a specific prompt name
   */
  static getPromptDir(workspaceRoot: string, promptName: string): string {
    return path.join(this.getPromptsDir(workspaceRoot), promptName);
  }

  /**
   * Get the directory path for a specific prompt version
   */
  static getVersionDir(
    workspaceRoot: string,
    promptName: string,
    version: string
  ): string {
    return path.join(this.getPromptDir(workspaceRoot, promptName), version);
  }

  /**
   * Get the template file path (.prompt.md)
   */
  static getTemplatePath(
    workspaceRoot: string,
    promptName: string,
    version: string
  ): string {
    return path.join(
      this.getVersionDir(workspaceRoot, promptName, version),
      `${promptName}.prompt.md`
    );
  }

  /**
   * Get the metadata file path (.meta.json)
   */
  static getMetadataPath(
    workspaceRoot: string,
    promptName: string,
    version: string
  ): string {
    return path.join(
      this.getVersionDir(workspaceRoot, promptName, version),
      `${promptName}.meta.json`
    );
  }

  /**
   * Parse a prompt reference (e.g., "greeting@v1" or "greeting")
   */
  static parsePromptRef(ref: string): { name: string; version?: string } {
    const parts = ref.split("@");
    if (parts.length === 1) {
      return { name: parts[0] };
    }
    if (parts.length === 2) {
      return { name: parts[0], version: parts[1] };
    }
    throw new Error(`Invalid prompt reference: ${ref}`);
  }

  /**
   * Format a prompt reference (e.g., "greeting@v1")
   */
  static formatPromptRef(name: string, version: string): string {
    return `${name}@${version}`;
  }
}
