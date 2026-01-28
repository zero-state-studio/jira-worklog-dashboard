#!/bin/bash
# Build the Python backend as a standalone executable for Tauri sidecar

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/backend"
BINARIES_DIR="$PROJECT_ROOT/frontend/src-tauri/binaries"

echo "Building backend for Tauri sidecar..."

# Detect platform
case "$(uname -s)" in
    Darwin)
        case "$(uname -m)" in
            arm64)
                TARGET_TRIPLE="aarch64-apple-darwin"
                ;;
            x86_64)
                TARGET_TRIPLE="x86_64-apple-darwin"
                ;;
        esac
        ;;
    Linux)
        TARGET_TRIPLE="x86_64-unknown-linux-gnu"
        ;;
    MINGW*|MSYS*|CYGWIN*)
        TARGET_TRIPLE="x86_64-pc-windows-msvc"
        ;;
esac

echo "Target triple: $TARGET_TRIPLE"

# Create virtual environment if it doesn't exist
if [ ! -d "$BACKEND_DIR/venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv "$BACKEND_DIR/venv"
fi

# Activate virtual environment
source "$BACKEND_DIR/venv/bin/activate"

# Install dependencies
echo "Installing dependencies..."
pip install -q -r "$BACKEND_DIR/requirements.txt"
pip install -q pyinstaller

# Create binaries directory
mkdir -p "$BINARIES_DIR"

# Build with PyInstaller
echo "Building executable with PyInstaller..."
cd "$BACKEND_DIR"

pyinstaller \
    --onefile \
    --name "backend-$TARGET_TRIPLE" \
    --add-data "config.yaml.example:." \
    --hidden-import uvicorn.logging \
    --hidden-import uvicorn.loops \
    --hidden-import uvicorn.loops.auto \
    --hidden-import uvicorn.protocols \
    --hidden-import uvicorn.protocols.http \
    --hidden-import uvicorn.protocols.http.auto \
    --hidden-import uvicorn.protocols.websockets \
    --hidden-import uvicorn.protocols.websockets.auto \
    --hidden-import uvicorn.lifespan \
    --hidden-import uvicorn.lifespan.on \
    --collect-submodules app \
    --distpath "$BINARIES_DIR" \
    --workpath "$BACKEND_DIR/build" \
    --specpath "$BACKEND_DIR" \
    app/main.py

# Cleanup
rm -rf "$BACKEND_DIR/build" "$BACKEND_DIR/backend-$TARGET_TRIPLE.spec"

echo "Backend built successfully: $BINARIES_DIR/backend-$TARGET_TRIPLE"
