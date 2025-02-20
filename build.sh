#!/bin/bash
# Ensure the script fails on any error
set -e

# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Build the frontend
npm run build

# Verify dist directory exists
if [ ! -d "dist" ]; then
    echo "Error: dist directory was not created"
    exit 1
fi

echo "Build completed successfully" 