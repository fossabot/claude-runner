import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Detect the current parallel tasks count configuration at startup
 * This is called once during extension initialization to avoid repeated checks
 */
export async function detectParallelTasksCount(): Promise<number> {
  try {
    const { stdout } = await execAsync(
      "claude config get --global parallelTasksCount",
      { timeout: 3000 },
    );
    const n = parseInt(stdout.trim(), 10);
    return Number.isFinite(n) && n >= 1 && n <= 8 ? n : 1;
  } catch {
    return 1; // safe fallback, no re-tries
  }
}
