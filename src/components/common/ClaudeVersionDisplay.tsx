import React from "react";

interface ClaudeVersionDisplayProps {
  version: string;
  isAvailable: boolean;
  error?: string;
  isLoading?: boolean;
}

const ClaudeVersionDisplay: React.FC<ClaudeVersionDisplayProps> = ({
  version,
  isAvailable,
  error,
  isLoading = false,
}) => {
  return (
    <div className="claude-version-display">
      <div className="version-header">
        <span className="version-label">Claude Code:</span>
        {isLoading ? (
          <span className="version-loading">Checking...</span>
        ) : isAvailable ? (
          <span className="version-value">{version}</span>
        ) : (
          <span className="version-error">Not Available</span>
        )}
      </div>

      {error && !isLoading && (
        <div className="version-error-details">
          <span className="error-text">{error}</span>
        </div>
      )}
    </div>
  );
};

export default React.memo(ClaudeVersionDisplay);
