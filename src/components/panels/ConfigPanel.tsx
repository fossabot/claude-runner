import React from "react";
import Card from "../common/Card";
import Input from "../common/Input";
import Toggle from "../common/Toggle";
import Button from "../common/Button";

interface ConfigPanelProps {
  model: string;
  rootPath: string;
  allowAllTools: boolean;
  onUpdateModel: (model: string) => void;
  onUpdateRootPath: (path: string) => void;
  onUpdateAllowAllTools: (allow: boolean) => void;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({
  model,
  rootPath,
  allowAllTools,
  onUpdateModel,
  onUpdateRootPath,
  onUpdateAllowAllTools,
}) => {
  const models = [
    { value: "claude-opus-4-20250514", label: "Claude Opus 4" },
    { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
    { value: "claude-3-7-sonnet-20250219", label: "Claude Sonnet 3.7" },
    { value: "claude-3-5-haiku-20241022", label: "Claude Haiku 3.5" },
  ];

  const handleBrowseFolder = () => {
    // This will be handled by the extension
    const vscode = (
      window as typeof window & {
        vscodeApi?: { postMessage: (message: Record<string, unknown>) => void };
      }
    ).vscodeApi;
    if (vscode) {
      vscode.postMessage({ command: "browseFolder" });
    }
  };

  return (
    <Card title="Configuration">
      <div className="space-y-4">
        {/* Model Selection */}
        <div className="input-group">
          <label htmlFor="model-select">Claude Model</label>
          <select
            id="model-select"
            value={model}
            onChange={(e) => onUpdateModel(e.target.value)}
            className="model-select"
          >
            {models.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Root Path */}
        <div className="input-group">
          <label htmlFor="root-path">Root Path</label>
          <div className="flex gap-2">
            <Input
              id="root-path"
              type="text"
              value={rootPath}
              onChange={(e) => onUpdateRootPath(e.target.value)}
              placeholder="Select working directory"
              fullWidth
            />
            <Button variant="secondary" size="sm" onClick={handleBrowseFolder}>
              Browse
            </Button>
          </div>
        </div>

        {/* Tool Permissions */}
        <div className="mt-4">
          <Toggle
            checked={allowAllTools}
            onChange={onUpdateAllowAllTools}
            label="Allow All Tools (--dangerously-skip-permissions)"
          />
        </div>
      </div>
    </Card>
  );
};

export default ConfigPanel;
