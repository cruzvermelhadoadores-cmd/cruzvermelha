
#!/bin/bash

# Install dependencies
npm install

# Build the client
npm run build

# Copy server files to dist for deployment
mkdir -p dist
cp -r server dist/
cp -r shared dist/
cp package.json dist/
cp package-lock.json dist/

echo "Build completed successfully"
