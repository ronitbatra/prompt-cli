# Prompt Directory Structure

## Overview

Prompts are stored in the `prompts/` directory within a Promptforge workspace. Each prompt can have multiple versions, allowing you to track changes over time and reference specific versions when needed.

## Directory Structure

```
prompts/
  {prompt-name}/
    v{version-number}/
      {prompt-name}.prompt.md    # Markdown template
      {prompt-name}.meta.json     # Metadata
```

### Example Structure

```
prompts/
  greeting/
    v1/
      greeting.prompt.md
      greeting.meta.json
    v2/
      greeting.prompt.md
      greeting.meta.json
  email-summary/
    v1/
      email-summary.prompt.md
      email-summary.meta.json
```

## File Formats

### Template File (`.prompt.md`)

The template file contains the actual prompt text in Markdown format. It supports variable interpolation using double curly braces.

**Format:** `{prompt-name}.prompt.md`

**Example:**
```markdown
You are a helpful assistant.

User: {{userMessage}}

Please respond in a {{tone}} tone.
```

**Variable Syntax:**
- Variables are referenced using `{{variableName}}`
- Variable names are case-sensitive
- Variables can appear multiple times in the template

### Metadata File (`.meta.json`)

The metadata file contains structured information about the prompt version.

**Format:** `{prompt-name}.meta.json`

**Schema:**
```typescript
{
  name: string;              // Required: Prompt name (must match directory)
  version: string;           // Required: Version identifier (e.g., "v1", "v2")
  description?: string;       // Optional: Human-readable description
  variables?: string[];      // Optional: List of required template variables
  tags?: string[];           // Optional: Tags for categorization
  createdAt?: string;        // Optional: ISO 8601 timestamp
  updatedAt?: string;        // Optional: ISO 8601 timestamp
}
```

**Example:**
```json
{
  "name": "greeting",
  "version": "v1",
  "description": "A friendly greeting prompt",
  "variables": ["userName", "tone"],
  "tags": ["greeting", "social"],
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

## Versioning

### Version Format

- Versions use the format `v1`, `v2`, `v3`, etc.
- Each version is stored in its own directory under the prompt name
- Versions should be sequential integers starting from `v1`

### Version Resolution

Prompts can be referenced in two ways:

1. **With explicit version:** `{name}@v{version}`
   - Example: `greeting@v1`
   - Resolves to the specific version

2. **Without version (latest):** `{name}`
   - Example: `greeting`
   - Resolves to the highest numbered version (e.g., `v2` if `v1` and `v2` exist)

### Version Directory Naming

- Version directories must follow the pattern `v{number}`
- Numbers should be sequential (v1, v2, v3, ...)
- Leading zeros are not required (use `v1`, not `v01`)

## Naming Conventions

### Prompt Names

- Use lowercase letters, numbers, and hyphens
- Examples: `greeting`, `email-summary`, `code-review-v2`
- Avoid spaces and special characters
- Names should be descriptive and concise

### File Names

- Template files: `{prompt-name}.prompt.md`
- Metadata files: `{prompt-name}.meta.json`
- The prompt name in the filename must match:
  - The directory name
  - The `name` field in `meta.json`

## Complete Example

Here's a complete example of a prompt with two versions:

### Directory Structure
```
prompts/
  customer-support/
    v1/
      customer-support.prompt.md
      customer-support.meta.json
    v2/
      customer-support.prompt.md
      customer-support.meta.json
```

### `customer-support.prompt.md` (v1)
```markdown
You are a customer support agent.

Customer question: {{question}}
Customer name: {{customerName}}

Please provide a helpful and professional response.
```

### `customer-support.meta.json` (v1)
```json
{
  "name": "customer-support",
  "version": "v1",
  "description": "Initial version of customer support prompt",
  "variables": ["question", "customerName"],
  "tags": ["support", "customer-service"],
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### `customer-support.prompt.md` (v2)
```markdown
You are a customer support agent specializing in {{product}}.

Customer question: {{question}}
Customer name: {{customerName}}
Priority: {{priority}}

Please provide a helpful and professional response.
```

### `customer-support.meta.json` (v2)
```json
{
  "name": "customer-support",
  "version": "v2",
  "description": "Updated version with product and priority fields",
  "variables": ["question", "customerName", "product", "priority"],
  "tags": ["support", "customer-service"],
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-20T14:15:00Z"
}
```

## Validation Rules

1. **Required Files:** Each version directory must contain both `.prompt.md` and `.meta.json` files
2. **Name Consistency:** The prompt name must match across:
   - Directory name
   - Filename prefix
   - `name` field in `meta.json`
3. **Version Format:** Version directories must match the `version` field in `meta.json`
4. **Variable Declaration:** All variables used in the template should be declared in `metadata.variables` (recommended but not enforced)

## Best Practices

1. **Descriptive Names:** Use clear, descriptive names for prompts
2. **Version Comments:** Use the `description` field to document what changed between versions
3. **Variable Documentation:** List all template variables in the `variables` array
4. **Timestamps:** Include `createdAt` and `updatedAt` timestamps for tracking
5. **Tags:** Use tags to categorize prompts for easier discovery
6. **Incremental Changes:** Create new versions for significant changes, not minor edits

## Integration with Promptforge

This directory structure is used by Promptforge's:
- **Prompt Registry:** Discovers and loads prompts from disk
- **Version Resolution:** Resolves `name@version` references
- **Diff Engine:** Compares different versions
- **Evaluation System:** Loads prompts for testing

For more information, see the [Promptforge documentation](../README.md).

