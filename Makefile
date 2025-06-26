.PHONY: setup setup-ci build build-vsix watch package clean test test-coverage lint dev install-local install-devcontainer help validate dev-prepare dev-install uninstall-extension get-extension-id version-patch version-minor version-major sync-version sonar scan-secrets generate-icons prepare-marketplace analyze-css cleanup-css cleanup-css-auto

# Default target - show help
help:
	@echo "Claude Runner VS Code Extension - Build Commands"
	@echo "==============================================="
	@echo "  make setup         - Install dependencies"
	@echo "  make setup-ci      - Install dependencies for CI environment"
	@echo "  make build         - Build extension (compile only)"
	@echo "  make build-vsix    - Build and package VSIX file"
	@echo "  make watch         - Watch for changes during development"
	@echo "  make dev           - Start development mode (alias for watch)"
	@echo "  make clean         - Remove build artifacts"
	@echo "  make test          - Run tests"
	@echo "  make test-coverage - Run tests with coverage report"
	@echo "  make test-watch    - Run tests in watch mode"
	@echo "  make lint          - Run ESLint and fix issues"
	@echo "  make validate      - Run tests and linting"
	@echo "  make install-local - Build and install extension locally"
	@echo "  make install-devcontainer - Install in devcontainer environment"
	@echo "  make dev-prepare   - Step 1: Uninstall extension and build VSIX"
	@echo "  make dev-install   - Step 2: Install extension only (manual reload required)"
	@echo ""
	@echo "Version Management:"
	@echo "  make sync-version  - Sync version from VERSION file to package.json"
	@echo "  make version-patch - Bump patch version (0.2.3 → 0.2.4)"
	@echo "  make version-minor - Bump minor version (0.2.3 → 0.3.0)"
	@echo "  make version-major - Bump major version (0.2.3 → 1.0.0)"
	@echo ""
	@echo "Code Quality:"
	@echo "  make sonar         - Run SonarQube analysis (requires .sonar config)"
	@echo "  make scan-secrets  - Scan for secrets in codebase"
	@echo ""
	@echo "Assets:"
	@echo "  make generate-icons    - Generate VSCode extension icons from logo"
	@echo "  make prepare-marketplace - Prepare assets and README for marketplace"
	@echo ""
	@echo "CSS Analysis:"
	@echo "  make analyze-css       - Analyze CSS usage and detect unused styles"
	@echo "  make cleanup-css       - Show CSS cleanup plan"
	@echo "  make cleanup-css-auto  - Auto-remove safe unused CSS rules"

# Install dependencies
setup:
	@echo "📦 Installing dependencies..."
	@npm run sync-version
	@npm install
	@echo "🔧 Setting up git hooks..."
	@npx husky install || echo "⚠️  Husky install failed - hooks may not work"
	@echo "✅ Dependencies installed"

# CI-specific setup (no git hooks)
setup-ci:
	@echo "📦 Installing dependencies for CI environment..."
	@npm run sync-version
	@npm install --prefer-offline --no-audit --progress=false
	@echo "✅ CI dependencies installed"

# Build the extension (compile only)
build:
	@echo "🔧 Compiling TypeScript..."
	@npm run compile || true
	@echo "✅ Extension compiled successfully"

# Build and package the VSIX file
build-vsix: clean
	@echo "🔨 Building Claude Runner VS Code Extension..."
	@echo "============================================"
	@echo ""
	@echo "📦 Creating VSIX package..."
	@npm run package
	@echo "✅ VSIX package created successfully"
	@echo ""
	@echo "============================================"
	@echo "✅ Build completed successfully!"
	@echo ""
	@echo "📁 Build artifacts:"
	@echo "  Extension: dist/extension.js"
	@echo "  Webview: dist/webview.js"
	@echo "  VSIX Package: dist/claude-runner-$$(node -p "require('./package.json').version").vsix"
	@echo ""
	@echo "📊 File sizes:"
	@ls -lh dist/extension.js 2>/dev/null | awk '{print "  Extension: " $$5}' || echo "  Extension: Not found"
	@ls -lh dist/webview.js 2>/dev/null | awk '{print "  Webview: " $$5}' || echo "  Webview: Not found"
	@ls -lh dist/claude-runner-*.vsix 2>/dev/null | awk '{print "  VSIX Package: " $$5}' || echo "  VSIX Package: Not found"
	@echo ""
	@echo "📥 To install the extension locally, run:"
	@echo "   make install-local"

# Watch for changes
watch:
	@echo "👀 Watching for changes..."
	@npm run watch

# Development mode (alias for watch)
dev: setup watch

# Clean build artifacts
clean:
	@echo "🧹 Cleaning build artifacts..."
	@rm -rf dist/
	@rm -rf out/
	@rm -f *.vsix
	@rm -rf .vscode-test/
	@rm -f *.log
	@rm -rf coverage/
	@rm -f *.tsbuildinfo
	@find . -name "*.js.map" -type f -delete 2>/dev/null || true
	@find . -name "*.tmp" -type f -delete 2>/dev/null || true
	@find . -name "*.temp" -type f -delete 2>/dev/null || true
	@find . -name ".DS_Store" -type f -delete 2>/dev/null || true
	@echo "✅ Clean complete"

# Run tests
test:
	@echo "🧪 Running tests..."
	@npm run test

# Run tests with coverage
test-coverage:
	@echo "🧪 Running tests with coverage..."
	@npm run test:unit:coverage

# Run tests in watch mode
test-watch:
	@echo "🧪 Running tests in watch mode..."
	@npm run test:watch

# Run linting and fix issues
lint:
	@echo "🔍 Running ESLint with auto-fix..."
	@npm run lint -- --fix
	@echo "✅ Linting complete"

# Run all validation
validate: test lint
	@echo "✅ All validation checks passed"

# Create VSIX package (alias for build-vsix)
package: build-vsix

# Install VSIX locally
install-local: build-vsix
	@echo "📥 Installing extension locally..."
	@if [ -n "$$REMOTE_CONTAINERS" ] || [ -n "$$CODESPACES" ] || [ -f /.dockerenv ]; then \
		echo "🐳 Detected devcontainer/Docker environment"; \
		echo ""; \
		echo "⚠️  Cannot install extension directly in devcontainer"; \
		echo ""; \
		echo "To install this extension in your devcontainer:"; \
		echo "1. Use the Command Palette (Ctrl/Cmd+Shift+P)"; \
		echo "2. Run: 'Extensions: Install from VSIX...'"; \
		echo "3. Navigate to /workspaces/vsix/claude-runner/dist/"; \
		echo "4. Select: claude-runner-$$(node -p "require('./package.json').version").vsix"; \
		echo ""; \
		echo "Or run: make install-devcontainer"; \
	else \
		code --install-extension dist/claude-runner-$$(node -p "require('./package.json').version").vsix; \
		echo "✅ Extension installed successfully"; \
		echo ""; \
		echo "🔄 Please reload VS Code to activate the extension"; \
	fi

# Install extension in devcontainer environment
install-devcontainer: build-vsix
	@echo "🐳 Installing extension in devcontainer..."
	@echo ""
	@if [ -n "$$REMOTE_CONTAINERS" ] || [ -n "$$CODESPACES" ] || [ -f /.dockerenv ]; then \
		echo "📦 VSIX file created:"; \
		echo "   dist/claude-runner-$$(node -p "require('./package.json').version").vsix"; \
		echo ""; \
		echo "📋 Installation options:"; \
		echo ""; \
		echo "Option 1: Use VS Code Command Palette"; \
		echo "  1. Press Ctrl/Cmd+Shift+P"; \
		echo "  2. Type: Extensions: Install from VSIX..."; \
		echo "  3. Navigate to /workspaces/vsix/claude-runner/dist/"; \
		echo "  4. Select: claude-runner-$$(node -p "require('./package.json').version").vsix"; \
		echo ""; \
		echo "Option 2: Copy to host and install"; \
		echo "  Use VS Code's Explorer to download the VSIX file"; \
		echo "  Then install it in your local VS Code"; \
	else \
		echo "❌ Not in a devcontainer environment"; \
		echo "Use 'make install-local' instead"; \
	fi

# Get extension ID for uninstall
get-extension-id:
	@node -pe "require('./package.json').publisher + '.' + require('./package.json').name"

# Uninstall the extension from VS Code
uninstall-extension:
	@EXTENSION_ID=$$(node -pe "require('./package.json').publisher + '.' + require('./package.json').name"); \
	echo "🗑️  Uninstalling extension: $$EXTENSION_ID"; \
	IPC_SOCKET=""; \
	if [ -S "$$VSCODE_IPC_HOOK_CLI" ]; then \
		IPC_SOCKET="$$VSCODE_IPC_HOOK_CLI"; \
	else \
		IPC_SOCKET=$$(find /tmp -name "vscode-ipc-*.sock" -type s 2>/dev/null | head -1); \
		if [ -n "$$IPC_SOCKET" ]; then \
			export VSCODE_IPC_HOOK_CLI=$$IPC_SOCKET; \
		fi; \
	fi; \
	code --uninstall-extension $$EXTENSION_ID 2>/dev/null || echo "⚠️  Extension not currently installed"

# Development step 1: uninstall and build
dev-prepare: uninstall-extension build-vsix
	@echo ""
	@echo "✅ Extension uninstalled and VSIX built."
	@echo "📝 Next step: Run 'make dev-install' to install the new version"

# Development step 2: install only
dev-install:
	@echo "🛠️  Development Step 2: Install extension..."
	@echo "==========================================="
	@EXTENSION_ID=$$(node -pe "require('./package.json').publisher + '.' + require('./package.json').name"); \
	echo "📦 Extension ID: $$EXTENSION_ID"; \
	VSIX_FILE=$$(ls dist/claude-runner-*.vsix | head -1 2>/dev/null); \
	if [ -z "$$VSIX_FILE" ]; then \
		echo "❌ No VSIX file found. Run 'make dev-prepare' first."; \
		exit 1; \
	fi; \
	echo "📥 Installing: $$VSIX_FILE"; \
	IPC_SOCKET=""; \
	if [ -S "$$VSCODE_IPC_HOOK_CLI" ]; then \
		IPC_SOCKET="$$VSCODE_IPC_HOOK_CLI"; \
		echo "🔌 Using existing IPC socket: $$IPC_SOCKET"; \
	else \
		IPC_SOCKET=$$(find /tmp -name "vscode-ipc-*.sock" -type s 2>/dev/null | head -1); \
		if [ -n "$$IPC_SOCKET" ]; then \
			export VSCODE_IPC_HOOK_CLI=$$IPC_SOCKET; \
			echo "🔌 Found IPC socket: $$IPC_SOCKET"; \
		else \
			echo "⚠️  No VS Code IPC socket found - using default CLI behavior"; \
		fi; \
	fi; \
	code --install-extension $$VSIX_FILE --force; \
	echo ""; \
	echo "✅ Extension installed successfully"; \
	echo ""; \
	echo "🔄 IMPORTANT: Manually reload VS Code to activate changes:"; \
	echo "   - Press Ctrl/Cmd+Shift+P → 'Developer: Reload Window'"; \
	echo "   - Or use Ctrl/Cmd+R to reload the window"

# Version Management
sync-version:
	@echo "🔄 Syncing version from VERSION file to package.json..."
	@node scripts/sync-version.js

version-patch:
	@echo "📈 Bumping patch version..."
	@node scripts/bump-version.js patch
	@echo "✅ Patch version bumped successfully"

version-minor:
	@echo "📈 Bumping minor version..."
	@node scripts/bump-version.js minor
	@echo "✅ Minor version bumped successfully"

version-major:
	@echo "📈 Bumping major version..."
	@node scripts/bump-version.js major
	@echo "✅ Major version bumped successfully"

# SonarQube Analysis
sonar:
	@echo "📋 Running test coverage before SonarQube analysis..."
	@npm run test:unit:coverage || true
	@echo "📋 Starting SonarQube analysis with coverage data..."
	@if [ ! -f coverage/lcov.info ]; then \
		echo "⚠️  No coverage data found. Running tests again..."; \
		npm run test:unit:coverage || true; \
	fi
	@export $$(cat .sonar | xargs) && \
	PROJECT_VERSION=$$(cat VERSION) && \
	sonar-scanner \
		-Dsonar.projectVersion=$$PROJECT_VERSION \
		-Dsonar.host.url=$$SONAR_HOST_URL \
		-Dsonar.token=$$SONAR_TOKEN
	@echo "✅ SonarQube analysis completed"
	@echo "📊 Coverage and code quality metrics sent to SonarQube"

# Secrets Scanning
scan-secrets:
	@echo "🔍 Scanning for secrets in codebase..."
	@node scripts/scan-secrets.js --all
	@echo "✅ Secrets scan completed"

# Prepare Marketplace Assets
prepare-marketplace:
	@echo "📦 Preparing marketplace assets and README..."
	@node scripts/prepare-marketplace.js
	@echo "✅ Marketplace preparation completed"

# CSS Analysis
analyze-css:
	@echo "🔍 Analyzing CSS usage and detecting unused styles..."
	@npm run analyze-css
	@echo "✅ CSS analysis completed"

cleanup-css:
	@echo "🧹 Generating CSS cleanup plan..."
	@npm run cleanup-css
	@echo "✅ CSS cleanup plan generated"

cleanup-css-auto:
	@echo "🧹 Auto-removing safe unused CSS rules..."
	@npm run cleanup-css:auto
	@echo "✅ Safe CSS cleanup completed"
	@echo "📊 Run 'make analyze-css' to see updated results"
