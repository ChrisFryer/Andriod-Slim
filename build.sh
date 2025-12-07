#!/bin/bash
echo "============================================"
echo "  Android Slim - Build Script (Unix)"
echo "============================================"
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "ERROR: npm is not installed"
    exit 1
fi

# Detect OS
OS=$(uname -s)
case "$OS" in
    Linux*)     TARGET="node18-linux-x64" ;;
    Darwin*)    TARGET="node18-macos-x64" ;;
    *)          echo "Unsupported OS: $OS"; exit 1 ;;
esac

echo "Detected OS: $OS"
echo "Build target: $TARGET"
echo

# Install dependencies
echo "Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install dependencies"
    exit 1
fi

# Create dist directory
mkdir -p dist

# Build executable
echo
echo "Building executable..."
npx pkg . --targets $TARGET --out-path dist --compress GZip

if [ $? -eq 0 ]; then
    echo
    echo "============================================"
    echo "  BUILD SUCCESSFUL!"
    echo "============================================"
    echo
    echo "Executable created in: dist/"
    ls -la dist/
    echo
    echo "To run: ./dist/android-slim"
    echo
    echo "NOTE: ADB must be installed for the app to work."
    echo "  macOS: brew install android-platform-tools"
    echo "  Linux: sudo apt install android-tools-adb"
    echo
else
    echo
    echo "BUILD FAILED!"
    echo "Check the errors above."
    exit 1
fi
