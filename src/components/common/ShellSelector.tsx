import React from "react";

interface ShellSelectorProps {
  shell: "auto" | "bash" | "zsh" | "fish" | "sh";
  onUpdateShell: (shell: "auto" | "bash" | "zsh" | "fish" | "sh") => void;
  disabled?: boolean;
}

const ShellSelector: React.FC<ShellSelectorProps> = ({
  shell,
  onUpdateShell,
  disabled = false,
}) => {
  const shells = [
    { value: "auto", label: "Auto (try multiple shells)" },
    { value: "bash", label: "Bash" },
    { value: "zsh", label: "Zsh" },
    { value: "fish", label: "Fish" },
    { value: "sh", label: "POSIX Shell (sh)" },
  ];

  return (
    <div className="form-group">
      <label htmlFor="shell-selector" className="form-label">
        Preferred Shell
      </label>
      <select
        id="shell-selector"
        value={shell}
        onChange={(e) => onUpdateShell(e.target.value as typeof shell)}
        disabled={disabled}
        className="form-select"
      >
        {shells.map((shellOption) => (
          <option key={shellOption.value} value={shellOption.value}>
            {shellOption.label}
          </option>
        ))}
      </select>
      <div className="help-text">
        Choose which shell to use for Claude CLI detection. Auto mode tries
        multiple shells for better compatibility.
      </div>
    </div>
  );
};

export default ShellSelector;
