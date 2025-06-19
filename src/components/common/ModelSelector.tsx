import React from "react";
import { AVAILABLE_MODELS } from "../../models/ClaudeModels";

interface ModelSelectorProps {
  model: string;
  onUpdateModel: (model: string) => void;
  disabled?: boolean;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  model,
  onUpdateModel,
  disabled = false,
}) => {
  const models = AVAILABLE_MODELS.map((m) => ({
    value: m.id,
    label: m.name,
  }));

  return (
    <div className="input-group">
      <label htmlFor="model-select">Claude Model</label>
      <select
        id="model-select"
        value={model}
        onChange={(e) => onUpdateModel(e.target.value)}
        className="model-select"
        disabled={disabled}
      >
        {models.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ModelSelector;
