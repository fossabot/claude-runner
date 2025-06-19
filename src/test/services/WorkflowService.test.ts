import * as assert from "assert";
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs/promises";
import { WorkflowService } from "../../services/WorkflowService";
import { ClaudeWorkflow, WorkflowExecution } from "../../types/WorkflowTypes";

// Mock workspace folder
const mockWorkspaceFolder: vscode.WorkspaceFolder = {
  uri: vscode.Uri.file("/test/workspace"),
  name: "test-workspace",
  index: 0,
};

describe("WorkflowService", () => {
  let service: WorkflowService;
  let tempDir: string;

  before(async () => {
    // Create temporary directory for tests
    tempDir = path.join("/tmp", "workflow-test-" + Date.now());
    await fs.mkdir(tempDir, { recursive: true });

    // Create new mock workspace folder with temp dir
    const testWorkspaceFolder = {
      ...mockWorkspaceFolder,
      uri: vscode.Uri.file(tempDir),
    };
    service = new WorkflowService(testWorkspaceFolder);
  });

  after(async () => {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error("Failed to clean up temp directory:", error);
    }
  });

  describe("listWorkflows", () => {
    it("should return empty array when no workflows exist", async () => {
      const workflows = await service.listWorkflows();
      assert.strictEqual(workflows.length, 0);
    });

    it("should list Claude workflows", async () => {
      // Create workflows directory
      const workflowsDir = path.join(tempDir, ".github", "workflows");
      await fs.mkdir(workflowsDir, { recursive: true });

      // Create a Claude workflow
      const workflowContent = `
name: Claude Test Workflow
jobs:
  test:
    steps:
      - uses: anthropics/claude-pipeline-action@v1
        with:
          prompt: Test prompt
`;
      await fs.writeFile(
        path.join(workflowsDir, "claude-test.yml"),
        workflowContent,
      );

      // Create a non-Claude workflow (should be ignored)
      await fs.writeFile(
        path.join(workflowsDir, "regular-workflow.yml"),
        "name: Regular Workflow\njobs: {}",
      );

      const workflows = await service.listWorkflows();
      assert.strictEqual(workflows.length, 1);
      assert.strictEqual(workflows[0].id, "claude-test");
      assert.strictEqual(workflows[0].name, "Claude Test Workflow");
    });
  });

  describe("saveWorkflow and loadWorkflow", () => {
    it("should save and load a workflow", async () => {
      const workflow: ClaudeWorkflow = {
        name: "Test Save Workflow",
        jobs: {
          main: {
            steps: [
              {
                id: "step1",
                uses: "anthropics/claude-pipeline-action@v1",
                with: {
                  prompt: "Test prompt",
                  model: "claude-3-5-sonnet-latest",
                  output_session: true,
                },
              },
            ],
          },
        },
      };

      await service.saveWorkflow("claude-save-test", workflow);
      const loaded = await service.loadWorkflow("claude-save-test");

      assert.strictEqual(loaded.name, workflow.name);
      assert.deepStrictEqual(loaded.jobs, workflow.jobs);
    });
  });

  describe("deleteWorkflow", () => {
    it("should delete a workflow", async () => {
      const workflow: ClaudeWorkflow = {
        name: "Test Delete",
        jobs: {
          main: {
            steps: [
              {
                uses: "anthropics/claude-pipeline-action@v1",
                with: { prompt: "Delete me" },
              },
            ],
          },
        },
      };

      await service.saveWorkflow("claude-delete-test", workflow);

      // Verify it exists
      const beforeDelete = await service.listWorkflows();
      assert.ok(beforeDelete.some((w) => w.id === "claude-delete-test"));

      // Delete it
      await service.deleteWorkflow("claude-delete-test");

      // Verify it's gone
      const afterDelete = await service.listWorkflows();
      assert.ok(!afterDelete.some((w) => w.id === "claude-delete-test"));
    });
  });

  describe("createExecution", () => {
    it("should create workflow execution context", () => {
      const workflow: ClaudeWorkflow = {
        name: "Test Execution",
        jobs: {
          main: {
            steps: [
              {
                uses: "anthropics/claude-pipeline-action@v1",
                with: { prompt: "Execute" },
              },
            ],
          },
        },
      };

      const execution = service.createExecution(workflow, { task: "test" });

      assert.strictEqual(execution.workflow, workflow);
      assert.deepStrictEqual(execution.inputs, { task: "test" });
      assert.deepStrictEqual(execution.outputs, {});
      assert.strictEqual(execution.currentStep, 0);
      assert.strictEqual(execution.status, "pending");
    });
  });

  describe("getExecutionSteps", () => {
    it("should extract Claude steps with metadata", () => {
      const workflow: ClaudeWorkflow = {
        name: "Test Steps",
        jobs: {
          prepare: {
            steps: [
              { run: 'echo "setup"' },
              {
                id: "analyze",
                uses: "anthropics/claude-pipeline-action@v1",
                with: { prompt: "Analyze" },
              },
            ],
          },
          execute: {
            steps: [
              {
                id: "implement",
                uses: "anthropics/claude-pipeline-action@v1",
                with: { prompt: "Implement" },
              },
              { run: "npm test" },
            ],
          },
        },
      };

      const steps = service.getExecutionSteps(workflow);

      assert.strictEqual(steps.length, 2);
      assert.strictEqual(steps[0].jobName, "prepare");
      assert.strictEqual(steps[0].step.id, "analyze");
      assert.strictEqual(steps[0].index, 1);
      assert.strictEqual(steps[1].jobName, "execute");
      assert.strictEqual(steps[1].step.id, "implement");
      assert.strictEqual(steps[1].index, 0);
    });
  });

  describe("resolveStepVariables", () => {
    it("should resolve variables in step configuration", () => {
      const step: any = {
        id: "test",
        uses: "anthropics/claude-pipeline-action@v1",
        with: {
          prompt: "Task: ${{ inputs.task }}",
          working_directory: "${{ env.WORK_DIR }}",
          resume_session: "${{ steps.prev.outputs.session_id }}",
        },
      };

      const execution: WorkflowExecution = {
        workflow: {
          name: "Test",
          env: { WORK_DIR: "/project" },
          jobs: {},
        },
        inputs: { task: "Refactor code" },
        outputs: {
          prev: {
            session_id: "sess_abc123",
          },
        },
        currentStep: 0,
        status: "running",
      };

      const resolved = service.resolveStepVariables(step, execution);

      assert.strictEqual(resolved.with.prompt, "Task: Refactor code");
      assert.strictEqual(resolved.with.working_directory, "/project");
      assert.strictEqual(resolved.with.resume_session, "sess_abc123");
    });
  });

  describe("updateExecutionOutput", () => {
    it("should update execution outputs", () => {
      const execution: WorkflowExecution = {
        workflow: { name: "Test", jobs: {} },
        inputs: {},
        outputs: {},
        currentStep: 0,
        status: "running",
      };

      service.updateExecutionOutput(execution, "step1", {
        session_id: "sess_123",
        result: "Step completed",
      });

      assert.deepStrictEqual(execution.outputs.step1, {
        session_id: "sess_123",
        result: "Step completed",
      });
    });
  });

  describe("createSampleWorkflow", () => {
    it("should create a valid sample workflow", () => {
      const sample = WorkflowService.createSampleWorkflow();

      assert.strictEqual(sample.name, "Claude Development Workflow");
      assert.ok(sample.on?.workflow_dispatch?.inputs?.task_description);
      assert.ok(sample.jobs.development);
      assert.strictEqual(sample.jobs.development.steps.length, 3);

      // Verify step chaining
      const steps = sample.jobs.development.steps;
      assert.strictEqual(steps[0].id, "analyze");
      assert.strictEqual(steps[0].with?.output_session, true);
      assert.strictEqual(steps[1].id, "implement");
      assert.strictEqual(
        steps[1].with?.resume_session,
        "${{ steps.analyze.outputs.session_id }}",
      );
      assert.strictEqual(steps[2].id, "test");
      assert.strictEqual(
        steps[2].with?.resume_session,
        "${{ steps.implement.outputs.session_id }}",
      );
    });
  });
});
