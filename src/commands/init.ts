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
  static override description = "Initialize a new Promptforge workspace";

  static override examples = [
    "<%= config.bin %> init",
    "<%= config.bin %> init --force",
    "<%= config.bin %> init --name my-project",
  ];

  static override flags = {
    force: Flags.boolean({
      char: "f",
      description: "Overwrite existing workspace files",
      default: false,
    }),
    name: Flags.string({
      char: "n",
      description: "Workspace name",
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(Init);
    const workspaceRoot = process.cwd();

    // Check if workspace already exists
    const existingWorkspace = findWorkspace(workspaceRoot);
    if (existingWorkspace && !flags.force) {
      this.error(
        `Workspace already exists at ${existingWorkspace}\n` +
          "Use --force to overwrite existing files."
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
        this.error(`Failed to initialize workspace: ${error.message}`);
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
