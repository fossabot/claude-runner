import React from "react";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
  className = "",
}) => {
  const handleToggle = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  return (
    <div className={`toggle-container ${className}`}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`toggle-switch ${checked ? "checked" : ""} ${disabled ? "disabled" : ""}`}
        aria-pressed={checked}
        aria-label={label ?? "Toggle"}
      >
        <span className="toggle-slider" />
      </button>
      {label && (
        <span className={`toggle-label ${disabled ? "disabled" : ""}`}>
          {label}
        </span>
      )}
    </div>
  );
};

export default Toggle;
