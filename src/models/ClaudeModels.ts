// Central model definitions for Claude Runner

export interface ClaudeModel {
  id: string;
  name: string;
  description: string;
}

// Centralized model definitions
export const AVAILABLE_MODELS: ClaudeModel[] = [
  {
    id: "auto",
    name: "Auto",
    description: "Use default model (no override)",
  },
  {
    id: "claude-opus-4-20250514",
    name: "Claude Opus 4",
    description: "Most capable, highest cost",
  },
  {
    id: "claude-sonnet-4-20250514",
    name: "Claude Sonnet 4",
    description: "Balanced performance and cost",
  },
  {
    id: "claude-3-7-sonnet-20250219",
    name: "Claude Sonnet 3.7",
    description: "Good performance, moderate cost",
  },
  {
    id: "claude-3-5-haiku-20241022",
    name: "Claude Haiku 3.5",
    description: "Fastest, lowest cost",
  },
];

// Get just the model IDs for components that only need the IDs
export function getModelIds(): string[] {
  return AVAILABLE_MODELS.map((model) => model.id);
}

// Utility function to get a display name for a model ID
export function getModelDisplayName(modelId: string): string {
  const modelMap: Record<string, string> = {};
  AVAILABLE_MODELS.forEach((model) => {
    modelMap[model.id] = model.name;
  });

  return modelMap[modelId] ?? modelId;
}

// Utility function to validate a model ID
export function validateModel(modelId: string): boolean {
  return AVAILABLE_MODELS.some((model) => model.id === modelId);
}

// Default model to use when none is specified
export const DEFAULT_MODEL = "auto";
