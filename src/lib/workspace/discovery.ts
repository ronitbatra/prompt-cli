import fs from "fs";
import path from "path";
import { CONFIG_FILE_NAME } from "./config";

/**
 * Check if a directory contains a Promptforge workspace
 * by looking for promptforge.yaml
 */
function isWorkspaceRoot(dir: string): boolean {
  const configPath = path.join(dir, CONFIG_FILE_NAME);
  return fs.existsSync(configPath);
}

/**
 * Discover the workspace root by walking up directories
 * looking for promptforge.yaml
 *
 * @param startDir - Starting directory (defaults to current working directory)
 * @returns The absolute path to the workspace root
 * @throws Error if no workspace is found
 *
 * @example
 *
 * // User runs command from /project/src/components/ui/
 * const workspaceRoot = discoverWorkspace();
 * // Returns: /project/
 *  */
export function discoverWorkspace(startDir?: string): string {
  // Start from the provided directory or current working directory
  let currentDir = path.resolve(startDir ?? process.cwd());

  // Keep track of the root directory to prevent infinite loops
  const rootDir = path.parse(currentDir).root;

  // Walk up the directory tree
  // eslint-disable-next-line no-constant-condition
  while (true) {
    // Check if current directory is a workspace root
    if (isWorkspaceRoot(currentDir)) {
      return currentDir;
    }

    // Get parent directory
    const parentDir = path.dirname(currentDir);

    // If we've reached the filesystem root, stop searching
    if (parentDir === currentDir || parentDir === rootDir) {
      const searchedFrom = startDir ?? process.cwd();
      throw new Error(
        `No Promptforge workspace found.\n\n` +
          `Searched from: ${searchedFrom}\n` +
          `A workspace requires a 'promptforge.yaml' file in the root directory.\n\n` +
          `To create a workspace, run:\n` +
          `  prompt-cli init\n\n` +
          `Or navigate to an existing workspace directory.`
      );
    }

    // Move up one level
    currentDir = parentDir;
  }
}

/**
 * Check if the current directory (or a parent) is a Promptforge workspace
 * without throwing an error
 *
 * @param startDir - Starting directory (defaults to current working directory)
 * @returns The workspace root path if found, null otherwise
 */
export function findWorkspace(startDir?: string): string | null {
  try {
    return discoverWorkspace(startDir);
  } catch {
    return null;
  }
}
