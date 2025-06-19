import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs/promises";
import { TaskItem } from "./ClaudeCodeService";
import { ClaudeWorkflow, ClaudeStep } from "../types/WorkflowTypes";
import { WorkflowParser } from "./WorkflowParser";

export class PipelineService {
  private workflowsDir: string = "";
  private rootPath: string | undefined;

  constructor(private readonly context: vscode.ExtensionContext) {
    // Initialize with workspace folder as default
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    this.rootPath = workspaceFolder?.uri.fsPath;
    this.updateWorkflowsDir();
    this.ensureDirectories();
  }

  /**
   * Set the root path for workflow storage
   */
  setRootPath(rootPath: string): void {
    this.rootPath = rootPath;
    this.updateWorkflowsDir();
    this.ensureDirectories();
  }

  private updateWorkflowsDir(): void {
    if (this.rootPath) {
      // Store in .github/workflows within the selected root path
      this.workflowsDir = path.join(this.rootPath, ".github", "workflows");
    } else {
      // Fallback to global storage if no root path
      this.workflowsDir = path.join(
        this.context.globalStorageUri.fsPath,
        "workflows",
      );
    }
    // Workflow storage directory configured
  }

  private async ensureDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.workflowsDir, { recursive: true });
      // Created workflow directory
    } catch (error) {
      console.error("Failed to create workflow directory:", error);
      vscode.window.showErrorMessage(
        `Failed to create workflow directory at ${this.workflowsDir}`,
      );
    }
  }

  async savePipeline(
    name: string,
    description: string,
    tasks: TaskItem[],
    defaultModel: string,
    allowAllTools: boolean,
  ): Promise<void> {
    // Convert tasks to GitHub Actions workflow format
    const workflow: ClaudeWorkflow = {
      name: name,
      on: {
        workflow_dispatch: {
          inputs: {
            description: {
              description: description || "Pipeline execution",
              required: false,
              type: "string",
            },
          },
        },
      },
      jobs: {
        pipeline: {
          name: "Pipeline Execution",
          "runs-on": "ubuntu-latest",
          steps: tasks.map((task, index) => {
            const step: ClaudeStep = {
              id: task.id,
              name: task.name ?? `Task ${task.id}`,
              uses: "anthropics/claude-pipeline-action@v1",
              with: {
                prompt: task.prompt,
                model: task.model ?? defaultModel,
                allow_all_tools: allowAllTools,
              },
            };

            // Handle session resumption
            if (task.resumePrevious && index > 0) {
              step.with.resume_session = `\${{ steps.${tasks[index - 1].id}.outputs.session_id }}`;
            }

            // Output session for next step if needed
            if (index < tasks.length - 1 && tasks[index + 1].resumePrevious) {
              step.with.output_session = true;
            }

            return step;
          }),
        },
      },
    };

    // Save as YAML
    const filename = `claude-${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}.yml`;
    const filepath = path.join(this.workflowsDir, filename);

    // Saving pipeline to file

    // Write as YAML
    const yamlContent = WorkflowParser.toYaml(workflow);
    await fs.writeFile(filepath, yamlContent);

    const relativePath = this.rootPath
      ? path.relative(this.rootPath, this.workflowsDir)
      : this.workflowsDir;
    vscode.window.showInformationMessage(
      `Pipeline '${name}' saved to: ${relativePath}`,
    );
  }

  async loadPipeline(name: string): Promise<ClaudeWorkflow | null> {
    try {
      // Load from .github/workflows
      const workflowFilename = `claude-${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}.yml`;
      let filepath = path.join(this.workflowsDir, workflowFilename);

      try {
        const content = await fs.readFile(filepath, "utf-8");
        const workflow = WorkflowParser.parseYaml(content);
        // Successfully loaded workflow
        return workflow;
      } catch {
        // Try .yaml extension
        filepath = filepath.replace(".yml", ".yaml");
        const content = await fs.readFile(filepath, "utf-8");
        const workflow = WorkflowParser.parseYaml(content);
        // Successfully loaded workflow
        return workflow;
      }
    } catch (error) {
      console.error(`Failed to load pipeline ${name}:`, error);
      vscode.window.showErrorMessage(`Pipeline '${name}' not found`);
      return null;
    }
  }

  async listPipelines(): Promise<string[]> {
    const pipelines: string[] = [];

    try {
      const files = await fs.readdir(this.workflowsDir);

      for (const file of files) {
        if (
          file.startsWith("claude-") &&
          (file.endsWith(".yml") || file.endsWith(".yaml"))
        ) {
          // Extract name from claude-name.yml format
          const match = file.match(/^claude-(.+)\.ya?ml$/);
          if (match) {
            pipelines.push(match[1].replace(/-/g, " "));
          }
        }
      }
    } catch (error) {
      // No workflows directory found
    }

    // Pipeline discovery complete
    return pipelines;
  }

  async deletePipeline(name: string): Promise<void> {
    try {
      const workflowFilename = `claude-${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}.yml`;
      let filepath = path.join(this.workflowsDir, workflowFilename);

      try {
        await fs.unlink(filepath);
      } catch {
        // Try .yaml extension
        filepath = filepath.replace(".yml", ".yaml");
        await fs.unlink(filepath);
      }

      vscode.window.showInformationMessage(`Pipeline '${name}' deleted`);
    } catch (error) {
      vscode.window.showErrorMessage(`Pipeline '${name}' not found`);
    }
  }

  /**
   * Convert a workflow to TaskItem array for UI display
   */
  workflowToTaskItems(workflow: ClaudeWorkflow): TaskItem[] {
    const tasks: TaskItem[] = [];

    // Extract all Claude steps from all jobs
    for (const job of Object.values(workflow.jobs)) {
      for (const step of job.steps) {
        if (step.uses && step.uses.includes("claude-pipeline-action")) {
          const claudeStep = step as ClaudeStep;

          // Check if this step resumes from a previous one
          let resumePrevious = false;
          if (claudeStep.with.resume_session) {
            const match = claudeStep.with.resume_session.match(
              /\$\{\{\s*steps\.(\w+)\.outputs\.session_id\s*\}\}/,
            );
            if (match) {
              resumePrevious = true;
            }
          }

          tasks.push({
            id: step.id ?? `step-${tasks.length}`,
            name: step.name,
            prompt: claudeStep.with.prompt,
            resumePrevious,
            status: "pending",
            model: claudeStep.with.model,
          });
        }
      }
    }

    return tasks;
  }
}
