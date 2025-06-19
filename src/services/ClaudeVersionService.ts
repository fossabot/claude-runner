import { ShellDetection } from "../utils/ShellDetection";

export interface ClaudeVersionInfo {
  version: string;
  isAvailable: boolean;
  error?: string;
}

export class ClaudeVersionService {
  private cachedVersion: ClaudeVersionInfo | null = null;
  private cacheTime: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor() {}

  public async getVersion(
    forceRefresh: boolean = false,
  ): Promise<ClaudeVersionInfo> {
    const now = Date.now();

    // Return cached version if still valid and not forcing refresh
    if (
      forceRefresh !== true &&
      this.cachedVersion &&
      now - this.cacheTime < this.CACHE_DURATION
    ) {
      return this.cachedVersion;
    }

    try {
      const result = await ShellDetection.getClaudeVersion("auto");

      if (!result.success) {
        throw new Error(result.error ?? "Claude version command failed");
      }

      const output = result.output ?? "";

      // Parse version from output like "1.0.24 (Claude Code)"
      const versionMatch = output.match(/^(\d+\.\d+\.\d+)/);
      const version = versionMatch ? versionMatch[1] : output;

      this.cachedVersion = {
        version,
        isAvailable: true,
      };

      this.cacheTime = now;
      return this.cachedVersion;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      this.cachedVersion = {
        version: "Not Available",
        isAvailable: false,
        error: errorMessage,
      };

      this.cacheTime = now;
      return this.cachedVersion;
    }
  }

  public clearCache(): void {
    this.cachedVersion = null;
    this.cacheTime = 0;
  }

  /**
   * Refresh version information by forcing a new check
   * This is exposed for the "Re-check" button functionality
   */
  public async refreshVersion(): Promise<ClaudeVersionInfo> {
    return this.getVersion(true);
  }
}
