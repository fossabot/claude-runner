import * as assert from "assert";
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs/promises";
import { PipelineService } from "../../services/PipelineService";
import { TaskItem } from "../../services/ClaudeCodeService";
import { WorkflowParser } from "../../services/WorkflowParser";

describe("PipelineService YAML Format", () => {
  let service: PipelineService;
  let tempDir: string;
  let context: vscode.ExtensionContext;

  before(async () => {
    // Create a mock extension context
    tempDir = path.join("/tmp", "pipeline-test-" + Date.now());
    await fs.mkdir(tempDir, { recursive: true });

    context = {
      globalStorageUri: vscode.Uri.file(tempDir),
      extensionPath: "/mock/extension/path",
      extension: {
        packageJSON: { version: "1.0.0" },
      },
    } as any;

    // Mock vscode.workspace
    (global as any).vscode = {
      ...vscode,
      workspace: {
        workspaceFolders: [
          {
            uri: vscode.Uri.file(tempDir),
            name: "test-workspace",
            index: 0,
          },
        ],
      },
    };

    service = new PipelineService(context);
  });

  after(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error("Failed to clean up temp directory:", error);
    }
  });

  describe("savePipeline", () => {
    it("should save pipeline as valid GitHub Actions YAML", async () => {
      const tasks: TaskItem[] = [
        {
          id: "analyze",
          name: "Analyze Code",
          prompt: "Analyze the codebase structure",
          resumePrevious: false,
          status: "pending",
        },
        {
          id: "implement",
          name: "Implement Feature",
          prompt: "Implement the requested feature",
          resumePrevious: true,
          status: "pending",
          model: "claude-3-5-sonnet-latest",
        },
        {
          id: "test",
          name: "Write Tests",
          prompt: "Write comprehensive tests",
          resumePrevious: true,
          status: "pending",
        },
      ];

      await service.savePipeline(
        "test-pipeline",
        "Test pipeline for unit tests",
        tasks,
        "claude-3-5-sonnet-latest",
        true,
      );

      // Verify the file was created in the correct location
      const workflowPath = path.join(
        tempDir,
        ".github",
        "workflows",
        "claude-test-pipeline.yml",
      );
      const exists = await fs
        .access(workflowPath)
        .then(() => true)
        .catch(() => false);
      assert.ok(exists, "Workflow file should exist");

      // Read and parse the YAML
      const yamlContent = await fs.readFile(workflowPath, "utf-8");
      const workflow = WorkflowParser.parseYaml(yamlContent);

      // Verify workflow structure
      assert.strictEqual(workflow.name, "test-pipeline");
      assert.ok(workflow.on?.workflow_dispatch);
      assert.ok(workflow.jobs.pipeline);
      assert.strictEqual(workflow.jobs.pipeline.steps.length, 3);

      // Verify step details
      const steps = workflow.jobs.pipeline.steps;
      assert.strictEqual(steps[0].id, "analyze");
      assert.strictEqual(steps[0].name, "Analyze Code");
      assert.strictEqual(
        steps[0].with?.prompt,
        "Analyze the codebase structure",
      );
      assert.strictEqual(steps[0].with?.output_session, true); // Should output session for next step

      assert.strictEqual(steps[1].id, "implement");
      assert.strictEqual(steps[1].with?.model, "claude-3-5-sonnet-latest");
      assert.strictEqual(
        steps[1].with?.resume_session,
        "${{ steps.analyze.outputs.session_id }}",
      );
      assert.strictEqual(steps[1].with?.output_session, true);

      assert.strictEqual(steps[2].id, "test");
      assert.strictEqual(
        steps[2].with?.resume_session,
        "${{ steps.implement.outputs.session_id }}",
      );
      assert.ok(!steps[2].with?.output_session); // Last step shouldn't output session
    });
  });

  describe("loadPipeline", () => {
    it("should load saved YAML workflow", async () => {
      // First save a pipeline
      const tasks: TaskItem[] = [
        {
          id: "task1",
          name: "First Task",
          prompt: "Do something",
          resumePrevious: false,
          status: "pending",
        },
      ];

      await service.savePipeline(
        "load-test",
        "Load test pipeline",
        tasks,
        "claude-3-5-sonnet-latest",
        false,
      );

      // Now load it
      const workflow = await service.loadPipeline("load-test");
      assert.ok(workflow, "Should load workflow");
      if (workflow) {
        assert.strictEqual(workflow.name, "load-test");

        // Convert back to tasks
        const loadedTasks = service.workflowToTaskItems(workflow);
        assert.strictEqual(loadedTasks.length, 1);
        assert.strictEqual(loadedTasks[0].id, "task1");
        assert.strictEqual(loadedTasks[0].prompt, "Do something");
      }
    });
  });

  describe("workflowToTaskItems", () => {
    it("should correctly convert workflow to task items", async () => {
      const tasks: TaskItem[] = [
        {
          id: "step1",
          name: "Step 1",
          prompt: "First step",
          resumePrevious: false,
          status: "pending",
        },
        {
          id: "step2",
          name: "Step 2",
          prompt: "Second step",
          resumePrevious: true,
          status: "pending",
        },
      ];

      await service.savePipeline(
        "convert-test",
        "Conversion test",
        tasks,
        "claude-3-5-sonnet-latest",
        true,
      );
      const workflow = await service.loadPipeline("convert-test");
      assert.ok(workflow);
      if (workflow) {
        const convertedTasks = service.workflowToTaskItems(workflow);
        assert.strictEqual(convertedTasks.length, 2);
        assert.strictEqual(convertedTasks[0].resumePrevious, false);
        assert.strictEqual(convertedTasks[1].resumePrevious, true);
      }
    });
  });

  describe("listPipelines", () => {
    it("should list YAML workflows", async () => {
      // Save some pipelines
      await service.savePipeline(
        "list-test-1",
        "First pipeline",
        [],
        "claude-3-5-sonnet-latest",
        false,
      );
      await service.savePipeline(
        "list-test-2",
        "Second pipeline",
        [],
        "claude-3-5-sonnet-latest",
        false,
      );

      const pipelines = await service.listPipelines();
      assert.ok(pipelines.includes("list test 1"));
      assert.ok(pipelines.includes("list test 2"));
    });
  });
});
