# Changelog

All notable changes to the Claude Runner extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2025-05-28

### Added

- **Pipeline System**: Define and execute reusable task sequences
  - Save task chains as named pipelines
  - Load and modify existing pipelines
  - Per-task model selection for optimization
  - Session continuity between tasks
  - Task dependencies and execution order
  - Real-time progress tracking with status updates
  - Comprehensive execution logging
- **Task Improvements**:
  - Fixed task state management (pending → running → completed)
  - Live task status updates during execution
  - Immediate result display after task completion
  - Task naming for better organization
  - Model selection per task
- **UI Enhancements**:
  - Pipeline save dialog with name and description
  - Pipeline load dropdown with available pipelines
  - Per-task model selection dropdown
  - Task name input fields
  - Improved task progress visualization
  - Pipeline execution progress section
- **Logging System**:
  - Automatic logging of all pipeline executions
  - Detailed metrics per task (timing, status, results)
  - Session tracking for debugging
  - JSON format for programmatic access

### Fixed

- Task status not updating during execution
- Tasks staying in "pending" state until all complete
- Missing task state propagation to UI

### Technical

- New PipelineService for pipeline management
- Enhanced TaskItem interface with pipeline fields
- Improved message handling in webview
- Added pipeline-specific styles
- Example pipelines in `examples/` directory

## [0.1.0] - 2025-05-26

### Added

- Initial release of Claude Runner extension
- Model selection dropdown supporting all current Claude models:
  - Claude Opus 4 (most capable, highest cost)
  - Claude Sonnet 4 (balanced performance and cost)
  - Claude Sonnet 3.7 (good performance, moderate cost)
  - Claude Haiku 3.5 (fastest, lowest cost)
- Interactive mode: Launch Claude in terminal for conversational AI assistance
- Task mode: Execute specific prompts and view results in new editor
- Smart path management with workspace folder integration
- Tool permission control with safety settings
- Root path configuration with browse dialog
- VS Code settings integration
- Command palette integration
- Status notifications and error handling
- Loading states and progress indicators
- Automatic Claude Code CLI installation detection

### Features

- **Interactive Mode**: Opens terminal with Claude ready for conversation
- **Task Mode**: Runs specific tasks and displays results
- **Model Selection**: Easy switching between all available Claude models
- **Path Management**: Automatic workspace detection with custom path override
- **Tool Safety**: Configurable tool permissions with warning indicators
- **Settings Persistence**: User preferences saved in VS Code settings
- **CLI Integration**: Seamless integration with Claude Code CLI
- **Error Handling**: Comprehensive error detection and user-friendly messages

### Technical

- Built with TypeScript for type safety
- Vanilla JavaScript webview for maximum compatibility
- Service-oriented architecture for maintainability
- Comprehensive webpack build configuration
- ESLint and TypeScript strict mode compliance
- Makefile-based build system
- VS Code Extension API best practices

### Documentation

- Comprehensive README with usage instructions
- Architecture documentation in CLAUDE.md
- Workflow planning documentation
- Inline code documentation
- Build and development instructions

[Unreleased]: https://github.com/codingworkflow/claude-runner/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/codingworkflow/claude-runner/releases/tag/v0.1.0
