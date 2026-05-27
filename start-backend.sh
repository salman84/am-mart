#!/bin/bash
# AM Mart Backend Starter
# Compiles TypeScript and starts the backend server

cd "$(dirname "$0")/apps/backend"

echo "Building backend..."
npx tsc -p tsconfig.build.json
if [ $? -ne 0 ]; then
  echo "Build failed. Trying to start existing dist..."
fi

echo "Starting backend on port 3001..."
READABLE_STREAM=disable node dist/main.js
