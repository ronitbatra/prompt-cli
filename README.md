# Promptforge CLI

A powerful CLI tool for managing, versioning, and evaluating LLM prompts. Promptforge helps you organize prompts, track changes across versions, and run systematic evaluations against test fixtures.

## Features

- 📝 **Prompt Management**: Organize prompts in a structured workspace with versioning
- 🔄 **Version Control**: Track changes between prompt versions with visual diffs
- ✅ **Evaluation Engine**: Test prompts against fixtures with multiple LLM providers
- 📊 **Reporting**: Generate detailed reports with pass rates, failures, and metrics
- 🔌 **Provider Support**: Works with OpenAI, Anthropic, and mock providers
- 🚀 **CI/CD Ready**: Exit codes and structured output for continuous integration

## Installation

### Global Installation

```bash
npm install -g prompt-cli
```

### Local Installation

```bash
npm install prompt-cli
npx prompt-cli --help
```

## Quick Start

1. **Initialize a workspace:**

```bash
prompt-cli init
```

This creates a `promptforge.yaml` config file and sets up the directory structure:
- `prompts/` - Store your prompt templates
- `evals/` - Store evaluation fixtures
- `runs/` - Store evaluation results

2. **Create a prompt:**

Create a prompt directory structure:
```
prompts/
  greeting/
    v1/
      greeting.prompt.md
      greeting.meta.json
```

**`greeting.prompt.md`:**
```markdown
You are a helpful assistant.

User: {{userName}}

Please greet them in a friendly way.
```

**`greeting.meta.json`:**
```json
{
  "name": "greeting",
  "version": "v1",
  "description": "A friendly greeting prompt",
  "variables": ["userName"],
  "tags": ["greeting", "example"]
}
```

3. **Create an evaluation fixture:**

Create `evals/greeting.jsonl`:
```jsonl
{"prompt":"greeting@v1","variables":{"userName":"Alice"},"expectations":[{"type":"contains","value":"Alice"}]}
```

4. **Run evaluations:**

```bash
prompt-cli eval
```

## Commands

### `init` - Initialize Workspace

Initialize a new Promptforge workspace in the current directory.

```bash
prompt-cli init
prompt-cli init --force              # Overwrite existing workspace
prompt-cli init --name my-project    # Set custom workspace name
```

**What it creates:**
- `promptforge.yaml` - Configuration file
- `prompts/` - Directory for prompt templates
- `evals/` - Directory for evaluation fixtures
- `runs/` - Directory for evaluation results

### `diff` - Compare Prompt Versions

Compare two versions of a prompt to see what changed.

```bash
# Compare two specific versions
prompt-cli diff greeting@v1 greeting@v2

# Compare v1 to latest version
prompt-cli diff greeting@v1 greeting

# Compare latest to v2
prompt-cli diff greeting greeting@v2

# Show only template changes
prompt-cli diff greeting@v1 greeting@v2 --template

# Show only metadata changes
prompt-cli diff greeting@v1 greeting@v2 --metadata
```

**Output includes:**
- Template changes (additions, deletions, modifications)
- Metadata changes (variables, tags, descriptions)
- Color-coded diff visualization
- Summary statistics

### `eval` - Run Evaluations

Run evaluations on prompt fixtures and generate reports.

```bash
# Evaluate all JSONL files in evals/
prompt-cli eval

# Evaluate a specific file
prompt-cli eval greeting.jsonl

# Show latest evaluation results
prompt-cli eval --latest

# Show detailed report
prompt-cli eval --latest --detailed

# Show compact summary
prompt-cli eval --latest --compact

# Aggregate results from all runs
prompt-cli eval --aggregate

# Aggregate results for a specific prompt
prompt-cli eval --aggregate-prompt greeting

# Aggregate last 5 runs
prompt-cli eval --aggregate-recent 5

# Use a specific provider
prompt-cli eval --provider mock
prompt-cli eval --provider openai

# Don't save results
prompt-cli eval --no-save
```

**Evaluation Output:**
- Pass/fail status for each fixture
- Failed expectations with details
- Pass rate and statistics
- Token usage and latency metrics
- Exit code 0 for success, 1 for failures (CI-friendly)

## Configuration

### `promptforge.yaml`

The workspace configuration file:

```yaml
version: '1.0'
paths:
  prompts: prompts      # Directory for prompts
  evals: evals          # Directory for evaluation fixtures
  runs: runs            # Directory for evaluation results
provider:
  type: mock            # Default provider: mock, openai, anthropic
  # Provider-specific config (e.g., model, temperature)
evaluation:
  defaultProvider: mock
```

### Provider Configuration

#### Mock Provider (Default)

```yaml
provider:
  type: mock
```

#### OpenAI Provider

```yaml
provider:
  type: openai
  model: gpt-4
  temperature: 0.7
```

Set your API key:
```bash
export OPENAI_API_KEY=your_api_key_here
```

#### Anthropic Provider

```yaml
provider:
  type: anthropic
  model: claude-3-opus-20240229
```

Set your API key:
```bash
export ANTHROPIC_API_KEY=your_api_key_here
```

## Prompt Structure

Prompts are organized in a versioned directory structure:

```
prompts/
  {prompt-name}/
    v{version-number}/
      {prompt-name}.prompt.md    # Markdown template
      {prompt-name}.meta.json     # Metadata
```

### Template File (`.prompt.md`)

Markdown file with variable interpolation using `{{variableName}}`:

```markdown
You are a helpful assistant.

User: {{userName}}
Context: {{context}}

Please respond in a {{tone}} tone.
```

### Metadata File (`.meta.json`)

JSON file with prompt metadata:

```json
{
  "name": "greeting",
  "version": "v1",
  "description": "A friendly greeting prompt",
  "variables": ["userName", "tone"],
  "tags": ["greeting", "social"],
  "createdAt": "2024-01-15T10:30:00Z"
}
```

For detailed information, see [Prompt Structure Documentation](./docs/prompt-structure.md).

## Evaluation Fixtures

Evaluation fixtures are stored as JSONL (JSON Lines) files in the `evals/` directory.

### Fixture Format

Each line in the JSONL file is a JSON object:

```json
{
  "prompt": "greeting@v1",
  "variables": {
    "userName": "Alice"
  },
  "expectations": [
    {"type": "contains", "value": "Alice"},
    {"type": "contains", "value": "Hello"},
    {"type": "maxWords", "value": 20},
    {"type": "regex", "value": "^Hello", "flags": "i"}
  ],
  "metadata": {
    "description": "Test greeting for Alice"
  }
}
```

### Expectation Types

- **`contains`**: Output must contain the specified string
- **`regex`**: Output must match the regex pattern
- **`maxWords`**: Output must have ≤ N words

### Example Fixture File

**`evals/greeting.jsonl`:**
```jsonl
{"prompt":"greeting@v1","variables":{"userName":"Alice"},"expectations":[{"type":"contains","value":"Alice"}]}
{"prompt":"greeting@v1","variables":{"userName":"Bob"},"expectations":[{"type":"contains","value":"Bob"},{"type":"maxWords","value":15}]}
{"prompt":"greeting@v2","variables":{"userName":"Charlie"},"expectations":[{"type":"regex","value":"^Hello", "flags":"i"}]}
```

## CI/CD Integration

Promptforge is designed for CI/CD pipelines with proper exit codes. The project includes a GitHub Actions workflow (`.github/workflows/ci.yml`) that runs:

- Linting and code formatting checks
- TypeScript compilation
- Unit tests across multiple Node.js versions
- Integration tests for CLI commands
- Build verification

### Using in Your CI/CD Pipeline

**GitHub Actions example:**
```yaml
name: Evaluate Prompts

on: [push, pull_request]

jobs:
  evaluate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm install -g prompt-cli
      - run: prompt-cli eval
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

**Exit Codes:**
- `0` - All evaluations passed
- `1` - One or more evaluations failed

The CLI returns appropriate exit codes for CI/CD integration, making it easy to fail builds when evaluations don't pass.

## Examples

### Example 1: Basic Prompt with Evaluation

1. Create a prompt:
```bash
mkdir -p prompts/customer-support/v1
```

**`prompts/customer-support/v1/customer-support.prompt.md`:**
```markdown
You are a customer support agent.

Customer: {{customerName}}
Question: {{question}}

Please provide a helpful response.
```

**`prompts/customer-support/v1/customer-support.meta.json`:**
```json
{
  "name": "customer-support",
  "version": "v1",
  "description": "Customer support prompt",
  "variables": ["customerName", "question"],
  "tags": ["support"]
}
```

2. Create evaluation fixture:
**`evals/customer-support.jsonl`:**
```jsonl
{"prompt":"customer-support@v1","variables":{"customerName":"Alice","question":"How do I reset my password?"},"expectations":[{"type":"contains","value":"password"},{"type":"maxWords","value":100}]}
```

3. Run evaluation:
```bash
prompt-cli eval customer-support.jsonl
```

### Example 2: Comparing Versions

After creating `v2` of your prompt:

```bash
prompt-cli diff customer-support@v1 customer-support@v2
```

This shows:
- Template changes (what text was added/removed/modified)
- Metadata changes (new variables, updated tags, etc.)
- Summary of changes

### Example 3: Aggregated Reporting

View aggregated statistics across multiple evaluation runs:

```bash
# Aggregate all runs
prompt-cli eval --aggregate

# Aggregate last 10 runs
prompt-cli eval --aggregate-recent 10

# Aggregate for specific prompt
prompt-cli eval --aggregate-prompt customer-support
```

## Project Structure

```
your-project/
├── promptforge.yaml          # Workspace configuration
├── prompts/                  # Prompt templates
│   └── greeting/
│       ├── v1/
│       │   ├── greeting.prompt.md
│       │   └── greeting.meta.json
│       └── v2/
│           ├── greeting.prompt.md
│           └── greeting.meta.json
├── evals/                    # Evaluation fixtures
│   └── greeting.jsonl
└── runs/                     # Evaluation results
    └── eval-2024-01-15T10-30-00.json
```

## Requirements

- Node.js >= 20
- npm or yarn

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Links

- [GitHub Repository](https://github.com/ronitbatra/prompt-cli)
- [Issue Tracker](https://github.com/ronitbatra/prompt-cli/issues)
