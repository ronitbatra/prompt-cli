# Promptforge CLI - Complete Usage Guide

## What is Promptforge?

Promptforge is a **CLI tool for managing, versioning, and evaluating LLM prompts**. It solves the common problems developers face when working with prompts:

- **Prompt Chaos**: Prompts scattered across code, config files, and documentation
- **No Version Control**: Can't track what changed between prompt versions
- **No Testing**: No way to systematically test if prompts work correctly
- **Inconsistent Results**: Same prompt produces different outputs without tracking

## What Can You Use It For?

### 1. **Prompt Version Management**
Track changes to your prompts over time, just like code version control.

**Use Cases:**
- A/B testing different prompt variations
- Tracking prompt improvements
- Rolling back to previous versions if new ones perform worse
- Documenting what changed and why

### 2. **Systematic Prompt Testing**
Test your prompts against predefined test cases to ensure they work correctly.

**Use Cases:**
- Regression testing: Ensure prompt changes don't break existing functionality
- Quality assurance: Verify prompts meet requirements before deployment
- Performance monitoring: Track prompt performance over time
- CI/CD integration: Automatically test prompts in your pipeline

### 3. **Prompt Comparison & Diff**
See exactly what changed between prompt versions.

**Use Cases:**
- Code reviews: Review prompt changes before merging
- Change analysis: Understand impact of prompt modifications
- Documentation: See what changed in each version

### 4. **Multi-Provider Support**
Test prompts against different LLM providers (OpenAI, Anthropic, Mock).

**Use Cases:**
- Provider comparison: Test same prompt across different providers
- Cost optimization: Compare token usage across providers
- Fallback testing: Ensure prompts work with backup providers

## Your Current Setup

You already have a Promptforge workspace configured! Here's what you have:

```
prompt-cli/
├── promptforge.yaml          # Workspace configuration
├── prompts/                  # Your prompt templates
│   └── greeting/
│       ├── v1/              # Version 1
│       └── v2/              # Version 2
├── evals/                    # Evaluation fixtures
│   └── greeting.jsonl
└── runs/                     # Evaluation results
```

## How to Use It Right Now

### 1. **View Your Existing Prompts**

```bash
# List all prompts in your workspace
prompt-cli list

# You should see your "greeting" prompt with versions v1 and v2
```

### 2. **Compare Your Prompt Versions**

You already have two versions of the greeting prompt. Compare them:

```bash
# Compare v1 to v2
prompt-cli diff greeting@v1 greeting@v2

# Compare v1 to latest (v2)
prompt-cli diff greeting@v1 greeting

# Show only template changes
prompt-cli diff greeting@v1 greeting@v2 --template

# Show only metadata changes
prompt-cli diff greeting@v1 greeting@v2 --metadata
```

**What you'll see:**
- Exact text differences (additions, deletions, modifications)
- Metadata changes (variables, tags, descriptions)
- Color-coded diff visualization
- Summary statistics

### 3. **Run Evaluations**

Test your prompts against the evaluation fixtures:

```bash
# Run all evaluations (uses mock provider by default)
prompt-cli eval

# Run evaluation for specific file
prompt-cli eval greeting.jsonl

# View latest evaluation results
prompt-cli eval --latest

# View detailed report
prompt-cli eval --latest --detailed

# View compact summary
prompt-cli eval --latest --compact
```

**What happens:**
1. Loads your prompt template
2. Renders it with variables from the fixture
3. Sends to LLM provider (mock by default)
4. Checks if output meets expectations
5. Saves results to `runs/` directory
6. Displays pass/fail report

### 4. **Create New Prompts**

Let's create a new prompt for customer support:

```bash
# Create directory structure
mkdir -p prompts/customer-support/v1
```

**Create `prompts/customer-support/v1/customer-support.prompt.md`:**
```markdown
You are a helpful customer support agent.

Customer Name: {{customerName}}
Customer Question: {{question}}
Product: {{product}}

Please provide a professional and helpful response.
```

**Create `prompts/customer-support/v1/customer-support.meta.json`:**
```json
{
  "name": "customer-support",
  "version": "v1",
  "description": "Customer support prompt for handling inquiries",
  "variables": ["customerName", "question", "product"],
  "tags": ["support", "customer-service"]
}
```

**Create evaluation fixture `evals/customer-support.jsonl`:**
```jsonl
{"prompt":"customer-support@v1","variables":{"customerName":"Alice","question":"How do I reset my password?","product":"MyApp"},"expectations":[{"type":"contains","value":"password"},{"type":"maxWords","value":100}]}
```

**Test it:**
```bash
prompt-cli eval customer-support.jsonl
```

### 5. **Create New Versions**

When you want to improve a prompt, create a new version:

```bash
# Copy v1 to v2
cp -r prompts/customer-support/v1 prompts/customer-support/v2
```

Edit `v2/customer-support.prompt.md` and `v2/customer-support.meta.json`, then:

```bash
# Compare versions
prompt-cli diff customer-support@v1 customer-support@v2

# Test both versions
prompt-cli eval  # Tests all fixtures
```

### 6. **Use Real LLM Providers**

To test with OpenAI (requires API key):

**Update `promptforge.yaml`:**
```yaml
version: '1.0'
paths:
  prompts: prompts
  evals: evals
  runs: runs
provider:
  type: openai
  model: gpt-4
  temperature: 0.7
```

**Set API key:**
```bash
export OPENAI_API_KEY=your_api_key_here
```

**Run evaluation:**
```bash
prompt-cli eval
```

**Or override provider for one run:**
```bash
prompt-cli eval --provider openai
```

### 7. **View Aggregated Results**

See statistics across multiple evaluation runs:

```bash
# Aggregate all runs
prompt-cli eval --aggregate

# Aggregate last 5 runs
prompt-cli eval --aggregate-recent 5

# Aggregate for specific prompt
prompt-cli eval --aggregate-prompt greeting

# Detailed aggregated report
prompt-cli eval --aggregate --detailed
```

**What you get:**
- Overall pass rate across all runs
- Total fixtures tested
- Token usage statistics
- Average latency
- Date range of runs
- Failures grouped by prompt

## Real-World Workflows

### Workflow 1: Iterative Prompt Improvement

```bash
# 1. Create initial prompt (v1)
# ... create prompts/customer-support/v1/ ...

# 2. Test it
prompt-cli eval customer-support.jsonl

# 3. Make improvements, create v2
# ... create prompts/customer-support/v2/ ...

# 4. Compare changes
prompt-cli diff customer-support@v1 customer-support@v2

# 5. Test new version
prompt-cli eval customer-support.jsonl

# 6. Compare results
prompt-cli eval --aggregate-prompt customer-support
```

### Workflow 2: CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
name: Test Prompts

on: [push, pull_request]

jobs:
  test-prompts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install -g prompt-cli
      - run: prompt-cli eval
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
      # Exit code 1 if any tests fail, 0 if all pass
```

### Workflow 3: Prompt Review Process

```bash
# 1. Developer creates new prompt version
# ... creates prompts/feature/v2/ ...

# 2. Compare with previous version
prompt-cli diff feature@v1 feature@v2 > review-diff.txt

# 3. Test new version
prompt-cli eval feature.jsonl

# 4. Review results
prompt-cli eval --latest --detailed

# 5. If approved, merge. If not, iterate.
```

## Advanced Features

### Custom Evaluation Expectations

Your evaluation fixtures can include multiple expectation types:

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
  ]
}
```

**Expectation Types:**
- `contains`: Output must contain the string
- `regex`: Output must match the regex pattern
- `maxWords`: Output must have ≤ N words

### Multiple Test Cases

Add multiple test cases to one JSONL file:

**`evals/greeting.jsonl`:**
```jsonl
{"prompt":"greeting@v1","variables":{"userName":"Alice"},"expectations":[{"type":"contains","value":"Alice"}]}
{"prompt":"greeting@v1","variables":{"userName":"Bob"},"expectations":[{"type":"contains","value":"Bob"},{"type":"maxWords","value":15}]}
{"prompt":"greeting@v2","variables":{"userName":"Charlie"},"expectations":[{"type":"regex","value":"^Hello", "flags":"i"}]}
```

### Provider Comparison

Test the same prompt with different providers:

```bash
# Test with mock (fast, free)
prompt-cli eval --provider mock

# Test with OpenAI
prompt-cli eval --provider openai

# Compare results
prompt-cli eval --aggregate
```

## Tips & Best Practices

1. **Version Naming**: Use semantic versioning (v1, v2, v3) or descriptive names
2. **Test Coverage**: Create evaluation fixtures for all important use cases
3. **Document Changes**: Use the `description` field in metadata to document what changed
4. **Tag Prompts**: Use tags to categorize prompts (e.g., "production", "experimental")
5. **Regular Testing**: Run evaluations regularly to catch regressions
6. **CI Integration**: Add prompt testing to your CI/CD pipeline
7. **Review Diffs**: Always review diffs before deploying new prompt versions

## Quick Reference

```bash
# Initialize workspace
prompt-cli init

# List prompts
prompt-cli list

# Compare versions
prompt-cli diff greeting@v1 greeting@v2

# Run evaluations
prompt-cli eval
prompt-cli eval greeting.jsonl
prompt-cli eval --latest
prompt-cli eval --aggregate

# View results
prompt-cli eval --latest --detailed
prompt-cli eval --latest --compact
```

## Next Steps

1. **Explore your existing prompts**: Run `prompt-cli list` and `prompt-cli diff greeting@v1 greeting@v2`
2. **Run your first evaluation**: `prompt-cli eval`
3. **Create a new prompt**: Follow the customer-support example above
4. **Set up CI/CD**: Add prompt testing to your GitHub Actions
5. **Iterate and improve**: Use versioning and diffing to track improvements

## Getting Help

- Run `prompt-cli --help` for general help
- Run `prompt-cli <command> --help` for command-specific help
- Check `README.md` for detailed documentation
- Review `docs/prompt-structure.md` for prompt format details

---

**You're all set!** Your workspace is ready to use. Start by exploring your existing prompts and running evaluations.
