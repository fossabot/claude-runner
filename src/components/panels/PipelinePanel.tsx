import React, { useState } from "react";
import Button from "../common/Button";
import PathSelector from "../common/PathSelector";
import { getModelIds, DEFAULT_MODEL } from "../../models/ClaudeModels";

interface TaskItem {
  id: string;
  name?: string;
  prompt: string;
  resumePrevious: boolean;
  status: "pending" | "running" | "completed" | "error";
  results?: string;
  sessionId?: string;
  model?: string;
  dependsOn?: string[];
  continueFrom?: string | null;
}

interface PipelinePanelProps {
  onRunTasks: (tasks: TaskItem[], outputFormat: "text" | "json") => void;
  onCancelTasks: () => void;
  onSavePipeline?: (
    name: string,
    description: string,
    tasks: TaskItem[],
  ) => void;
  onLoadPipeline?: (name: string) => void;
  onPipelineAddTask: (newTask: TaskItem) => void;
  onPipelineRemoveTask: (taskId: string) => void;
  onPipelineUpdateTaskField: (
    taskId: string,
    field: keyof TaskItem,
    value: unknown,
  ) => void;
  availablePipelines?: string[];
  availableModels?: string[];
  defaultModel?: string;
  rootPath: string;
  outputFormat: "text" | "json";
  onOutputFormatChange?: (format: "text" | "json") => void;
  onUpdateRootPath: (path: string) => void;
  tasks?: TaskItem[];
  disabled: boolean;
  isTasksRunning: boolean;
  currentTaskIndex?: number;
}

const PipelinePanel: React.FC<PipelinePanelProps> = ({
  onRunTasks,
  onCancelTasks,
  onSavePipeline,
  onLoadPipeline,
  onPipelineAddTask,
  onPipelineRemoveTask,
  onPipelineUpdateTaskField,
  availablePipelines = [],
  availableModels = getModelIds(),
  defaultModel = DEFAULT_MODEL,
  rootPath,
  outputFormat,
  onOutputFormatChange: _onOutputFormatChange,
  onUpdateRootPath,
  tasks = [],
  disabled,
  isTasksRunning,
  currentTaskIndex,
}) => {
  const [showPipelineDialog, setShowPipelineDialog] = useState(false);
  const [pipelineName, setPipelineName] = useState("");
  const [pipelineDescription, setPipelineDescription] = useState("");
  const [selectedPipeline, setSelectedPipeline] = useState("");

  const addTask = () => {
    // Generate a unique task number based on existing task names
    const existingNumbers = tasks
      .map((t) => {
        const match = t.name?.match(/^Task (\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => n > 0);

    const nextNumber =
      existingNumbers.length > 0
        ? Math.max(...existingNumbers) + 1
        : tasks.length + 1;

    const newTask: TaskItem = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `Task ${nextNumber}`,
      prompt: "",
      resumePrevious: false,
      status: "pending" as const,
      model: defaultModel,
    };
    onPipelineAddTask(newTask);
  };

  const handleSavePipeline = () => {
    if (pipelineName.trim() && onSavePipeline) {
      const validTasks = tasks.filter((task) => task.prompt.trim());
      onSavePipeline(
        pipelineName.trim(),
        pipelineDescription.trim(),
        validTasks,
      );
      setShowPipelineDialog(false);
      setPipelineName("");
      setPipelineDescription("");
    }
  };

  const handleLoadPipeline = () => {
    if (selectedPipeline && onLoadPipeline) {
      onLoadPipeline(selectedPipeline);
      setSelectedPipeline("");
    }
  };

  const removeTask = (taskId: string) => {
    if (tasks.length > 1) {
      onPipelineRemoveTask(taskId);
    }
  };

  const updateTask = (
    taskId: string,
    field: keyof TaskItem,
    value: string | boolean,
  ) => {
    onPipelineUpdateTaskField(taskId, field, value);
  };

  const handleRunTasks = () => {
    const validTasks = tasks.filter((task) => task.prompt.trim());
    if (validTasks.length > 0) {
      onRunTasks(validTasks, outputFormat);
    }
  };

  const canRunTasks =
    tasks.some((task) => task.prompt.trim()) && !isTasksRunning;

  return (
    <div className="space-y-4">
      {/* Root Path */}
      <PathSelector
        rootPath={rootPath}
        onUpdateRootPath={onUpdateRootPath}
        disabled={isTasksRunning}
      />

      {/* Pipeline Tasks */}
      <div className="tasks-container">
        {tasks.map((task, index) => (
          <div key={task.id} className="task-item">
            <div className="task-header">
              <input
                type="text"
                key={`${task.id}-name`}
                defaultValue={task.name ?? ""}
                onBlur={(e) => updateTask(task.id, "name", e.target.value)}
                className="task-name-input"
                placeholder={`Task ${index + 1}`}
                disabled={isTasksRunning}
              />
              {tasks.length > 1 && (
                <Button
                  variant="error"
                  size="sm"
                  onClick={() => removeTask(task.id)}
                  disabled={isTasksRunning}
                >
                  Remove
                </Button>
              )}
            </div>

            <div className="task-model-group">
              <label>Model:</label>
              <select
                value={task.model ?? defaultModel}
                onChange={(e) => updateTask(task.id, "model", e.target.value)}
                disabled={isTasksRunning}
                className="model-select"
              >
                {availableModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <textarea
                key={task.id}
                defaultValue={task.prompt}
                onBlur={(e) => updateTask(task.id, "prompt", e.target.value)}
                placeholder="Enter your task or prompt for Claude..."
                rows={3}
                className="task-textarea"
                disabled={isTasksRunning}
              />
            </div>

            {index > 0 && (
              <div className="checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={!!task.resumePrevious}
                    onChange={(e) =>
                      updateTask(task.id, "resumePrevious", e.target.checked)
                    }
                    disabled={isTasksRunning}
                  />
                  Resume previous session
                </label>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="task-controls">
        <div className="control-buttons">
          <Button
            variant="secondary"
            onClick={addTask}
            disabled={isTasksRunning}
          >
            Add Task
          </Button>

          {isTasksRunning ? (
            <Button variant="error" onClick={onCancelTasks} disabled={disabled}>
              Cancel Pipeline
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleRunTasks}
              disabled={disabled || !canRunTasks}
            >
              Run Pipeline
            </Button>
          )}
        </div>

        {!isTasksRunning && (
          <div className="save-pipeline-controls" style={{ marginTop: "24px" }}>
            <Button
              variant="secondary"
              onClick={() => setShowPipelineDialog(true)}
              disabled={disabled || !canRunTasks}
            >
              Save as Pipeline
            </Button>
          </div>
        )}

        {availablePipelines.length > 0 && !isTasksRunning && (
          <div className="pipeline-controls">
            <select
              value={selectedPipeline}
              onChange={(e) => setSelectedPipeline(e.target.value)}
              className="pipeline-select"
            >
              <option value="">Select a pipeline...</option>
              {availablePipelines.map((pipeline) => (
                <option key={pipeline} value={pipeline}>
                  {pipeline}
                </option>
              ))}
            </select>
            <Button
              variant="secondary"
              onClick={handleLoadPipeline}
              disabled={!selectedPipeline}
            >
              Load Pipeline
            </Button>
          </div>
        )}
      </div>

      {showPipelineDialog && (
        <div className="pipeline-dialog-overlay">
          <div className="pipeline-dialog">
            <h3>Save Pipeline</h3>
            <div className="dialog-content">
              <div className="input-group">
                <label>Pipeline Name:</label>
                <input
                  type="text"
                  value={pipelineName}
                  onChange={(e) => setPipelineName(e.target.value)}
                  placeholder="e.g., tests, build-and-deploy"
                  className="pipeline-name-input"
                />
              </div>
              <div className="input-group">
                <label>Description:</label>
                <textarea
                  value={pipelineDescription}
                  onChange={(e) => setPipelineDescription(e.target.value)}
                  placeholder="Describe what this pipeline does..."
                  rows={3}
                  className="pipeline-description-input"
                />
              </div>
            </div>
            <div className="dialog-actions">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowPipelineDialog(false);
                  setPipelineName("");
                  setPipelineDescription("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSavePipeline}
                disabled={!pipelineName.trim()}
              >
                Save Pipeline
              </Button>
            </div>
          </div>
        </div>
      )}

      {(isTasksRunning ||
        tasks.some((t) => t.status === "completed" || t.status === "error")) &&
        tasks.some((t) => t.prompt.trim().length > 0) && (
          <div className="pipeline-progress">
            <h4>Pipeline Progress</h4>
            {tasks.map((task, index) => {
              const isCurrentTask = currentTaskIndex === index;
              const hasContent = task.prompt.trim().length > 0;

              if (!hasContent) {
                return null;
              }

              return (
                <div
                  key={`progress-${task.id}`}
                  className={`progress-task ${isCurrentTask ? "current" : ""}`}
                >
                  <div className="progress-header">
                    <h5>
                      {(task.name ?? task.name === "")
                        ? task.name
                        : `Task ${index + 1}`}
                    </h5>
                    <div className="progress-status">
                      {task.status === "pending" && !isCurrentTask && (
                        <span className="status-badge status-pending">
                          ⏸️ Pending
                        </span>
                      )}
                      {(task.status === "running" ||
                        (isCurrentTask && isTasksRunning)) && (
                        <span className="status-badge status-running">
                          ⏳ Running...
                        </span>
                      )}
                      {task.status === "completed" && (
                        <span className="status-badge status-completed">
                          ✅ Completed
                        </span>
                      )}
                      {task.status === "error" && (
                        <span className="status-badge status-error">
                          ❌ Failed
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="progress-prompt">
                    <span className="prompt-preview">
                      {task.prompt.substring(0, 100)}
                      {task.prompt.length > 100 ? "..." : ""}
                    </span>
                  </div>

                  {task.results &&
                    (task.status === "completed" ||
                      task.status === "error") && (
                      <div className="progress-results">
                        <div className="results-header">
                          <h6>Output:</h6>
                        </div>
                        <div className="results-container">
                          <pre className="results-text">{task.results}</pre>
                        </div>
                      </div>
                    )}
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
};

export default React.memo(PipelinePanel);
