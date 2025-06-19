import * as vscode from "vscode";
import { ConfigurationService } from "./ConfigurationService";
import { ClaudeCodeService } from "./ClaudeCodeService";

export class TerminalService {
  private readonly terminals: Map<string, vscode.Terminal> = new Map();

  constructor(private readonly configService: ConfigurationService) {
    // Clean up terminals when they are closed
    vscode.window.onDidCloseTerminal((terminal) => {
      for (const [key, term] of this.terminals) {
        if (term === terminal) {
          this.terminals.delete(key);
          break;
        }
      }
    });
  }

  async runInteractive(
    model: string,
    rootPath: string,
    allowAllTools: boolean,
    prompt?: string,
  ): Promise<vscode.Terminal> {
    const config = this.configService.getConfiguration();
    const terminalName = `${config.terminalName} - ${this.configService.getModelDisplayName(model)}`;

    // Check if we already have a terminal for this configuration
    const terminalKey = `${model}-${rootPath}`;
    let terminal = this.terminals.get(terminalKey);

    if (terminal && this.isTerminalActive(terminal)) {
      // Reuse existing terminal
      terminal.show(config.autoOpenTerminal);
      return terminal;
    }

    // Create new terminal
    terminal = vscode.window.createTerminal({
      name: terminalName,
      cwd: rootPath,
      iconPath: new vscode.ThemeIcon("terminal"),
    });

    this.terminals.set(terminalKey, terminal);

    // Build and send the Claude command
    const claudeCodeService = new ClaudeCodeService(this.configService);
    const args = claudeCodeService.buildInteractiveCommand(
      model,
      allowAllTools,
      prompt,
    );
    const command = args.join(" ");

    terminal.sendText(command);

    if (config.autoOpenTerminal) {
      terminal.show();
    }

    return terminal;
  }

  async runCommand(
    command: string,
    rootPath: string,
    terminalName?: string,
  ): Promise<vscode.Terminal> {
    const config = this.configService.getConfiguration();
    const name = terminalName ?? config.terminalName;

    const terminal = vscode.window.createTerminal({
      name,
      cwd: rootPath,
      iconPath: new vscode.ThemeIcon("run"),
    });

    terminal.sendText(command);

    if (config.autoOpenTerminal) {
      terminal.show();
    }

    return terminal;
  }

  getActiveTerminals(): vscode.Terminal[] {
    return Array.from(this.terminals.values()).filter((terminal) =>
      this.isTerminalActive(terminal),
    );
  }

  findTerminalByName(name: string): vscode.Terminal | undefined {
    return vscode.window.terminals.find((terminal) => terminal.name === name);
  }

  async createTerminalWithModel(
    model: string,
    rootPath: string,
  ): Promise<vscode.Terminal> {
    const modelName = this.configService.getModelDisplayName(model);

    const terminal = vscode.window.createTerminal({
      name: `Claude - ${modelName}`,
      cwd: rootPath,
      iconPath: new vscode.ThemeIcon("terminal"),
    });

    // Navigate to the path and show some helpful information
    const welcomeCommands = [
      `# Claude Runner - ${modelName}`,
      `# Working directory: ${rootPath}`,
      `# Model: ${model}`,
      "",
      "# Ready to run Claude commands!",
    ];

    for (const line of welcomeCommands) {
      terminal.sendText(`echo "${line}"`);
    }

    return terminal;
  }

  disposeTerminal(terminalKey: string): void {
    const terminal = this.terminals.get(terminalKey);
    if (terminal) {
      terminal.dispose();
      this.terminals.delete(terminalKey);
    }
  }

  disposeAllTerminals(): void {
    for (const terminal of this.terminals.values()) {
      terminal.dispose();
    }
    this.terminals.clear();
  }

  private isTerminalActive(terminal: vscode.Terminal): boolean {
    // Check if terminal still exists in VS Code's terminal list
    return vscode.window.terminals.includes(terminal);
  }

  getTerminalCount(): number {
    return this.getActiveTerminals().length;
  }

  async showTerminalSelection(): Promise<vscode.Terminal | undefined> {
    const activeTerminals = this.getActiveTerminals();

    if (activeTerminals.length === 0) {
      vscode.window.showInformationMessage("No active Claude terminals found");
      return undefined;
    }

    if (activeTerminals.length === 1) {
      activeTerminals[0]?.show();
      return activeTerminals[0];
    }

    const items = activeTerminals.map((terminal) => ({
      label: terminal.name,
      terminal,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: "Select terminal to show",
    });

    if (selected) {
      selected.terminal.show();
      return selected.terminal;
    }

    return undefined;
  }

  buildClaudeCommand(
    model: string,
    task?: string,
    options?: {
      allowAllTools?: boolean;
      outputFormat?: string;
      maxTurns?: number;
      verbose?: boolean;
    },
  ): string {
    const args: string[] = ["claude"];

    if (task) {
      args.push("-p", `"${task}"`);
    }

    args.push("--model", model);

    if (options?.outputFormat && options.outputFormat !== "text") {
      args.push("--output-format", options.outputFormat);
    }

    if (options?.maxTurns && options.maxTurns !== 10) {
      args.push("--max-turns", options.maxTurns.toString());
    }

    if (options?.verbose) {
      args.push("--verbose");
    }

    if (options?.allowAllTools) {
      args.push("--dangerously-skip-permissions");
    }

    return args.join(" ");
  }
}
