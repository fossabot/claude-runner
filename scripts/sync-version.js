#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Read version from VERSION file
const versionPath = path.join(__dirname, "..", "VERSION");
const packagePath = path.join(__dirname, "..", "package.json");

try {
  // Read current version
  const version = fs.readFileSync(versionPath, "utf8").trim();

  // Validate version format (basic semver check)
  if (!/^\d+\.\d+\.\d+(-[\w.-]+)?(\+[\w.-]+)?$/.test(version)) {
    console.error("❌ Invalid version format in VERSION file:", version);
    console.error("   Expected format: X.Y.Z (semver)");
    process.exit(1);
  }

  // Read package.json
  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));

  // Update version in package.json if different
  if (packageJson.version !== version) {
    packageJson.version = version;
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + "\n");
    console.log(`✅ Updated package.json version to ${version}`);
  } else {
    console.log(`✅ Version ${version} is already up to date`);
  }
} catch (error) {
  console.error("❌ Error syncing version:", error.message);
  process.exit(1);
}
