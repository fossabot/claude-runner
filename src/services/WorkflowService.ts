import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs/promises";
import { WorkflowParser } from "./WorkflowParser";
import {
  ClaudeWorkflow,
  WorkflowMetadata,
  WorkflowExecution,
  ClaudeStep,
  isClaudeStep,
  StepOutput,
} from "../types/WorkflowTypes";

export class WorkflowService {
  private static readonly WORKFLOW_DIR = ".github/workflows";
  private static readonly CLAUDE_WORKFLOW_PREFIX = "claude-";

  constructor(private readonly workspaceFolder: vscode.WorkspaceFolder) {}

  /**
   * Get the workflows directory path
   */
  private getWorkflowsPath(): string {
    return path.join(
      this.workspaceFolder.uri.fsPath,
      WorkflowService.WORKFLOW_DIR,
    );
  }

  /**
   * List all Claude workflows
   */
  async listWorkflows(): Promise<WorkflowMetadata[]> {
    const workflowsPath = this.getWorkflowsPath();

    try {
      await fs.access(workflowsPath);
    } catch {
      return [];
    }

    const files = await fs.readdir(workflowsPath);
    const workflows: WorkflowMetadata[] = [];

    for (const file of files) {
      if (
        file.startsWith(WorkflowService.CLAUDE_WORKFLOW_PREFIX) &&
        (file.endsWith(".yml") || file.endsWith(".yaml"))
      ) {
        const filePath = path.join(workflowsPath, file);
        const stats = await fs.stat(filePath);

        try {
          const content = await fs.readFile(filePath, "utf-8");
          const workflow = WorkflowParser.parseYaml(content);

          workflows.push({
            id: path.basename(file, path.extname(file)),
            name: workflow.name,
            description: workflow.inputs?.description?.default,
            created: stats.birthtime,
            modified: stats.mtime,
            path: filePath,
          });
        } catch (error) {
          console.error(`Failed to parse workflow ${file}:`, error);
        }
      }
    }

    return workflows.sort(
      (a, b) => b.modified.getTime() - a.modified.getTime(),
    );
  }

  /**
   * Load a workflow by ID
   */
  async loadWorkflow(workflowId: string): Promise<ClaudeWorkflow> {
    const workflowsPath = this.getWorkflowsPath();

    // Try both .yml and .yaml extensions
    let filePath = path.join(workflowsPath, `${workflowId}.yml`);
    try {
      await fs.access(filePath);
    } catch {
      filePath = path.join(workflowsPath, `${workflowId}.yaml`);
    }

    const content = await fs.readFile(filePath, "utf-8");
    return WorkflowParser.parseYaml(content);
  }

  /**
   * Save a workflow
   */
  async saveWorkflow(
    workflowId: string,
    workflow: ClaudeWorkflow,
  ): Promise<void> {
    const workflowsPath = this.getWorkflowsPath();

    // Ensure directory exists
    await fs.mkdir(workflowsPath, { recursive: true });

    const filePath = path.join(workflowsPath, `${workflowId}.yml`);
    const content = WorkflowParser.toYaml(workflow);

    await fs.writeFile(filePath, content, "utf-8");
  }

  /**
   * Delete a workflow
   */
  async deleteWorkflow(workflowId: string): Promise<void> {
    const workflowsPath = this.getWorkflowsPath();

    // Try both extensions
    try {
      await fs.unlink(path.join(workflowsPath, `${workflowId}.yml`));
    } catch {
      await fs.unlink(path.join(workflowsPath, `${workflowId}.yaml`));
    }
  }

  /**
   * Create a workflow execution context
   */
  createExecution(
    workflow: ClaudeWorkflow,
    inputs: Record<string, string>,
  ): WorkflowExecution {
    return {
      workflow,
      inputs,
      outputs: {},
      currentStep: 0,
      status: "pending",
    };
  }

  /**
   * Get Claude steps from workflow in execution order
   */
  getExecutionSteps(
    workflow: ClaudeWorkflow,
  ): Array<{ jobName: string; step: ClaudeStep; index: number }> {
    const steps: Array<{ jobName: string; step: ClaudeStep; index: number }> =
      [];

    for (const [jobName, job] of Object.entries(workflow.jobs)) {
      job.steps.forEach((step, index) => {
        if (isClaudeStep(step)) {
          steps.push({ jobName, step, index });
        }
      });
    }

    return steps;
  }

  /**
   * Resolve variables in a Claude step
   */
  resolveStepVariables(
    step: ClaudeStep,
    execution: WorkflowExecution,
  ): ClaudeStep {
    const context = {
      inputs: execution.inputs,
      env: { ...execution.workflow.env },
      steps: execution.outputs,
    };

    // Deep clone the step
    const resolvedStep = JSON.parse(JSON.stringify(step)) as ClaudeStep;

    // Resolve prompt
    resolvedStep.with.prompt = WorkflowParser.resolveVariables(
      resolvedStep.with.prompt,
      context,
    );

    // Resolve other string parameters
    for (const [key, value] of Object.entries(resolvedStep.with)) {
      if (typeof value === "string" && key !== "prompt") {
        resolvedStep.with[key] = WorkflowParser.resolveVariables(
          value,
          context,
        );
      }
    }

    return resolvedStep;
  }

  /**
   * Update execution with step output
   */
  updateExecutionOutput(
    execution: WorkflowExecution,
    stepId: string,
    output: StepOutput,
  ): void {
    execution.outputs[stepId] = output;
  }

  /**
   * Create a sample workflow
   */
  static createSampleWorkflow(): ClaudeWorkflow {
    return {
      name: "Claude Development Workflow",
      on: {
        workflow_dispatch: {
          inputs: {
            task_description: {
              description: "Description of the development task",
              required: true,
              type: "string",
            },
          },
        },
      },
      jobs: {
        development: {
          name: "Development Tasks",
          "runs-on": "ubuntu-latest",
          steps: [
            {
              id: "analyze",
              name: "Analyze Codebase",
              uses: "anthropics/claude-pipeline-action@v1",
              with: {
                prompt:
                  "Analyze the codebase structure and identify key components related to: ${{ inputs.task_description }}",
                model: "claude-3-5-sonnet-latest",
                allow_all_tools: true,
                output_session: true,
              },
            },
            {
              id: "implement",
              name: "Implement Changes",
              uses: "anthropics/claude-pipeline-action@v1",
              with: {
                prompt:
                  "Based on the analysis, implement the following task: ${{ inputs.task_description }}",
                model: "claude-3-5-sonnet-latest",
                allow_all_tools: true,
                resume_session: "${{ steps.analyze.outputs.session_id }}",
                output_session: true,
              },
            },
            {
              id: "test",
              name: "Write Tests",
              uses: "anthropics/claude-pipeline-action@v1",
              with: {
                prompt: "Write comprehensive tests for the implemented changes",
                model: "claude-3-5-sonnet-latest",
                allow_all_tools: true,
                resume_session: "${{ steps.implement.outputs.session_id }}",
              },
            },
          ],
        },
      },
    };
  }
}
