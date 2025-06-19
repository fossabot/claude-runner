#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const inputFile = path.join(__dirname, "..", "assets", "logo.png");
const outputDir = path.join(__dirname, "..", "assets");

// VSCode extension icon requirements
const iconSizes = [
  { size: 128, filename: "icon.png" }, // Main extension icon (VSCode marketplace)
  { size: 32, filename: "icon-32.png" }, // Small icon for activity bar
  { size: 16, filename: "icon-16.png" }, // Very small icon
];

function checkImageMagick() {
  try {
    execSync("magick --version", { stdio: "ignore" });
    return "magick";
  } catch {
    try {
      execSync("convert --version", { stdio: "ignore" });
      return "convert";
    } catch {
      console.error("❌ ImageMagick not found. Please install ImageMagick:");
      console.error("  - macOS: brew install imagemagick");
      console.error("  - Ubuntu/Debian: sudo apt-get install imagemagick");
      console.error(
        "  - Windows: Download from https://imagemagick.org/script/download.php#windows",
      );
      process.exit(1);
    }
  }
}

function checkInputFile() {
  if (!fs.existsSync(inputFile)) {
    console.error(`❌ Input file not found: ${inputFile}`);
    process.exit(1);
  }
  console.log(`✅ Found input file: ${inputFile}`);
}

function generateIcons() {
  const magickCommand = checkImageMagick();
  console.log(`✅ Using ImageMagick command: ${magickCommand}`);

  checkInputFile();

  console.log("\n🔄 Generating VSCode extension icons...\n");

  iconSizes.forEach(({ size, filename }) => {
    const outputFile = path.join(outputDir, filename);
    const command = `${magickCommand} "${inputFile}" -resize ${size}x${size} "${outputFile}"`;

    try {
      console.log(`📐 Generating ${filename} (${size}x${size})...`);
      execSync(command, { stdio: "pipe" });

      if (fs.existsSync(outputFile)) {
        const stats = fs.statSync(outputFile);
        console.log(
          `   ✅ Created: ${filename} (${(stats.size / 1024).toFixed(1)}KB)`,
        );
      } else {
        console.log(`   ❌ Failed to create: ${filename}`);
      }
    } catch (error) {
      console.error(`   ❌ Error generating ${filename}:`, error.message);
    }
  });

  console.log("\n✅ Icon generation complete!\n");

  // List all generated files
  console.log("📁 Generated files:");
  iconSizes.forEach(({ filename }) => {
    const filePath = path.join(outputDir, filename);
    if (fs.existsSync(filePath)) {
      console.log(`   - assets/${filename}`);
    }
  });

  console.log("\n💡 Next steps:");
  console.log("   1. Verify the generated icons look correct");
  console.log('   2. Update package.json with "icon": "assets/icon.png"');
  console.log("   3. Build and test your extension");
}

if (require.main === module) {
  generateIcons();
}

module.exports = { generateIcons };
