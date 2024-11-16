#!/bin/bash

echo "Starting Audio Perception Application..."

# Check if MongoDB is running
if pgrep mongod >/dev/null; then
    echo "MongoDB is already running"
else
    echo "Starting MongoDB..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # MacOS
        brew services start mongodb-community@7.0
    else
        # Linux
        sudo systemctl start mongod
    fi
fi

# Kill any processes running on ports 3000 and 3001
echo "Cleaning up ports..."
kill $(lsof -t -i:3000) 2>/dev/null || true
kill $(lsof -t -i:3001) 2>/dev/null || true

# Clean npm cache
echo "Cleaning npm cache..."
npm cache clean --force

# Install dependencies if needed
if [ ! -d "backend/node_modules" ] || [ ! -d "frontend/node_modules" ]; then
    echo "Installing dependencies..."
    npm run install-all
fi

# Export NODE_OPTIONS for the entire session
export NODE_OPTIONS='--openssl-legacy-provider'

# Start both frontend and backend
echo "Starting application..."
npm run dev

# The application should now be running with:
#   Backend API at http://localhost:3000
#   Frontend at http://localhost:3001 (React's default port when 3000 is taken)