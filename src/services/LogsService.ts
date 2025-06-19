import { readFile, readdir } from "fs/promises";
import { homedir } from "os";
import path from "path";
import { glob } from "glob";

// Types based on claude-code-log models
export interface UsageInfo {
  input_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  output_tokens: number;
  service_tier?: string;
}

export interface TextContent {
  type: "text";
  text: string;
}

export interface ToolUseContent {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultContent {
  type: "tool_result";
  tool_use_id: string;
  content: string | Record<string, unknown>[];
  is_error?: boolean;
}

export interface ThinkingContent {
  type: "thinking";
  thinking: string;
  signature?: string;
}

export interface ImageContent {
  type: "image";
  source: {
    type: "base64";
    media_type: string;
    data: string;
  };
}

export type ContentItem =
  | TextContent
  | ToolUseContent
  | ToolResultContent
  | ThinkingContent
  | ImageContent;

export interface UserMessage {
  role: "user";
  content: string | ContentItem[];
}

export interface AssistantMessage {
  id: string;
  type: "message";
  role: "assistant";
  model: string;
  content: ContentItem[];
  stop_reason?: string;
  stop_sequence?: string;
  usage?: UsageInfo;
}

export interface BaseTranscriptEntry {
  parentUuid?: string;
  isSidechain: boolean;
  userType: string;
  cwd: string;
  sessionId: string;
  version: string;
  uuid: string;
  timestamp: string;
  isMeta?: boolean;
}

export interface UserTranscriptEntry extends BaseTranscriptEntry {
  type: "user";
  message: UserMessage;
  toolUseResult?: string | Record<string, unknown>;
}

export interface AssistantTranscriptEntry extends BaseTranscriptEntry {
  type: "assistant";
  message: AssistantMessage;
  requestId?: string;
}

export interface SummaryTranscriptEntry {
  type: "summary";
  summary: string;
  leafUuid: string;
  timestamp?: string; // Summary entries may not have timestamps
}

export type TranscriptEntry =
  | UserTranscriptEntry
  | AssistantTranscriptEntry
  | SummaryTranscriptEntry;

export interface ProjectInfo {
  name: string;
  path: string;
  conversationCount: number;
  lastModified: Date;
}

export interface ConversationInfo {
  id: string;
  sessionId: string;
  fileName: string;
  firstTimestamp: string;
  lastTimestamp: string;
  messageCount: number;
  summary?: string;
  filePath: string;
}

export interface ConversationData {
  info: ConversationInfo;
  entries: TranscriptEntry[];
}

export class LogsService {
  private cachedProjects: ProjectInfo[] | null = null;
  private cacheTime: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor() {}

  private getDefaultClaudePath(): string {
    return path.join(homedir(), ".claude", "projects");
  }

  public async listProjects(): Promise<ProjectInfo[]> {
    const now = Date.now();

    // Return cached projects if still valid
    if (this.cachedProjects && now - this.cacheTime < this.CACHE_DURATION) {
      return this.cachedProjects;
    }

    try {
      const claudeProjectsPath = this.getDefaultClaudePath();
      const entries = await readdir(claudeProjectsPath, {
        withFileTypes: true,
      });

      const projects: ProjectInfo[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const projectPath = path.join(claudeProjectsPath, entry.name);

          try {
            // Count JSONL files in the project directory
            const jsonlFiles = await glob("*.jsonl", { cwd: projectPath });

            if (jsonlFiles.length > 0) {
              // Get the most recent modification time
              let lastModified = new Date(0);
              for (const file of jsonlFiles) {
                const filePath = path.join(projectPath, file);
                try {
                  const stat = await readFile(filePath).then(() => new Date());
                  if (stat > lastModified) {
                    lastModified = stat;
                  }
                } catch {
                  // Skip files that can't be read
                }
              }

              projects.push({
                name: entry.name,
                path: projectPath,
                conversationCount: jsonlFiles.length,
                lastModified,
              });
            }
          } catch (error) {
            console.warn(`Failed to process project ${entry.name}:`, error);
          }
        }
      }

      // Sort by last modified date (newest first)
      projects.sort(
        (a, b) => b.lastModified.getTime() - a.lastModified.getTime(),
      );

      this.cachedProjects = projects;
      this.cacheTime = now;
      return projects;
    } catch (error) {
      console.error("Failed to list Claude projects:", error);
      return [];
    }
  }

  public async listConversations(
    projectName: string,
  ): Promise<ConversationInfo[]> {
    try {
      const claudeProjectsPath = this.getDefaultClaudePath();
      const projectPath = path.join(claudeProjectsPath, projectName);

      const jsonlFiles = await glob("*.jsonl", {
        cwd: projectPath,
        absolute: true,
      });
      const conversations: ConversationInfo[] = [];

      for (const filePath of jsonlFiles) {
        try {
          const fileName = path.basename(filePath, ".jsonl");
          const content = await readFile(filePath, "utf-8");
          const lines = content
            .trim()
            .split("\n")
            .filter((line) => line.length > 0);

          if (lines.length === 0) {
            continue;
          }

          let firstTimestamp = "";
          let lastTimestamp = "";
          let sessionId = "";
          let messageCount = 0;
          let summary = "";

          // Parse first and last entries to get timestamps and session info
          for (const line of lines) {
            try {
              const entry = JSON.parse(line) as TranscriptEntry;

              const entryTimestamp =
                "timestamp" in entry ? entry.timestamp : null;

              if (!firstTimestamp && entryTimestamp) {
                firstTimestamp = entryTimestamp;
              }

              if (entryTimestamp) {
                lastTimestamp = entryTimestamp;
              }

              if (!sessionId && "sessionId" in entry) {
                sessionId = entry.sessionId;
              }

              if (entry.type === "summary") {
                summary = entry.summary;
              }

              if (entry.type === "user" || entry.type === "assistant") {
                messageCount++;
              }
            } catch {
              // Skip invalid JSON lines
            }
          }

          if (firstTimestamp && sessionId) {
            conversations.push({
              id: fileName,
              sessionId,
              fileName,
              firstTimestamp,
              lastTimestamp: lastTimestamp || firstTimestamp,
              messageCount,
              summary,
              filePath,
            });
          }
        } catch (error) {
          console.warn(
            `Failed to process conversation file ${filePath}:`,
            error,
          );
        }
      }

      // Sort by first timestamp (newest first)
      conversations.sort(
        (a, b) =>
          new Date(b.firstTimestamp).getTime() -
          new Date(a.firstTimestamp).getTime(),
      );

      return conversations;
    } catch (error) {
      console.error(
        `Failed to list conversations for project ${projectName}:`,
        error,
      );
      return [];
    }
  }

  public async loadConversation(
    filePath: string,
  ): Promise<ConversationData | null> {
    try {
      const content = await readFile(filePath, "utf-8");
      const lines = content
        .trim()
        .split("\n")
        .filter((line) => line.length > 0);

      const entries: TranscriptEntry[] = [];
      let conversationInfo: ConversationInfo | null = null;

      for (const line of lines) {
        try {
          const entry = JSON.parse(line) as TranscriptEntry;
          entries.push(entry);
        } catch (error) {
          console.warn("Failed to parse JSON line:", error);
        }
      }

      if (entries.length === 0) {
        return null;
      }

      // Extract conversation info
      const fileName = path.basename(filePath, ".jsonl");
      const firstEntry = entries.find((e) => "timestamp" in e && e.timestamp);
      const lastEntry = entries
        .slice()
        .reverse()
        .find((e) => "timestamp" in e && e.timestamp);
      const summaryEntry = entries.find((e) => e.type === "summary") as
        | SummaryTranscriptEntry
        | undefined;
      const messageCount = entries.filter(
        (e) => e.type === "user" || e.type === "assistant",
      ).length;

      if (
        firstEntry &&
        "sessionId" in firstEntry &&
        "timestamp" in firstEntry &&
        firstEntry.timestamp
      ) {
        const lastTimestamp =
          lastEntry && "timestamp" in lastEntry
            ? lastEntry.timestamp
            : firstEntry.timestamp;
        conversationInfo = {
          id: fileName,
          sessionId: firstEntry.sessionId,
          fileName,
          firstTimestamp: firstEntry.timestamp,
          lastTimestamp: lastTimestamp ?? firstEntry.timestamp,
          messageCount,
          summary: summaryEntry?.summary,
          filePath,
        };
      }

      if (!conversationInfo) {
        return null;
      }

      return {
        info: conversationInfo,
        entries: entries.sort((a, b) => {
          const aTime = "timestamp" in a ? a.timestamp : null;
          const bTime = "timestamp" in b ? b.timestamp : null;
          if (!aTime || !bTime) {
            return 0;
          }
          return new Date(aTime).getTime() - new Date(bTime).getTime();
        }),
      };
    } catch (error) {
      console.error(`Failed to load conversation ${filePath}:`, error);
      return null;
    }
  }

  public clearCache(): void {
    this.cachedProjects = null;
    this.cacheTime = 0;
  }

  public formatTimestamp(timestamp: string): string {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch {
      return timestamp;
    }
  }

  public formatDate(timestamp: string): string {
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString();
    } catch {
      return timestamp;
    }
  }

  public formatTime(timestamp: string): string {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString();
    } catch {
      return timestamp;
    }
  }
}
