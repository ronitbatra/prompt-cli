import type { PromptMetadata, PromptVersion } from "../types/prompt";

/**
 * Extract all variable names from a template string
 * Finds all {{variableName}} patterns
 *
 * @param template - Template string to parse
 * @returns Set of unique variable names found in the template
 *
 * @example
 * ```typescript
 * const template = "Hello {{userName}}, your {{item}} is ready.";
 * const vars = extractVariables(template);
 * // Returns: Set(["userName", "item"])
 * ```
 */
export function extractVariables(template: string): Set<string> {
  const variables = new Set<string>();
  const regex = /\{\{(\w+)\}\}/g;
  let match;

  while ((match = regex.exec(template)) !== null) {
    const variableName = match[1];
    variables.add(variableName);
  }

  return variables;
}

/**
 * Validation result for a prompt version
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a prompt version's metadata and template consistency
 *
 * @param promptVersion - The prompt version to validate
 * @returns Validation result with errors and warnings
 */
export function validatePromptVersion(
  promptVersion: PromptVersion
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Extract variables from template
  const templateVariables = extractVariables(promptVersion.template);
  const templateVarArray = Array.from(templateVariables).sort();

  // Check if metadata declares variables
  const declaredVariables = promptVersion.metadata.variables || [];
  const declaredVarSet = new Set(declaredVariables);
  const declaredVarArray = declaredVariables.sort();

  // Validate: variables declared in metadata should match template variables
  if (declaredVariables.length > 0) {
    // Check for variables in template but not declared in metadata
    const undeclared = templateVarArray.filter(
      (v) => !declaredVarSet.has(v)
    );
    if (undeclared.length > 0) {
      warnings.push(
        `Template uses variables not declared in metadata: ${undeclared.join(", ")}`
      );
    }

    // Check for variables declared in metadata but not used in template
    const unused = declaredVarArray.filter(
      (v) => !templateVariables.has(v)
    );
    if (unused.length > 0) {
      warnings.push(
        `Metadata declares variables not used in template: ${unused.join(", ")}`
      );
    }
  } else {
    // No variables declared in metadata, but template has variables
    if (templateVariables.size > 0) {
      warnings.push(
        `Template uses variables but metadata.variables is not declared: ${templateVarArray.join(", ")}`
      );
    }
  }

  // Validate metadata structure
  if (!promptVersion.metadata.name) {
    errors.push("Metadata missing required field: name");
  }

  if (!promptVersion.metadata.version) {
    errors.push("Metadata missing required field: version");
  }

  // Validate name and version match
  if (
    promptVersion.metadata.name &&
    promptVersion.metadata.name !== promptVersion.name
  ) {
    errors.push(
      `Metadata name "${promptVersion.metadata.name}" does not match prompt name "${promptVersion.name}"`
    );
  }

  if (
    promptVersion.metadata.version &&
    promptVersion.metadata.version !== promptVersion.version
  ) {
    errors.push(
      `Metadata version "${promptVersion.metadata.version}" does not match prompt version "${promptVersion.version}"`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate that all required variables are provided
 *
 * @param template - Template string
 * @param providedVariables - Object with variable names as keys
 * @returns Validation result
 */
export function validateVariablesProvided(
  template: string,
  providedVariables: Record<string, unknown>
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const requiredVariables = extractVariables(template);
  const providedVarSet = new Set(Object.keys(providedVariables));

  // Check for missing required variables
  const missing = Array.from(requiredVariables).filter(
    (v) => !providedVarSet.has(v)
  );
  if (missing.length > 0) {
    errors.push(`Missing required variables: ${missing.join(", ")}`);
  }

  // Check for extra variables (not used in template)
  const extra = Array.from(providedVarSet).filter(
    (v) => !requiredVariables.has(v)
  );
  if (extra.length > 0) {
    warnings.push(`Unused variables provided: ${extra.join(", ")}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get a list of all variables used in a template
 *
 * @param template - Template string
 * @returns Sorted array of variable names
 */
export function getTemplateVariables(template: string): string[] {
  return Array.from(extractVariables(template)).sort();
}


