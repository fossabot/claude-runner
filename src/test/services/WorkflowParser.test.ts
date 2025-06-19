import * as assert from "assert";
import { WorkflowParser } from "../../services/WorkflowParser";
import { ClaudeWorkflow } from "../../types/WorkflowTypes";

describe("WorkflowParser", () => {
  describe("parseYaml", () => {
    it("should parse a valid workflow", () => {
      const yaml = `
name: Test Workflow
on:
  workflow_dispatch:
    inputs:
      task:
        description: Task description
        required: true
        type: string
jobs:
  develop:
    name: Development
    runs-on: ubuntu-latest
    steps:
      - id: analyze
        name: Analyze Code
        uses: anthropics/claude-pipeline-action@v1
        with:
          prompt: Analyze the code
          model: claude-3-5-sonnet-latest
          allow_all_tools: true
          output_session: true
`;
      const workflow = WorkflowParser.parseYaml(yaml);
      assert.strictEqual(workflow.name, "Test Workflow");
      assert.ok(workflow.jobs.develop);
      assert.strictEqual(workflow.jobs.develop.steps.length, 1);
      assert.strictEqual(workflow.jobs.develop.steps[0].id, "analyze");
    });

    it("should throw error for workflow without name", () => {
      const yaml = `
jobs:
  test:
    steps:
      - uses: anthropics/claude-pipeline-action@v1
        with:
          prompt: Test
`;
      assert.throws(() => WorkflowParser.parseYaml(yaml), /must have a name/);
    });

    it("should throw error for workflow without jobs", () => {
      const yaml = `
name: Test Workflow
`;
      assert.throws(
        () => WorkflowParser.parseYaml(yaml),
        /must have at least one job/,
      );
    });

    it("should throw error for job without steps", () => {
      const yaml = `
name: Test Workflow
jobs:
  empty:
    name: Empty Job
`;
      assert.throws(
        () => WorkflowParser.parseYaml(yaml),
        /must have at least one step/,
      );
    });

    it("should throw error for Claude step without prompt", () => {
      const yaml = `
name: Test Workflow
jobs:
  test:
    steps:
      - uses: anthropics/claude-pipeline-action@v1
        with:
          model: claude-3-5-sonnet-latest
`;
      assert.throws(() => WorkflowParser.parseYaml(yaml), /must have a prompt/);
    });

    it("should validate session references", () => {
      const yaml = `
name: Test Workflow
jobs:
  test:
    steps:
      - id: first
        uses: anthropics/claude-pipeline-action@v1
        with:
          prompt: First step
          output_session: true
      - id: second
        uses: anthropics/claude-pipeline-action@v1
        with:
          prompt: Second step
          resume_session: \${{ steps.first.outputs.session_id }}
`;
      const workflow = WorkflowParser.parseYaml(yaml);
      assert.strictEqual(workflow.jobs.test.steps.length, 2);
    });

    it("should throw error for invalid session reference", () => {
      const yaml = `
name: Test Workflow
jobs:
  test:
    steps:
      - id: first
        uses: anthropics/claude-pipeline-action@v1
        with:
          prompt: First step
      - id: second
        uses: anthropics/claude-pipeline-action@v1
        with:
          prompt: Second step
          resume_session: \${{ steps.nonexistent.outputs.session_id }}
`;
      assert.throws(
        () => WorkflowParser.parseYaml(yaml),
        /references unknown step/,
      );
    });
  });

  describe("extractClaudeSteps", () => {
    it("should extract only Claude steps", () => {
      const workflow: ClaudeWorkflow = {
        name: "Test",
        jobs: {
          test: {
            steps: [
              {
                run: 'echo "Not a Claude step"',
              },
              {
                id: "claude1",
                uses: "anthropics/claude-pipeline-action@v1",
                with: {
                  prompt: "Test prompt",
                  model: "claude-3-5-sonnet-latest",
                },
              },
              {
                uses: "actions/checkout@v3",
              },
              {
                id: "claude2",
                uses: "anthropics/claude-pipeline-action@v1",
                with: {
                  prompt: "Another prompt",
                },
              },
            ],
          },
        },
      };

      const claudeSteps = WorkflowParser.extractClaudeSteps(workflow);
      assert.strictEqual(claudeSteps.length, 2);
      assert.strictEqual(claudeSteps[0].id, "claude1");
      assert.strictEqual(claudeSteps[1].id, "claude2");
    });
  });

  describe("resolveVariables", () => {
    it("should resolve input variables", () => {
      const template =
        "Task: ${{ inputs.task_name }} in ${{ inputs.language }}";
      const resolved = WorkflowParser.resolveVariables(template, {
        inputs: {
          task_name: "Refactor code",
          language: "TypeScript",
        },
      });
      assert.strictEqual(resolved, "Task: Refactor code in TypeScript");
    });

    it("should resolve environment variables", () => {
      const template = "Running on ${{ env.OS }} with ${{ env.NODE_VERSION }}";
      const resolved = WorkflowParser.resolveVariables(template, {
        env: {
          OS: "Ubuntu",
          NODE_VERSION: "18.x",
        },
      });
      assert.strictEqual(resolved, "Running on Ubuntu with 18.x");
    });

    it("should resolve step outputs", () => {
      const template = "Resume from ${{ steps.analyze.outputs.session_id }}";
      const resolved = WorkflowParser.resolveVariables(template, {
        steps: {
          analyze: {
            outputs: {
              session_id: "sess_123456",
            },
          },
        },
      });
      assert.strictEqual(resolved, "Resume from sess_123456");
    });

    it("should handle missing variables", () => {
      const template = "Value: ${{ inputs.missing }}";
      const resolved = WorkflowParser.resolveVariables(template, {
        inputs: {},
      });
      assert.strictEqual(resolved, "Value: ");
    });

    it("should resolve multiple variables", () => {
      const template =
        "${{ inputs.greeting }} ${{ env.user }}, session: ${{ steps.prev.outputs.session_id }}";
      const resolved = WorkflowParser.resolveVariables(template, {
        inputs: { greeting: "Hello" },
        env: { user: "Developer" },
        steps: {
          prev: {
            outputs: {
              session_id: "abc123",
            },
          },
        },
      });
      assert.strictEqual(resolved, "Hello Developer, session: abc123");
    });
  });

  describe("toYaml", () => {
    it("should convert workflow to YAML", () => {
      const workflow: ClaudeWorkflow = {
        name: "Simple Workflow",
        jobs: {
          main: {
            steps: [
              {
                id: "task",
                uses: "anthropics/claude-pipeline-action@v1",
                with: {
                  prompt: "Do something",
                  model: "claude-3-5-sonnet-latest",
                },
              },
            ],
          },
        },
      };

      const yaml = WorkflowParser.toYaml(workflow);
      assert.ok(yaml.includes("name: Simple Workflow"));
      assert.ok(yaml.includes("jobs:"));
      assert.ok(yaml.includes("main:"));
      assert.ok(yaml.includes("steps:"));
      assert.ok(yaml.includes("prompt: Do something"));
    });
  });
});
