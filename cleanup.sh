#!/bin/bash

echo "Cleaning up and reinstalling dependencies..."

# Kill any running processes
echo "Killing running processes..."
kill $(lsof -t -i:3000) 2>/dev/null || true
kill $(lsof -t -i:3001) 2>/dev/null || true

# Clean npm cache
echo "Cleaning npm cache..."
npm cache clean --force

# Remove node_modules and lock files
echo "Removing old dependencies..."
rm -rf node_modules package-lock.json
rm -rf frontend/node_modules frontend/package-lock.json
rm -rf backend/node_modules backend/package-lock.json

# Clear npm cache again
npm cache clean --force

# Install dependencies
echo "Installing root dependencies..."
npm install

echo "Installing frontend dependencies..."
cd frontend
npm install --legacy-peer-deps
npm audit fix --force

echo "Installing backend dependencies..."
cd ../backend
npm install
npm audit fix

cd ..

echo "Cleanup complete!"