import { UsageReportService } from "../../src/services/UsageReportService";
import { readFile } from "fs/promises";
import { homedir } from "os";
import { glob } from "glob";

// Mock dependencies
jest.mock("fs/promises");
jest.mock("os");
jest.mock("glob");

const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;
const mockHomedir = homedir as jest.MockedFunction<typeof homedir>;
const mockGlob = glob as jest.MockedFunction<typeof glob>;

// Mock fetch
global.fetch = jest.fn();

describe("UsageReportService", () => {
  let service: UsageReportService;
  const mockHome = "/home/testuser";

  beforeEach(() => {
    service = new UsageReportService();
    jest.clearAllMocks();

    // Setup default mocks
    mockHomedir.mockReturnValue(mockHome);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        "claude-sonnet-4-20250514": {
          input_cost_per_token: 0.000003,
          output_cost_per_token: 0.000015,
          cache_creation_input_token_cost: 0.0000035,
          cache_read_input_token_cost: 0.0000003,
        },
        "claude-haiku-3-5-20241022": {
          input_cost_per_token: 0.0000008,
          output_cost_per_token: 0.000004,
        },
      }),
    });
  });

  describe("generateReport", () => {
    it("should generate empty report when no usage data exists", async () => {
      mockGlob.mockResolvedValue([]);

      const report = await service.generateReport("today");

      expect(report.period).toBe("today");
      expect(report.dailyReports).toHaveLength(0);
      expect(report.totals.inputTokens).toBe(0);
      expect(report.totals.outputTokens).toBe(0);
      expect(report.totals.totalTokens).toBe(0);
      expect(report.totals.costUSD).toBe(0);
      expect(report.totals.models).toHaveLength(0);
    });

    it("should generate today report with valid data", async () => {
      const today = new Date().toISOString().substring(0, 10);
      const mockUsageData = {
        timestamp: `${today}T10:00:00Z`,
        message: {
          usage: {
            input_tokens: 1000,
            output_tokens: 500,
            cache_creation_input_tokens: 100,
            cache_read_input_tokens: 200,
          },
          model: "claude-sonnet-4-20250514",
          id: "msg1",
        },
        requestId: "req1",
        costUSD: 0.01,
      };

      mockGlob.mockResolvedValue([
        "/home/testuser/.claude/projects/test/session1/usage.jsonl",
      ]);
      mockReadFile.mockResolvedValue(JSON.stringify(mockUsageData));

      const report = await service.generateReport("today");

      expect(report.period).toBe("today");
      expect(report.dailyReports).toHaveLength(1);
      expect(report.dailyReports[0].date).toBe(today);
      expect(report.dailyReports[0].inputTokens).toBe(1000);
      expect(report.dailyReports[0].outputTokens).toBe(500);
      expect(report.dailyReports[0].cacheCreateTokens).toBe(100);
      expect(report.dailyReports[0].cacheReadTokens).toBe(200);
      expect(report.dailyReports[0].totalTokens).toBe(1800);
      expect(report.dailyReports[0].models).toEqual([
        "claude-sonnet-4-20250514",
      ]);
      expect(report.dailyReports[0].costUSD).toBe(0.01);

      expect(report.totals.inputTokens).toBe(1000);
      expect(report.totals.outputTokens).toBe(500);
      expect(report.totals.totalTokens).toBe(1800);
      expect(report.totals.costUSD).toBe(0.01);
      expect(report.totals.models).toEqual(["claude-sonnet-4-20250514"]);
    });

    it("should generate week report with multiple days", async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);

      const todayStr = today.toISOString().substring(0, 10);
      const yesterdayStr = yesterday.toISOString().substring(0, 10);

      const mockUsageData = [
        {
          timestamp: `${todayStr}T10:00:00Z`,
          message: {
            usage: { input_tokens: 1000, output_tokens: 500 },
            model: "claude-sonnet-4-20250514",
            id: "msg1",
          },
          requestId: "req1",
          costUSD: 0.01,
        },
        {
          timestamp: `${yesterdayStr}T15:00:00Z`,
          message: {
            usage: { input_tokens: 800, output_tokens: 400 },
            model: "claude-haiku-3-5-20241022",
            id: "msg2",
          },
          requestId: "req2",
          costUSD: 0.005,
        },
      ];

      const jsonlContent = mockUsageData
        .map((data) => JSON.stringify(data))
        .join("\n");
      mockGlob.mockResolvedValue([
        "/home/testuser/.claude/projects/test/session1/usage.jsonl",
      ]);
      mockReadFile.mockResolvedValue(jsonlContent);

      const report = await service.generateReport("week");

      expect(report.period).toBe("week");
      expect(report.dailyReports).toHaveLength(2);
      expect(report.totals.inputTokens).toBe(1800);
      expect(report.totals.outputTokens).toBe(900);
      expect(report.totals.costUSD).toBe(0.015);
      expect(report.totals.models.sort()).toEqual([
        "claude-haiku-3-5-20241022",
        "claude-sonnet-4-20250514",
      ]);
    });

    it("should filter out synthetic models", async () => {
      const today = new Date().toISOString().substring(0, 10);
      const mockUsageData = [
        {
          timestamp: `${today}T10:00:00Z`,
          message: {
            usage: { input_tokens: 1000, output_tokens: 500 },
            model: "<synthetic>",
            id: "msg1",
          },
          requestId: "req1",
          costUSD: 0.01,
        },
        {
          timestamp: `${today}T11:00:00Z`,
          message: {
            usage: { input_tokens: 800, output_tokens: 400 },
            model: "claude-sonnet-4-20250514",
            id: "msg2",
          },
          requestId: "req2",
          costUSD: 0.005,
        },
      ];

      const jsonlContent = mockUsageData
        .map((data) => JSON.stringify(data))
        .join("\n");
      mockGlob.mockResolvedValue([
        "/home/testuser/.claude/projects/test/session1/usage.jsonl",
      ]);
      mockReadFile.mockResolvedValue(jsonlContent);

      const report = await service.generateReport("today");

      expect(report.totals.models).toEqual(["claude-sonnet-4-20250514"]);
      expect(report.dailyReports[0].models).toEqual([
        "claude-sonnet-4-20250514",
      ]);
    });

    it("should deduplicate entries with same message and request ID", async () => {
      const today = new Date().toISOString().substring(0, 10);
      const duplicateEntry = {
        timestamp: `${today}T10:00:00Z`,
        message: {
          usage: { input_tokens: 1000, output_tokens: 500 },
          model: "claude-sonnet-4-20250514",
          id: "msg1",
        },
        requestId: "req1",
        costUSD: 0.01,
      };

      const jsonlContent = `${JSON.stringify(duplicateEntry)}\n${JSON.stringify(duplicateEntry)}`;
      mockGlob.mockResolvedValue([
        "/home/testuser/.claude/projects/test/session1/usage.jsonl",
      ]);
      mockReadFile.mockResolvedValue(jsonlContent);

      const report = await service.generateReport("today");

      expect(report.dailyReports[0].inputTokens).toBe(1000); // Should only count once
      expect(report.dailyReports[0].costUSD).toBe(0.01); // Should only count once
    });

    it("should calculate costs when costUSD is missing", async () => {
      const today = new Date().toISOString().substring(0, 10);
      const mockUsageData = {
        timestamp: `${today}T10:00:00Z`,
        message: {
          usage: {
            input_tokens: 1000,
            output_tokens: 500,
            cache_creation_input_tokens: 100,
            cache_read_input_tokens: 200,
          },
          model: "claude-sonnet-4-20250514",
          id: "msg1",
        },
        requestId: "req1",
        // No costUSD field - should calculate from pricing
      };

      mockGlob.mockResolvedValue([
        "/home/testuser/.claude/projects/test/session1/usage.jsonl",
      ]);
      mockReadFile.mockResolvedValue(JSON.stringify(mockUsageData));

      const report = await service.generateReport("today");

      // Expected cost calculation:
      // input: 1000 * 0.000003 = 0.003
      // output: 500 * 0.000015 = 0.0075
      // cache_creation: 100 * 0.0000035 = 0.00035
      // cache_read: 200 * 0.0000003 = 0.00006
      // total = 0.01091
      expect(report.dailyReports[0].costUSD).toBeCloseTo(0.01091, 5);
    });

    it("should skip invalid JSON lines", async () => {
      const today = new Date().toISOString().substring(0, 10);
      const validEntry = {
        timestamp: `${today}T10:00:00Z`,
        message: {
          usage: { input_tokens: 1000, output_tokens: 500 },
          model: "claude-sonnet-4-20250514",
          id: "msg1",
        },
        requestId: "req1",
        costUSD: 0.01,
      };

      const jsonlContent = `${JSON.stringify(validEntry)}\ninvalid json line\n{"incomplete":`;
      mockGlob.mockResolvedValue([
        "/home/testuser/.claude/projects/test/session1/usage.jsonl",
      ]);
      mockReadFile.mockResolvedValue(jsonlContent);

      const report = await service.generateReport("today");

      expect(report.dailyReports).toHaveLength(1);
      expect(report.dailyReports[0].inputTokens).toBe(1000);
    });

    it("should handle missing usage message gracefully", async () => {
      const today = new Date().toISOString().substring(0, 10);
      const invalidEntry = {
        timestamp: `${today}T10:00:00Z`,
        // Missing message.usage
        message: {
          model: "claude-sonnet-4-20250514",
          id: "msg1",
        },
        requestId: "req1",
      };

      mockGlob.mockResolvedValue([
        "/home/testuser/.claude/projects/test/session1/usage.jsonl",
      ]);
      mockReadFile.mockResolvedValue(JSON.stringify(invalidEntry));

      const report = await service.generateReport("today");

      expect(report.dailyReports).toHaveLength(0);
      expect(report.totals.inputTokens).toBe(0);
    });

    it("should handle file read errors gracefully", async () => {
      mockGlob.mockResolvedValue([
        "/home/testuser/.claude/projects/test/session1/usage.jsonl",
      ]);
      mockReadFile.mockRejectedValue(new Error("Permission denied"));

      const report = await service.generateReport("today");

      expect(report.dailyReports).toHaveLength(0);
      expect(report.totals.inputTokens).toBe(0);
    });

    it("should handle pricing fetch errors gracefully", async () => {
      const today = new Date().toISOString().substring(0, 10);
      const mockUsageData = {
        timestamp: `${today}T10:00:00Z`,
        message: {
          usage: { input_tokens: 1000, output_tokens: 500 },
          model: "claude-sonnet-4-20250514",
          id: "msg1",
        },
        requestId: "req1",
        // No costUSD - will try to calculate but pricing fetch will fail
      };

      (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));
      mockGlob.mockResolvedValue([
        "/home/testuser/.claude/projects/test/session1/usage.jsonl",
      ]);
      mockReadFile.mockResolvedValue(JSON.stringify(mockUsageData));

      const report = await service.generateReport("today");

      expect(report.dailyReports).toHaveLength(1);
      expect(report.dailyReports[0].costUSD).toBe(0); // Should fallback to 0 when pricing unavailable
    });

    it("should filter entries by date range correctly", async () => {
      const today = new Date();
      const oldDate = new Date(today);
      oldDate.setDate(today.getDate() - 40); // Outside month range

      const todayStr = today.toISOString().substring(0, 10);
      const oldDateStr = oldDate.toISOString().substring(0, 10);

      const mockUsageData = [
        {
          timestamp: `${todayStr}T10:00:00Z`,
          message: {
            usage: { input_tokens: 1000, output_tokens: 500 },
            model: "claude-sonnet-4-20250514",
            id: "msg1",
          },
          requestId: "req1",
          costUSD: 0.01,
        },
        {
          timestamp: `${oldDateStr}T10:00:00Z`,
          message: {
            usage: { input_tokens: 800, output_tokens: 400 },
            model: "claude-sonnet-4-20250514",
            id: "msg2",
          },
          requestId: "req2",
          costUSD: 0.005,
        },
      ];

      const jsonlContent = mockUsageData
        .map((data) => JSON.stringify(data))
        .join("\n");
      mockGlob.mockResolvedValue([
        "/home/testuser/.claude/projects/test/session1/usage.jsonl",
      ]);
      mockReadFile.mockResolvedValue(jsonlContent);

      const report = await service.generateReport("month");

      // Should only include today's entry, not the 40-day-old entry
      expect(report.dailyReports).toHaveLength(1);
      expect(report.dailyReports[0].date).toBe(todayStr);
      expect(report.totals.inputTokens).toBe(1000);
    });
  });

  describe("error handling", () => {
    it("should throw meaningful error when glob fails", async () => {
      mockGlob.mockRejectedValue(new Error("Directory not found"));

      await expect(service.generateReport("today")).rejects.toThrow(
        "Directory not found",
      );
    });

    it("should handle empty files correctly", async () => {
      mockGlob.mockResolvedValue([
        "/home/testuser/.claude/projects/test/session1/usage.jsonl",
      ]);
      mockReadFile.mockResolvedValue("");

      const report = await service.generateReport("today");

      expect(report.dailyReports).toHaveLength(0);
      expect(report.totals.inputTokens).toBe(0);
    });

    it("should handle files with only whitespace", async () => {
      mockGlob.mockResolvedValue([
        "/home/testuser/.claude/projects/test/session1/usage.jsonl",
      ]);
      mockReadFile.mockResolvedValue("   \n\n  \n   ");

      const report = await service.generateReport("today");

      expect(report.dailyReports).toHaveLength(0);
      expect(report.totals.inputTokens).toBe(0);
    });
  });
});
