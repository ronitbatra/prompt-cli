/**
 * Terminal formatting utilities for diff output
 */

/**
 * ANSI color codes for terminal output
 */
export const Colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",

  // Text colors
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",

  // Background colors
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
} as const;

/**
 * Format text with color
 */
export function colorize(text: string, color: string): string {
  return `${color}${text}${Colors.reset}`;
}

/**
 * Create a section header with styling
 */
export function createHeader(title: string, width = 50): string {
  const line = "━".repeat(width);
  const padding = Math.max(0, Math.floor((width - title.length - 2) / 2));
  const header = ` ${title} `
    .padStart(title.length + padding + 1, "━")
    .padEnd(width, "━");
  return `${Colors.cyan}${line}${Colors.reset}\n${Colors.bright}${Colors.cyan}${header}${Colors.reset}\n${Colors.cyan}${line}${Colors.reset}`;
}

/**
 * Format a diff line with appropriate colors and styling
 */
export function formatDiffLine(
  line: string,
  type: "added" | "removed" | "unchanged" | "modified"
): string {
  if (line.startsWith("+")) {
    return `${Colors.green}${line}${Colors.reset}`;
  } else if (line.startsWith("-")) {
    return `${Colors.red}${line}${Colors.reset}`;
  } else if (line.startsWith("~")) {
    return `${Colors.yellow}${line}${Colors.reset}`;
  } else {
    // Unchanged lines - dim them slightly
    return `${Colors.dim}${line}${Colors.reset}`;
  }
}

/**
 * Format a summary line
 */
export function formatSummary(text: string): string {
  return `${Colors.bright}${Colors.blue}Summary:${Colors.reset} ${Colors.white}${text}${Colors.reset}`;
}

/**
 * Format a comparison header
 */
export function formatComparisonHeader(
  promptName: string,
  oldVersion: string,
  newVersion: string
): string {
  const arrow = colorize("→", Colors.gray);
  const name = colorize(promptName, Colors.bright);
  const oldVer = colorize(`@${oldVersion}`, Colors.yellow);
  const newVer = colorize(`@${newVersion}`, Colors.green);

  return `\n${Colors.bright}Comparing${Colors.reset} ${name}${oldVer} ${arrow} ${name}${newVer}\n`;
}

/**
 * Format a "no changes" message
 */
export function formatNoChanges(section: string): string {
  return `${Colors.dim}No changes in ${section}.${Colors.reset}\n`;
}

/**
 * Format line numbers in diff output
 */
export function formatLineNumber(
  lineNum: number | undefined,
  prefix: string
): string {
  if (lineNum === undefined) {
    return prefix;
  }
  return `${prefix} ${Colors.gray}${String(lineNum).padStart(3)}${Colors.reset}`;
}

/**
 * Create a visual separator
 */
export function createSeparator(char = "─", width = 50): string {
  return `${Colors.dim}${char.repeat(width)}${Colors.reset}`;
}

/**
 * Format metadata change with better readability
 */
export function formatMetadataChange(
  path: string,
  type: "added" | "removed" | "modified",
  oldValue?: unknown,
  newValue?: unknown
): string {
  const pathParts = path.split(".");
  const displayPath =
    pathParts.length > 1
      ? `${pathParts[0]}${Colors.gray}.${pathParts.slice(1).join(".")}${Colors.reset}`
      : path;

  switch (type) {
    case "added":
      return `${Colors.green}+${Colors.reset} ${displayPath}: ${Colors.green}${formatValue(newValue)}${Colors.reset}`;
    case "removed":
      return `${Colors.red}-${Colors.reset} ${displayPath}: ${Colors.red}${formatValue(oldValue)}${Colors.reset}`;
    case "modified":
      return `${Colors.yellow}~${Colors.reset} ${displayPath}: ${Colors.red}${formatValue(oldValue)}${Colors.reset} ${Colors.gray}→${Colors.reset} ${Colors.green}${formatValue(newValue)}${Colors.reset}`;
  }
}

/**
 * Format a value for display
 */
function formatValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return `"${value}"`;
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (typeof value === "object") return `{${Object.keys(value).length} keys}`;
  return String(value);
}
