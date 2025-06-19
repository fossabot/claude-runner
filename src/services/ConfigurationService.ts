import * as vscode from "vscode";
import {
  AVAILABLE_MODELS,
  DEFAULT_MODEL,
  getModelDisplayName,
  validateModel,
} from "../models/ClaudeModels";

export interface ClaudeRunnerConfig {
  defaultModel: string;
  defaultRootPath: string;
  allowAllTools: boolean;
  outputFormat: "text" | "json" | "stream-json";
  maxTurns: number;
  showVerboseOutput: boolean;
  terminalName: string;
  autoOpenTerminal: boolean;
}

export class ConfigurationService {
  private readonly configSection = "claudeRunner";

  getConfiguration(): ClaudeRunnerConfig {
    const config = vscode.workspace.getConfiguration(this.configSection);

    return {
      defaultModel: config.get<string>("defaultModel") ?? DEFAULT_MODEL,
      defaultRootPath: config.get<string>("defaultRootPath") ?? "",
      allowAllTools: config.get<boolean>("allowAllTools") ?? false,
      outputFormat:
        config.get<"text" | "json" | "stream-json">("outputFormat") ?? "text",
      maxTurns: config.get<number>("maxTurns") ?? 10,
      showVerboseOutput: config.get<boolean>("showVerboseOutput") ?? false,
      terminalName: config.get<string>("terminalName") ?? "Claude Interactive",
      autoOpenTerminal: config.get<boolean>("autoOpenTerminal") ?? true,
    };
  }

  async updateConfiguration<K extends keyof ClaudeRunnerConfig>(
    key: K,
    value: ClaudeRunnerConfig[K],
    target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Workspace,
  ): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.configSection);
    await config.update(key, value, target);
  }

  onConfigurationChanged(
    listener: (config: ClaudeRunnerConfig) => void,
  ): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(this.configSection)) {
        listener(this.getConfiguration());
      }
    });
  }

  getModelDisplayName(modelId: string): string {
    return getModelDisplayName(modelId);
  }

  getAvailableModels(): Array<{
    id: string;
    name: string;
    description: string;
  }> {
    return AVAILABLE_MODELS;
  }

  validateModel(modelId: string): boolean {
    return modelId === "auto" || validateModel(modelId);
  }

  validatePath(path: string): boolean {
    if (!path || path.trim().length === 0) {
      return false;
    }

    try {
      // Basic path validation - more thorough validation should be done when actually using the path
      return !path.includes("\0") && path.length < 1000;
    } catch {
      return false;
    }
  }
}
