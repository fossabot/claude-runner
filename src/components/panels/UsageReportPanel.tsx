import React, { useState, useEffect, useRef } from "react";
import Card from "../common/Card";
import { useVSCodeAPI } from "../hooks/useVSCodeAPI";

interface UsageReportPanelProps {
  disabled?: boolean;
}

type Period = "today" | "week" | "month";

interface UsageReport {
  date: string;
  models: string[];
  inputTokens: number;
  outputTokens: number;
  cacheCreateTokens: number;
  cacheReadTokens: number;
  totalTokens: number;
  costUSD: number;
}

interface PeriodUsageReport {
  period: Period;
  startDate: string;
  endDate: string;
  dailyReports: UsageReport[];
  totals: Omit<UsageReport, "date" | "models"> & { models: string[] };
}

const UsageReportPanel: React.FC<UsageReportPanelProps> = ({
  disabled = false,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("today");
  const [report, setReport] = useState<PeriodUsageReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { requestUsageReport } = useVSCodeAPI();

  const loadReport = (period: Period) => {
    setLoading(true);
    setError(null);

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    requestUsageReport(period);

    // Add timeout to handle cases where extension doesn't respond
    timeoutRef.current = setTimeout(() => {
      setLoading(false);
      setError("Request timed out. Please try again.");
    }, 30000); // 30 second timeout
  };

  useEffect(() => {
    loadReport(selectedPeriod);
  }, [selectedPeriod]);

  // Listen for usage report data from extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      if (message.command === "usageReportData") {
        // Clear timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        setLoading(false);
        setReport(message.data);
        setError(null);
      } else if (message.command === "usageReportError") {
        // Clear timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        setLoading(false);
        setError(message.error || "Failed to load usage report");
        setReport(null);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  const formatCurrency = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
  };

  const getPeriodLabel = (period: Period): string => {
    switch (period) {
      case "today":
        return "Today";
      case "week":
        return "Last 7 Days";
      case "month":
        return "Last 30 Days";
    }
  };

  return (
    <div className="usage-report-panel">
      <Card>
        <div className="usage-report-header">
          <h3>Usage Report</h3>

          <div className="period-selector">
            <label htmlFor="period-select">Period:</label>
            <select
              id="period-select"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as Period)}
              disabled={disabled || loading}
              className="dropdown"
            >
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>
        </div>

        {loading && (
          <div className="state-message loading">
            <p>Loading usage data...</p>
          </div>
        )}

        {error && (
          <div className="state-message error">
            <p className="error-message">Error: {error}</p>
            <button
              onClick={() => loadReport(selectedPeriod)}
              disabled={disabled}
              className="button primary"
            >
              Retry
            </button>
          </div>
        )}

        {report && !loading && (
          <div className="usage-report-content">
            <div className="report-summary">
              <h4>{getPeriodLabel(selectedPeriod)} Summary</h4>
              <p className="date-range">
                {report.startDate} to {report.endDate}
              </p>
            </div>

            <div className="usage-totals">
              <div className="total-row">
                <span className="label">Models Used:</span>
                <span className="value">
                  {report.totals.models.length > 0
                    ? report.totals.models.join(", ")
                    : "None"}
                </span>
              </div>

              <div className="total-row">
                <span className="label">Input Tokens:</span>
                <span className="value">
                  {formatNumber(report.totals.inputTokens)}
                </span>
              </div>

              <div className="total-row">
                <span className="label">Output Tokens:</span>
                <span className="value">
                  {formatNumber(report.totals.outputTokens)}
                </span>
              </div>

              <div className="total-row">
                <span className="label">Cache Create:</span>
                <span className="value">
                  {formatNumber(report.totals.cacheCreateTokens)}
                </span>
              </div>

              <div className="total-row">
                <span className="label">Cache Read:</span>
                <span className="value">
                  {formatNumber(report.totals.cacheReadTokens)}
                </span>
              </div>

              <div className="total-row total-tokens">
                <span className="label">Total Tokens:</span>
                <span className="value">
                  {formatNumber(report.totals.totalTokens)}
                </span>
              </div>

              <div className="total-row total-cost">
                <span className="label">Total Cost:</span>
                <span className="value cost">
                  {formatCurrency(report.totals.costUSD)}
                </span>
              </div>
            </div>

            {report.dailyReports.length > 0 && (
              <div className="daily-breakdown">
                <h4>Daily Breakdown</h4>
                <div className="daily-list">
                  {report.dailyReports.map((dailyReport) => (
                    <div key={dailyReport.date} className="daily-item">
                      <div className="daily-header">
                        <span className="daily-date">{dailyReport.date}</span>
                        <span className="daily-cost">
                          {formatCurrency(dailyReport.costUSD)}
                        </span>
                      </div>

                      <div className="daily-details">
                        <div className="daily-row">
                          <span className="daily-label">Models:</span>
                          <span className="daily-value">
                            {dailyReport.models.length > 0
                              ? dailyReport.models.join(", ")
                              : "None"}
                          </span>
                        </div>

                        <div className="daily-metrics">
                          <div className="metric">
                            <span className="metric-label">Input:</span>
                            <span className="metric-value">
                              {formatNumber(dailyReport.inputTokens)}
                            </span>
                          </div>
                          <div className="metric">
                            <span className="metric-label">Output:</span>
                            <span className="metric-value">
                              {formatNumber(dailyReport.outputTokens)}
                            </span>
                          </div>
                          <div className="metric">
                            <span className="metric-label">Cache C:</span>
                            <span className="metric-value">
                              {formatNumber(dailyReport.cacheCreateTokens)}
                            </span>
                          </div>
                          <div className="metric">
                            <span className="metric-label">Cache R:</span>
                            <span className="metric-value">
                              {formatNumber(dailyReport.cacheReadTokens)}
                            </span>
                          </div>
                        </div>

                        <div className="daily-total">
                          <span className="total-label">Total Tokens:</span>
                          <span className="total-value">
                            {formatNumber(dailyReport.totalTokens)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {report.dailyReports.length === 0 && (
              <div className="state-message no-data">
                <p>No usage data found for the selected period.</p>
                <p className="help-text">
                  Usage data is stored in <code>~/.claude/projects/</code>. Make
                  sure you have used Claude Code recently to see data here.
                </p>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default React.memo(UsageReportPanel);
