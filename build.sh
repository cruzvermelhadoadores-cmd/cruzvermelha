#!/bin/bash

# Install dependencies
npm install

# Build the client
npm run build

# Clean and prepare dist
rm -rf dist api
mkdir -p dist/public api

# Copy client build
cp -r client/dist/* dist/public/

# Copy server and shared
cp -r server/* api/
cp -r shared dist/
cp package.json dist/
cp package-lock.json dist/

echo "Build completed successfully"
