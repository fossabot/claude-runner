#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const versionPath = path.join(__dirname, "..", "VERSION");

function parseVersion(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(-[\w.-]+)?(\+[\w.-]+)?$/);
  if (!match) {
    throw new Error(`Invalid version format: ${version}`);
  }

  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4] || "",
    build: match[5] || "",
  };
}

function formatVersion(versionObj) {
  return `${versionObj.major}.${versionObj.minor}.${versionObj.patch}${versionObj.prerelease}${versionObj.build}`;
}

function bumpVersion(currentVersion, type) {
  const version = parseVersion(currentVersion);

  // Clear prerelease and build metadata when bumping
  version.prerelease = "";
  version.build = "";

  switch (type) {
    case "major":
      version.major += 1;
      version.minor = 0;
      version.patch = 0;
      break;
    case "minor":
      version.minor += 1;
      version.patch = 0;
      break;
    case "patch":
      version.patch += 1;
      break;
    default:
      throw new Error(
        `Invalid bump type: ${type}. Must be major, minor, or patch.`,
      );
  }

  return formatVersion(version);
}

// Main execution
const bumpType = process.argv[2];

if (!bumpType) {
  console.error("❌ Usage: node bump-version.js <major|minor|patch>");
  process.exit(1);
}

try {
  // Read current version
  const currentVersion = fs.readFileSync(versionPath, "utf8").trim();
  console.log(`📋 Current version: ${currentVersion}`);

  // Bump version
  const newVersion = bumpVersion(currentVersion, bumpType);
  console.log(`🚀 New version: ${newVersion}`);

  // Write new version
  fs.writeFileSync(versionPath, newVersion);
  console.log(`✅ Updated VERSION file to ${newVersion}`);

  // Sync to package.json
  const { execSync } = require("child_process");
  execSync("node scripts/sync-version.js", { stdio: "inherit" });
} catch (error) {
  console.error("❌ Error bumping version:", error.message);
  process.exit(1);
}
