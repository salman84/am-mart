#!/bin/bash
# AM Mart Admin Panel Starter
# Builds and starts the admin panel in production mode

SCRIPT_DIR="$(dirname "$0")"
cd "$SCRIPT_DIR/apps/admin"

echo "Building admin panel..."
node "$SCRIPT_DIR/node_modules/next/dist/bin/next" build

# Create prerender-manifest.json (needed due to 404/500 prerender issue in Next.js 14)
node -e "
const fs = require('fs');
const manifest = {version:4,routes:{},dynamicRoutes:{},notFoundRoutes:[],preview:{previewModeId:'preview-mode-id',previewModeSigningKey:'preview-mode-signing-key',previewModeEncryptionKey:'preview-mode-encryption-key'}};
fs.writeFileSync('.next/prerender-manifest.json', JSON.stringify(manifest,null,2));
"

echo "Starting admin panel on http://localhost:3002..."
node "$SCRIPT_DIR/node_modules/next/dist/bin/next" start -p 3002
