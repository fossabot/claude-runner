#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const projectRoot = path.join(__dirname, "..");
const assetsDir = path.join(projectRoot, "assets");
const marketplaceDir = path.join(assetsDir, "marketplace");
const docAssetsDir = path.join(projectRoot, "doc", "assets");
const vsixMdPath = path.join(projectRoot, "vsix.md");

function ensureMarketplaceAssets() {
  console.log("📦 Preparing marketplace assets...");

  // Ensure marketplace directory exists
  if (!fs.existsSync(marketplaceDir)) {
    fs.mkdirSync(marketplaceDir, { recursive: true });
    console.log("✅ Created marketplace assets directory");
  }

  // Copy screenshots to marketplace folder
  const screenshots = ["conversation.png", "logs.png", "usage.png"];

  screenshots.forEach((screenshot) => {
    const sourcePath = path.join(docAssetsDir, screenshot);
    const destPath = path.join(marketplaceDir, screenshot);

    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`✅ Copied ${screenshot} to marketplace assets`);
    } else {
      console.warn(`⚠️  Screenshot not found: ${screenshot}`);
    }
  });

  console.log("✅ Marketplace assets prepared successfully");
}

function updateVsixMarkdown() {
  console.log("📝 Updating vsix.md with relative image paths...");

  if (!fs.existsSync(vsixMdPath)) {
    console.error("❌ vsix.md not found");
    return;
  }

  let content = fs.readFileSync(vsixMdPath, "utf8");

  // Replace GitHub raw URLs with relative paths for images that will be included in VSIX
  const replacements = [
    {
      from: "https://raw.githubusercontent.com/codingworkflow/claude-runner/main/assets/icon.png",
      to: "./assets/icon.png",
    },
    {
      from: "https://raw.githubusercontent.com/codingworkflow/claude-runner/main/doc/assets/conversation.png",
      to: "./assets/marketplace/conversation.png",
    },
    {
      from: "https://raw.githubusercontent.com/codingworkflow/claude-runner/main/doc/assets/usage.png",
      to: "./assets/marketplace/usage.png",
    },
    {
      from: "https://raw.githubusercontent.com/codingworkflow/claude-runner/main/doc/assets/logs.png",
      to: "./assets/marketplace/logs.png",
    },
  ];

  let updated = false;
  replacements.forEach(({ from, to }) => {
    if (content.includes(from)) {
      content = content.replace(
        new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
        to,
      );
      console.log(`✅ Updated image path: ${from} → ${to}`);
      updated = true;
    }
  });

  if (updated) {
    fs.writeFileSync(vsixMdPath, content);
    console.log("✅ vsix.md updated with relative image paths");
  } else {
    console.log("ℹ️  No image paths needed updating in vsix.md");
  }
}

function generateMarketplaceInfo() {
  console.log("📋 Generating marketplace information...");

  const packageJson = JSON.parse(
    fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"),
  );

  const marketplaceInfo = {
    name: packageJson.displayName || packageJson.name,
    version: packageJson.version,
    publisher: packageJson.publisher,
    description: packageJson.description,
    icon: packageJson.icon,
    readme: packageJson.readme,
    repository: packageJson.repository?.url,
    license: packageJson.license,
    keywords: packageJson.keywords || [],
    categories: packageJson.categories || [],
    engines: packageJson.engines,
    screenshots: [
      "./assets/marketplace/conversation.png",
      "./assets/marketplace/usage.png",
      "./assets/marketplace/logs.png",
    ],
  };

  const infoPath = path.join(marketplaceDir, "marketplace-info.json");
  fs.writeFileSync(infoPath, JSON.stringify(marketplaceInfo, null, 2));
  console.log("✅ Generated marketplace-info.json");

  // Generate a marketplace checklist
  const checklist = `# VSCode Marketplace Checklist

## ✅ Required Assets
- [x] Extension icon (128x128): ${packageJson.icon}
- [x] README file: ${packageJson.readme}
- [x] Screenshots in assets/marketplace/

## 📝 Marketplace Metadata
- **Name**: ${marketplaceInfo.name}
- **Version**: ${marketplaceInfo.version} 
- **Publisher**: ${marketplaceInfo.publisher}
- **Categories**: ${marketplaceInfo.categories.join(", ")}
- **Keywords**: ${marketplaceInfo.keywords.join(", ")}

## 🖼️ Screenshots
${marketplaceInfo.screenshots.map((s) => `- [x] ${s}`).join("\n")}

## 📋 Next Steps for Publishing
1. Ensure all screenshots show the extension in action
2. Review vsix.md for marketplace appeal
3. Test VSIX package locally
4. Publish to marketplace: \`vsce publish\`

## 📊 Marketplace Guidelines
- Icon should be 128x128 PNG with transparent background
- Screenshots should be high-quality and show key features
- README should be engaging and informative
- Use clear, descriptive keywords
- Include proper categories for discoverability
`;

  const checklistPath = path.join(marketplaceDir, "checklist.md");
  fs.writeFileSync(checklistPath, checklist);
  console.log("✅ Generated marketplace checklist");
}

function main() {
  console.log("🚀 Preparing Claude Runner for VSCode Marketplace...\n");

  try {
    ensureMarketplaceAssets();
    console.log("");
    updateVsixMarkdown();
    console.log("");
    generateMarketplaceInfo();

    console.log("\n✅ Marketplace preparation complete!");
    console.log("\n📁 Files prepared:");
    console.log("  - vsix.md (marketplace README)");
    console.log("  - assets/marketplace/ (screenshots)");
    console.log("  - assets/marketplace/marketplace-info.json");
    console.log("  - assets/marketplace/checklist.md");
    console.log("\n💡 Next steps:");
    console.log("  1. Review vsix.md content");
    console.log("  2. Test VSIX package: npm run package");
    console.log("  3. Publish: vsce publish");
  } catch (error) {
    console.error("❌ Error during marketplace preparation:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  ensureMarketplaceAssets,
  updateVsixMarkdown,
  generateMarketplaceInfo,
};
