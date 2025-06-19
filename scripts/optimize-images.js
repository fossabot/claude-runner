#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const projectRoot = path.join(__dirname, "..");
const marketplaceDir = path.join(projectRoot, "assets", "marketplace");

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
      return null;
    }
  }
}

function optimizeImage(inputPath, outputPath, options = {}) {
  const magickCommand = checkImageMagick();
  if (!magickCommand) return false;

  const {
    maxWidth = 800,
    maxHeight = 600,
    quality = 85,
    strip = true,
    sharpen = false,
  } = options;

  let command = `${magickCommand} "${inputPath}"`;

  // Resize if needed
  command += ` -resize ${maxWidth}x${maxHeight}>`;

  // Set quality for compression
  command += ` -quality ${quality}`;

  // Strip metadata to reduce file size
  if (strip) {
    command += ` -strip`;
  }

  // Sharpen for better appearance at smaller sizes
  if (sharpen) {
    command += ` -unsharp 0x0.75+0.75+0.008`;
  }

  command += ` "${outputPath}"`;

  try {
    execSync(command, { stdio: "pipe" });
    return true;
  } catch (error) {
    console.error(
      `❌ Failed to optimize ${path.basename(inputPath)}:`,
      error.message,
    );
    return false;
  }
}

function optimizeMarketplaceImages() {
  console.log("🖼️  Optimizing marketplace images...\n");

  if (!fs.existsSync(marketplaceDir)) {
    console.error(
      '❌ Marketplace directory not found. Run "make prepare-marketplace" first.',
    );
    return;
  }

  const images = [
    {
      name: "conversation.png",
      options: { maxWidth: 800, maxHeight: 600, quality: 90, sharpen: true },
    },
    {
      name: "usage.png",
      options: { maxWidth: 600, maxHeight: 800, quality: 90, sharpen: true },
    },
    {
      name: "logs.png",
      options: { maxWidth: 600, maxHeight: 400, quality: 90, sharpen: true },
    },
  ];

  let optimized = 0;
  let totalSavings = 0;

  images.forEach(({ name, options }) => {
    const imagePath = path.join(marketplaceDir, name);

    if (!fs.existsSync(imagePath)) {
      console.warn(`⚠️  Image not found: ${name}`);
      return;
    }

    const originalStats = fs.statSync(imagePath);
    const originalSize = originalStats.size;

    // Create backup
    const backupPath = imagePath + ".backup";
    fs.copyFileSync(imagePath, backupPath);

    console.log(`📐 Optimizing ${name}...`);
    console.log(`   Original: ${(originalSize / 1024).toFixed(1)}KB`);

    if (optimizeImage(backupPath, imagePath, options)) {
      const newStats = fs.statSync(imagePath);
      const newSize = newStats.size;
      const savings = originalSize - newSize;
      const savingsPercent = ((savings / originalSize) * 100).toFixed(1);

      console.log(`   Optimized: ${(newSize / 1024).toFixed(1)}KB`);
      console.log(
        `   Saved: ${(savings / 1024).toFixed(1)}KB (${savingsPercent}%)`,
      );

      totalSavings += savings;
      optimized++;

      // Remove backup
      fs.unlinkSync(backupPath);
    } else {
      // Restore from backup if optimization failed
      fs.copyFileSync(backupPath, imagePath);
      fs.unlinkSync(backupPath);
    }

    console.log("");
  });

  console.log(`✅ Optimized ${optimized}/${images.length} images`);
  console.log(`💾 Total savings: ${(totalSavings / 1024).toFixed(1)}KB\n`);

  // Generate image information
  const imageInfo = images
    .map(({ name }) => {
      const imagePath = path.join(marketplaceDir, name);
      if (fs.existsSync(imagePath)) {
        const stats = fs.statSync(imagePath);
        return {
          name,
          size: stats.size,
          sizeKB: (stats.size / 1024).toFixed(1),
        };
      }
      return null;
    })
    .filter(Boolean);

  const infoPath = path.join(marketplaceDir, "image-info.json");
  fs.writeFileSync(infoPath, JSON.stringify(imageInfo, null, 2));
  console.log("📋 Generated image-info.json with optimization details");
}

function createImageReadme() {
  const imageReadme = `# Marketplace Images

This directory contains optimized screenshots for the VSCode Marketplace.

## Screenshots

### conversation.png
- **Purpose**: Shows the pipeline workflow and conversation interface
- **Optimal size**: 800x600px or smaller
- **Content**: Claude Runner's main interface with a conversation

### usage.png  
- **Purpose**: Demonstrates usage analytics and cost tracking
- **Optimal size**: 600x800px or smaller
- **Content**: Usage report panel showing token consumption and costs

### logs.png
- **Purpose**: Shows conversation history and log management
- **Optimal size**: 600x400px or smaller  
- **Content**: Logs panel with conversation list

## Image Guidelines

- **Format**: PNG with transparency support
- **Quality**: High quality but optimized for web
- **Size**: Keep under 500KB per image when possible
- **Content**: Show actual extension features, not mockups
- **Text**: Ensure text is readable at different sizes

## Optimization

Images are automatically optimized using ImageMagick:
- Resized to appropriate dimensions
- Compressed for smaller file sizes
- Sharpened for better appearance
- Metadata stripped for privacy

Run \`npm run optimize-images\` to re-optimize all images.
`;

  const readmePath = path.join(marketplaceDir, "README.md");
  fs.writeFileSync(readmePath, imageReadme);
  console.log("📚 Generated README.md for marketplace images");
}

function main() {
  console.log("🎨 Image Optimization for VSCode Marketplace\n");

  if (!checkImageMagick()) {
    process.exit(1);
  }

  optimizeMarketplaceImages();
  createImageReadme();

  console.log("\n✅ Image optimization complete!");
  console.log("\n💡 Tips for better marketplace images:");
  console.log("  - Use high contrast for better readability");
  console.log("  - Show actual features, not generic content");
  console.log("  - Ensure text is readable at thumbnail sizes");
  console.log("  - Keep file sizes reasonable (<500KB each)");
}

if (require.main === module) {
  main();
}

module.exports = { optimizeMarketplaceImages, optimizeImage };
