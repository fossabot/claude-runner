#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Common secret patterns to detect
const SECRET_PATTERNS = [
  {
    name: "API Key",
    pattern: /api[_-]?key[_-]?[=:\s]?['"]?[a-z0-9]{20,}/gi,
    severity: "high",
  },
  {
    name: "Bearer Token",
    pattern: /bearer\s+[a-z0-9\-_.~+/]+=*/gi,
    severity: "high",
  },
  {
    name: "JWT Token",
    pattern: /ey[a-z0-9]{10,}\.[a-z0-9\-_]{10,}\.[a-z0-9\-_.~+/]*/gi,
    severity: "high",
  },
  {
    name: "SonarQube Token",
    pattern: /sqp_[a-z0-9]{40}/gi,
    severity: "high",
  },
  {
    name: "GitHub Token",
    pattern: /gh[pousr]_[a-z0-9]{36}/gi,
    severity: "high",
  },
  {
    name: "AWS Access Key",
    pattern: /AKIA[0-9A-Z]{16}/g,
    severity: "high",
  },
  {
    name: "AWS Secret",
    pattern:
      /aws[_-]?secret[_-]?access[_-]?key[_-]?[=:\s]?['"]?[a-z0-9/+=]{40}/gi,
    severity: "high",
  },
  {
    name: "SSH Private Key",
    pattern: /-----BEGIN [A-Z]+ PRIVATE KEY-----/g,
    severity: "critical",
  },
  {
    name: "Generic Secret",
    pattern: /(secret|password|token|key)[_-]?[=:\s]?['"][a-z0-9]{16,}['"]/gi,
    severity: "medium",
  },
];

// Files and directories to ignore
const IGNORE_PATTERNS = [
  /node_modules/,
  /\.git/,
  /dist/,
  /out/,
  /coverage/,
  /\.vscode/,
  /\.husky/,
  /\.sonar/,
  /scripts\/scan-secrets\.js$/, // Ignore this file itself
  /\.min\.js$/,
  /\.map$/,
  /package-lock\.json$/,
  /yarn\.lock$/,
];

// File extensions to scan
const SCAN_EXTENSIONS = [
  ".js",
  ".ts",
  ".tsx",
  ".jsx",
  ".json",
  ".yml",
  ".yaml",
  ".env",
  ".config",
  ".conf",
  ".ini",
  ".properties",
  ".md",
  ".txt",
  ".sh",
  ".bash",
  ".zsh",
  ".fish",
];

function shouldIgnoreFile(filePath) {
  return IGNORE_PATTERNS.some((pattern) => pattern.test(filePath));
}

function shouldScanFile(filePath) {
  const ext = path.extname(filePath);
  const fileName = path.basename(filePath);

  // Always scan dotfiles that might contain secrets
  if (fileName.startsWith(".") && !fileName.startsWith(".git")) {
    return true;
  }

  return SCAN_EXTENSIONS.includes(ext);
}

function scanFileForSecrets(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const findings = [];

    for (const { name, pattern, severity } of SECRET_PATTERNS) {
      const matches = content.matchAll(pattern);

      for (const match of matches) {
        const lineNumber = content.substring(0, match.index).split("\n").length;
        const line = content.split("\n")[lineNumber - 1];

        // Skip if it's in a comment explaining patterns (like this file)
        if (
          line.trim().startsWith("//") ||
          line.trim().startsWith("*") ||
          line.trim().startsWith("#")
        ) {
          continue;
        }

        // Skip if it's in documentation context (README, CLAUDE.md, etc.)
        if (
          filePath.endsWith(".md") &&
          (line.includes("API Keys") ||
            line.includes("Bearer Tokens") ||
            line.includes("JWT Tokens") ||
            line.includes("Secret") ||
            line.includes("Token") ||
            line.includes("documentation") ||
            line.includes("example") ||
            line.includes("Example"))
        ) {
          continue;
        }

        findings.push({
          file: filePath,
          line: lineNumber,
          type: name,
          severity,
          match:
            match[0].substring(0, 50) + (match[0].length > 50 ? "..." : ""),
          lineContent: line.trim(),
        });
      }
    }

    return findings;
  } catch (error) {
    console.warn(`Warning: Could not scan ${filePath}: ${error.message}`);
    return [];
  }
}

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);

    if (shouldIgnoreFile(filePath)) {
      continue;
    }

    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList);
    } else if (shouldScanFile(filePath)) {
      fileList.push(filePath);
    }
  }

  return fileList;
}

function getStagedFiles() {
  try {
    const output = execSync("git diff --cached --name-only", {
      encoding: "utf8",
    });
    return output
      .trim()
      .split("\n")
      .filter((file) => file && fs.existsSync(file));
  } catch (error) {
    console.warn("Warning: Could not get staged files, scanning all files");
    return null;
  }
}

function main() {
  const isPreCommit = process.argv.includes("--pre-commit");
  const scanAll = process.argv.includes("--all");

  console.log("🔍 Scanning for secrets...");

  let filesToScan;

  if (isPreCommit && !scanAll) {
    // Pre-commit: only scan staged files
    filesToScan = getStagedFiles();
    if (!filesToScan) {
      filesToScan = getAllFiles(".");
    } else {
      filesToScan = filesToScan.filter(
        (file) => shouldScanFile(file) && !shouldIgnoreFile(file),
      );
    }
    console.log(`📋 Scanning ${filesToScan.length} staged files...`);
  } else {
    // Scan all files
    filesToScan = getAllFiles(".");
    console.log(`📋 Scanning ${filesToScan.length} files...`);
  }

  let totalFindings = [];

  for (const file of filesToScan) {
    const findings = scanFileForSecrets(file);
    totalFindings.push(...findings);
  }

  if (totalFindings.length === 0) {
    console.log("✅ No secrets detected");
    process.exit(0);
  }

  // Group findings by severity
  const critical = totalFindings.filter((f) => f.severity === "critical");
  const high = totalFindings.filter((f) => f.severity === "high");
  const medium = totalFindings.filter((f) => f.severity === "medium");

  console.log("\n❌ Potential secrets detected:");
  console.log("================================");

  const printFindings = (findings, severityLabel) => {
    if (findings.length === 0) return;

    console.log(`\n${severityLabel} (${findings.length} findings):`);
    for (const finding of findings) {
      console.log(`  📁 ${finding.file}:${finding.line}`);
      console.log(`     Type: ${finding.type}`);
      console.log(`     Match: ${finding.match}`);
      console.log(`     Line: ${finding.lineContent}`);
      console.log("");
    }
  };

  printFindings(critical, "🚨 CRITICAL");
  printFindings(high, "⚠️  HIGH");
  printFindings(medium, "⚡ MEDIUM");

  console.log("🛡️  Security recommendations:");
  console.log("  • Move secrets to environment variables");
  console.log("  • Use .env files (and add them to .gitignore)");
  console.log("  • Consider using secret management tools");
  console.log("  • Review the flagged content carefully");

  if (isPreCommit && (critical.length > 0 || high.length > 0)) {
    console.log("\n🚫 Commit blocked due to potential secrets");
    console.log("   Fix the issues above or use --no-verify to bypass");
    process.exit(1);
  }

  if (critical.length > 0 || high.length > 0) {
    process.exit(1);
  }

  console.log("\n⚠️  Medium severity findings detected but not blocking");
  process.exit(0);
}

if (require.main === module) {
  main();
}
