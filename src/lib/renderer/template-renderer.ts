import { extractVariables } from "../registry/prompt-validation";

/**
 * Options for template rendering
 */
export interface RenderOptions {
  /**
   * How to handle missing variables
   * - "error": Throw an error if variable is missing
   * - "warn": Replace with placeholder and log warning (default)
   * - "ignore": Leave {{var}} as-is if missing
   * - "empty": Replace missing variables with empty string
   */
  missingVariableStrategy?: "error" | "warn" | "ignore" | "empty";
  /**
   * Custom placeholder for missing variables (used with "warn" strategy)
   */
  missingVariablePlaceholder?: string;
}

/**
 * Result of rendering a template
 */
export interface RenderResult {
  rendered: string;
  missingVariables: string[];
  unusedVariables: string[];
}

/**
 * Render a template by interpolating variables
 * Replaces {{variableName}} patterns with actual values
 *
 * @param template - Template string with {{var}} placeholders
 * @param variables - Object with variable names as keys and values
 * @param options - Rendering options
 * @returns Rendered template string
 * @throws Error if missingVariableStrategy is "error" and variables are missing
 *
 * @example
 * ```typescript
 * const template = "Hello {{userName}}, your {{item}} is ready.";
 * const variables = { userName: "Alice", item: "order" };
 * const rendered = renderTemplate(template, variables);
 * // Returns: "Hello Alice, your order is ready."
 * ```
 */
export function renderTemplate(
  template: string,
  variables: Record<string, unknown>,
  options: RenderOptions = {}
): string {
  const {
    missingVariableStrategy = "warn",
    missingVariablePlaceholder = "{{MISSING}}",
  } = options;

  // Extract all variables from template
  const requiredVariables = extractVariables(template);
  const providedVarSet = new Set(Object.keys(variables));

  // Find missing variables
  const missing = Array.from(requiredVariables).filter(
    (v) => !providedVarSet.has(v)
  );

  // Handle missing variables based on strategy
  if (missing.length > 0) {
    if (missingVariableStrategy === "error") {
      throw new Error(
        `Missing required variables: ${missing.join(", ")}\n` +
          `Required: ${Array.from(requiredVariables).join(", ")}\n` +
          `Provided: ${Object.keys(variables).join(", ")}`
      );
    }
  }

  // Replace all {{variableName}} patterns
  let rendered = template;
  const regex = /\{\{(\w+)\}\}/g;

  rendered = rendered.replace(regex, (match, variableName) => {
    if (variables.hasOwnProperty(variableName)) {
      // Variable exists, replace with value
      const value = variables[variableName];
      return String(value ?? "");
    }

    // Variable is missing
    switch (missingVariableStrategy) {
      case "error":
        // Should have been caught above, but handle just in case
        throw new Error(`Missing variable: ${variableName}`);
      case "warn":
        // Replace with placeholder (warning logged separately)
        return missingVariablePlaceholder;
      case "ignore":
        // Leave as-is
        return match;
      case "empty":
        // Replace with empty string
        return "";
      default:
        return missingVariablePlaceholder;
    }
  });

  return rendered;
}

/**
 * Render a template and return detailed result including metadata
 *
 * @param template - Template string with {{var}} placeholders
 * @param variables - Object with variable names as keys and values
 * @param options - Rendering options
 * @returns Render result with rendered string and metadata
 */
export function renderTemplateWithMetadata(
  template: string,
  variables: Record<string, unknown>,
  options: RenderOptions = {}
): RenderResult {
  const requiredVariables = extractVariables(template);
  const providedVarSet = new Set(Object.keys(variables));

  // Find missing and unused variables
  const missingVariables = Array.from(requiredVariables).filter(
    (v) => !providedVarSet.has(v)
  );
  const unusedVariables = Array.from(providedVarSet).filter(
    (v) => !requiredVariables.has(v)
  );

  // Render the template
  let rendered: string;
  try {
    rendered = renderTemplate(template, variables, options);
  } catch (error) {
    // If error strategy throws, we still want to return metadata
    if (error instanceof Error && options.missingVariableStrategy === "error") {
      throw error;
    }
    rendered = renderTemplate(template, variables, {
      ...options,
      missingVariableStrategy: "warn",
    });
  }

  return {
    rendered,
    missingVariables,
    unusedVariables,
  };
}
