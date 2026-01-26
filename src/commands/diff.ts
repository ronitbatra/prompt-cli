import { Command, Args, Flags } from "@oclif/core";
import { discoverWorkspace, loadConfig } from "../lib/workspace";
import { loadPromptVersion } from "../lib/registry/prompt-discovery";
import { diffText, formatDiff, getDiffSummary } from "../lib/diff/text-diff";
import {
  diffJson,
  formatJsonDiff,
  getJsonDiffSummary,
} from "../lib/diff/json-diff";
import {
  createHeader,
  formatComparisonHeader,
  formatDiffLine,
  formatSummary,
  formatNoChanges,
  formatMetadataChange,
  createSeparator,
} from "../lib/diff/terminal-format";

export default class Diff extends Command {
  static override description =
    "Compare two versions of a prompt and show the differences.\n" +
    "Displays changes in both the template content and metadata between versions.";

  static override examples = [
    "<%= config.bin %> diff greeting@v1 greeting@v2",
    "<%= config.bin %> diff greeting@v1 greeting  # Compare v1 to latest",
    "<%= config.bin %> diff greeting greeting@v2    # Compare latest to v2",
    "<%= config.bin %> diff greeting@v1 greeting@v2 --template  # Show only template changes",
    "<%= config.bin %> diff greeting@v1 greeting@v2 --metadata  # Show only metadata changes",
  ];

  static override flags = {
    template: Flags.boolean({
      char: "t",
      description:
        "Show only the template diff (prompt content changes)",
      default: false,
    }),
    metadata: Flags.boolean({
      char: "m",
      description:
        "Show only the metadata diff (version info, variables, tags, etc.)",
      default: false,
    }),
  };

  static override args = {
    oldVersion: Args.string({
      description:
        "The older prompt version to compare (e.g., 'greeting@v1' or 'greeting' for latest version)",
      required: true,
    }),
    newVersion: Args.string({
      description:
        "The newer prompt version to compare (e.g., 'greeting@v2' or 'greeting' for latest version)",
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Diff);

    // Discover workspace
    const workspaceRoot = discoverWorkspace();
    const config = loadConfig(workspaceRoot);

    try {
      // Load both prompt versions
      const oldVersion = loadPromptVersion(
        workspaceRoot,
        args.oldVersion,
        config
      );
      const newVersion = loadPromptVersion(
        workspaceRoot,
        args.newVersion,
        config
      );

      // Validate that we're comparing the same prompt
      if (oldVersion.name !== newVersion.name) {
        this.error(
          `Cannot compare different prompts.\n\n` +
            `You're trying to compare:\n` +
            `  "${oldVersion.name}" (version ${oldVersion.version})\n` +
            `  "${newVersion.name}" (version ${newVersion.version})\n\n` +
            `Please compare versions of the same prompt, for example:\n` +
            `  prompt-cli diff ${oldVersion.name}@v1 ${oldVersion.name}@v2\n` +
            `  prompt-cli diff ${newVersion.name}@v1 ${newVersion.name}@v2`
        );
        return;
      }

      const promptName = oldVersion.name;
      const oldVersionStr = oldVersion.version;
      const newVersionStr = newVersion.version;

      // Show header with enhanced formatting
      this.log(
        formatComparisonHeader(promptName, oldVersionStr, newVersionStr)
      );

      let hasAnyChanges = false;

      // Compare templates
      if (!flags.metadata) {
        const templateDiff = diffText(oldVersion.template, newVersion.template);
        if (templateDiff.hasChanges || !flags.template) {
          this.log(createHeader("Template Changes", 60));
          this.log(formatSummary(getDiffSummary(templateDiff)));
          this.log("");

          if (templateDiff.hasChanges) {
            hasAnyChanges = true;
            const formatted = formatDiff(templateDiff);
            // Split by lines and add appropriate formatting
            const lines = formatted.split("\n");
            for (const line of lines) {
              if (line.trim() === "") {
                this.log(""); // Preserve empty lines
              } else {
                const type = line.startsWith("+")
                  ? "added"
                  : line.startsWith("-")
                    ? "removed"
                    : "unchanged";
                this.log(formatDiffLine(line, type));
              }
            }
          } else {
            this.log(formatNoChanges("template"));
          }
          this.log("");
        }
      }

      // Compare metadata
      if (!flags.template) {
        const metadataDiff = diffJson(oldVersion.metadata, newVersion.metadata);
        if (metadataDiff.hasChanges || !flags.metadata) {
          this.log(createHeader("Metadata Changes", 60));
          this.log(formatSummary(getJsonDiffSummary(metadataDiff)));
          this.log("");

          if (metadataDiff.hasChanges) {
            hasAnyChanges = true;
            // Format each change individually for better readability
            for (const change of metadataDiff.changes) {
              this.log(
                formatMetadataChange(
                  change.path,
                  change.type,
                  change.oldValue,
                  change.newValue
                )
              );
            }
          } else {
            this.log(formatNoChanges("metadata"));
          }
          this.log("");
        }
      }

      // Final summary
      if (!hasAnyChanges && !flags.template && !flags.metadata) {
        this.log(createSeparator("─", 60));
        this.log(formatNoChanges("versions").trim());
        this.log("");
      }
    } catch (error) {
      if (error instanceof Error) {
        // Provide more context for common errors
        if (error.message.includes("not found") || error.message.includes("Prompt")) {
          this.error(error.message);
        } else if (error.message.includes("workspace")) {
          this.error(
            `${error.message}\n\n` +
              `Make sure you're running this command from within a Promptforge workspace.\n` +
              `To create a workspace, run: prompt-cli init`
          );
        } else {
          this.error(
            `Failed to compare prompts: ${error.message}\n\n` +
              `Please check that both prompt versions exist and try again.`
          );
        }
      } else {
        this.error(
          `Failed to compare prompts: ${String(error)}\n\n` +
            `Please check that both prompt versions exist and try again.`
        );
      }
    }
  }
}
