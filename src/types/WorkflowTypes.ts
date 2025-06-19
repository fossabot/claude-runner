/**
 * GitHub Actions workflow types for Claude Pipeline
 * Based on GitHub Actions workflow syntax with Claude-specific extensions
 */

export interface ClaudeWorkflow {
  name: string;
  on?: WorkflowTrigger;
  inputs?: Record<string, WorkflowInput>;
  env?: Record<string, string>;
  jobs: Record<string, Job>;
}

export interface WorkflowTrigger {
  workflow_dispatch?: {
    inputs?: Record<string, WorkflowInput>;
  };
  [key: string]: unknown;
}

export interface WorkflowInput {
  description?: string;
  required?: boolean;
  default?: string;
  type?: "string" | "boolean" | "choice";
  options?: string[];
}

export interface Job {
  name?: string;
  "runs-on"?: string;
  env?: Record<string, string>;
  steps: Step[];
}

export interface Step {
  id?: string;
  name?: string;
  uses?: string;
  with?: Record<string, unknown>;
  env?: Record<string, string>;
  run?: string;
  if?: string;
  "continue-on-error"?: boolean;
}

export interface ClaudeStep extends Step {
  uses: string; // Must include 'claude-pipeline-action'
  with: {
    prompt: string;
    model?: string;
    allow_all_tools?: boolean;
    working_directory?: string;
    resume_session?: string;
    output_session?: boolean;
    [key: string]: unknown;
  };
}

export interface StepOutput {
  session_id?: string;
  result?: string;
  [key: string]: unknown;
}

export interface WorkflowExecution {
  workflow: ClaudeWorkflow;
  inputs: Record<string, string>;
  outputs: Record<string, StepOutput>;
  currentStep: number;
  status: "pending" | "running" | "completed" | "failed";
  error?: string;
}

export interface WorkflowMetadata {
  id: string;
  name: string;
  description?: string;
  created: Date;
  modified: Date;
  path: string;
}

// Type guards
export function isClaudeStep(step: Step): step is ClaudeStep {
  return !!step.uses && step.uses.includes("claude-pipeline-action");
}

export function hasSessionOutput(step: ClaudeStep): boolean {
  return step.with.output_session === true;
}

export function getSessionReference(value: string): string | null {
  const match = value.match(
    /\$\{\{\s*steps\.(\w+)\.outputs\.session_id\s*\}\}/,
  );
  return match ? match[1] : null;
}
