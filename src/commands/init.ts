import { Command, Flags } from "@oclif/core";
import fs from "fs";
import path from "path";
import {
  createDefaultConfig,
  writeConfig,
  getConfigPath,
  findWorkspace,
} from "../lib/workspace";
import type { PromptforgeConfig } from "../lib/workspace/types";

export default class Init extends Command {
  static override description =
    "Initialize a new Promptforge workspace in the current directory.\n" +
    "Creates a promptforge.yaml config file and sets up the prompts/, evals/, and runs/ directories.";

  static override examples = [
    "<%= config.bin %> init",
    "<%= config.bin %> init --force",
    "<%= config.bin %> init --name my-project",
  ];

  static override flags = {
    force: Flags.boolean({
      char: "f",
      description: "Overwrite existing workspace files if they already exist",
      default: false,
    }),
    name: Flags.string({
      char: "n",
      description: "Set a custom workspace name (used in promptforge.yaml)",
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(Init);
    const workspaceRoot = process.cwd();

    // Check if workspace already exists
    const existingWorkspace = findWorkspace(workspaceRoot);
    if (existingWorkspace && !flags.force) {
      this.error(
        `A Promptforge workspace already exists at:\n` +
          `  ${existingWorkspace}\n\n` +
          `To overwrite existing files, use the --force flag:\n` +
          `  prompt-cli init --force\n\n` +
          `Warning: This will overwrite your existing promptforge.yaml file.`
      );
      return;
    }

    try {
      // Create config
      const config = createDefaultConfig(flags.name);

      // Write config file
      writeConfig(workspaceRoot, config);
      this.log(`✓ Created ${path.join(workspaceRoot, "promptforge.yaml")}`);

      // Create directories
      await this.createDirectories(workspaceRoot, config);

      // Generate example files
      await this.generateExamplePrompt(workspaceRoot, config);
      await this.generateExampleEval(workspaceRoot, config);

      this.log("\n✓ Workspace initialized successfully!");
      this.log(`\nNext steps:`);
      this.log(
        `  1. Edit prompts in the ${getConfigPath(config, "prompts")}/ directory`
      );
      this.log(
        `  2. Add eval fixtures in the ${getConfigPath(config, "evals")}/ directory`
      );
      this.log(`  3. Run '${this.config.bin} list' to see your prompts`);
    } catch (error) {
      if (error instanceof Error) {
        // Check for common errors and provide helpful messages
        if (
          error.message.includes("EACCES") ||
          error.message.includes("permission")
        ) {
          this.error(
            `Permission denied: Cannot write to ${workspaceRoot}\n\n` +
              `Please check that you have write permissions for this directory.`
          );
        } else if (error.message.includes("ENOSPC")) {
          this.error(
            `No space left on device: Cannot create workspace files.\n\n` +
              `Please free up disk space and try again.`
          );
        } else {
          this.error(
            `Failed to initialize workspace: ${error.message}\n\n` +
              `Please ensure you have write permissions and try again.`
          );
        }
      } else {
        this.error(`Failed to initialize workspace: ${String(error)}`);
      }
      throw error;
    }
  }

  private async createDirectories(
    workspaceRoot: string,
    config: PromptforgeConfig
  ): Promise<void> {
    const directories = [
      getConfigPath(config, "prompts"),
      getConfigPath(config, "evals"),
      getConfigPath(config, "runs"),
    ];

    for (const dir of directories) {
      const dirPath = path.join(workspaceRoot, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        this.log(`✓ Created directory: ${dir}/`);
      } else {
        this.log(`✓ Directory already exists: ${dir}/`);
      }
    }
  }

  private async generateExamplePrompt(
    workspaceRoot: string,
    config: PromptforgeConfig
  ): Promise<void> {
    const promptsDir = path.join(
      workspaceRoot,
      getConfigPath(config, "prompts")
    );
    const examplePromptDir = path.join(promptsDir, "greeting", "v1");

    // Create directory structure
    fs.mkdirSync(examplePromptDir, { recursive: true });

    // Create .prompt.md file
    const promptTemplate = `You are a helpful assistant.

User: {{userName}}

Please greet them in a friendly way.`;

    const promptPath = path.join(examplePromptDir, "greeting.prompt.md");
    fs.writeFileSync(promptPath, promptTemplate, "utf-8");
    this.log(
      `✓ Created example prompt: prompts/greeting/v1/greeting.prompt.md`
    );

    // Create .meta.json file
    const metadata = {
      name: "greeting",
      version: "v1",
      description: "A friendly greeting prompt",
      variables: ["userName"],
      tags: ["greeting", "example"],
      createdAt: new Date().toISOString(),
    };

    const metaPath = path.join(examplePromptDir, "greeting.meta.json");
    fs.writeFileSync(
      metaPath,
      JSON.stringify(metadata, null, 2) + "\n",
      "utf-8"
    );
    this.log(
      `✓ Created example metadata: prompts/greeting/v1/greeting.meta.json`
    );
  }

  private async generateExampleEval(
    workspaceRoot: string,
    config: PromptforgeConfig
  ): Promise<void> {
    const evalsDir = path.join(workspaceRoot, getConfigPath(config, "evals"));
    const exampleEvalPath = path.join(evalsDir, "greeting.jsonl");

    // Create example JSONL file
    const exampleEval = {
      prompt: "greeting@v1",
      variables: {
        userName: "Alice",
      },
      expectations: [
        {
          type: "contains",
          value: "Alice",
        },
      ],
    };

    fs.writeFileSync(
      exampleEvalPath,
      JSON.stringify(exampleEval) + "\n",
      "utf-8"
    );
    this.log(`✓ Created example eval: evals/greeting.jsonl`);
  }
}
