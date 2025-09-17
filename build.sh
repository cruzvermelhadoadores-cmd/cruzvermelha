#!/bin/bash

# Install dependencies
npm install

# Build client (vai gerar em dist/public)
npm run build

# Clean api folder
# rm -rf api
# mkdir -p api

# Copiar o server build para api/ (Vercel exige api/)
cp dist/index.js api/index.js

# Garantir que os shared e configs estão no dist
cp -r shared dist/
cp package.json dist/
cp package-lock.json dist/

echo "Build completed successfully"
