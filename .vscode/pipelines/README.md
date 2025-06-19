# Claude Runner Pipelines

This directory contains Claude Runner pipeline definitions for this project.

## Pipeline Structure

Each pipeline is a JSON file with the following structure:

- `version`: Pipeline format version
- `name`: Pipeline name
- `description`: What the pipeline does
- `tasks`: Array of tasks to execute
- `defaultConfig`: Default configuration for all tasks
- `execution`: Execution strategy settings

## Example Pipeline

```json
{
  "version": "1.0",
  "name": "my-pipeline",
  "description": "Example pipeline",
  "type": "claude-code",
  "tasks": [
    {
      "id": "task1",
      "name": "First Task",
      "prompt": "Your task prompt here",
      "model": null
    }
  ]
}
```

## Managing Pipelines

Pipelines in this directory are project-specific and can be:

- Committed to version control to share with your team
- Added to .gitignore if they contain sensitive information
- Copied between projects as needed

To ignore all pipelines, add to your .gitignore:

```
.vscode/pipelines/
```

To ignore specific pipelines:

```
.vscode/pipelines/secret-*.pipeline.json
```
