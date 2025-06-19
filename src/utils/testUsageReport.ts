import { UsageReportService } from "../services/UsageReportService";

/**
 * Test utility to verify usage report functionality
 * This can be called from the extension development console
 */
export async function testUsageReportGeneration(): Promise<void> {
  console.log("Testing UsageReportService...");

  try {
    const service = new UsageReportService();

    console.log("Testing today report...");
    const todayReport = await service.generateReport("today");
    console.log("Today report:", todayReport);

    console.log("Testing week report...");
    const weekReport = await service.generateReport("week");
    console.log("Week report:", weekReport);

    console.log("Testing month report...");
    const monthReport = await service.generateReport("month");
    console.log("Month report:", monthReport);

    console.log("All tests completed successfully!");
  } catch (error) {
    console.error("Error testing usage report:", error);
  }
}
