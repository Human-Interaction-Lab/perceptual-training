# First, create the main project directory and structure
mkdir audio-perception-app
cd audio-perception-app

# Create the directory structure
mkdir backend frontend
mkdir backend/public
mkdir backend/public/audio

# The complete structure should look like this:
audio-perception-app/
├── backend/
│   ├── public/
│   │   └── audio/     # Store your .wav files here
│   ├── server.js      # Main backend server code
│   ├── package.json   # Backend dependencies
│   └── .env           # Backend environment variables
├── frontend/
│   ├── src/
│   │   ├── App.js     # Main React component from earlier
│   │   └── ...        # Other React files
│   └── package.json   # Frontend dependencies
├── package.json       # Root package.json for running both services
└── start-app.sh       # Startup script

# Your application will be available at:
#   Frontend: http://localhost:3001
#   Backend API: http://localhost:3000

# Kill processes on ports 3000 and 3001
kill $(lsof -t -i:3000) 2>/dev/null || true
kill $(lsof -t -i:3001) 2>/dev/null || true

# Create the necessary files:

# 1. Create backend .env file
cat > backend/.env << EOL
JWT_SECRET=your_test_secret_key
MONGODB_URI=mongodb://localhost:27017/audio-perception
PORT=3000
EOL

# 2. Create backend package.json
cat > backend/package.json << EOL
{
  "name": "audio-perception-backend",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.17.1",
    "mongoose": "^6.0.12",
    "cors": "^2.8.5",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^8.5.1",
    "dotenv": "^10.0.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.14"
  }
}
EOL

# 3. Create root package.json
cat > package.json << EOL
{
  "name": "audio-perception-app",
  "version": "1.0.0",
  "scripts": {
    "install-all": "cd backend && npm install && cd ../frontend && npm install",
    "start-backend": "cd backend && npm start",
    "start-frontend": "cd frontend && npm start",
    "dev": "concurrently \"npm run start-backend\" \"npm run start-frontend\""
  },
  "devDependencies": {
    "concurrently": "^8.0.1"
  }
}
EOL

# 4. Create startup script
cat > start-app.sh << EOL
#!/bin/bash

echo "Starting Audio Perception Application..."

# Check if MongoDB is running
if pgrep mongod >/dev/null; then
    echo "MongoDB is already running"
else
    echo "Starting MongoDB..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # MacOS
        brew services start mongodb-community
    else
        # Linux
        sudo service mongodb start
    fi
fi

# Install dependencies if needed
if [ ! -d "backend/node_modules" ] || [ ! -d "frontend/node_modules" ]; then
    echo "Installing dependencies..."
    npm run install-all
fi

# Start both frontend and backend
echo "Starting application..."
npm run dev
EOL

# Make the startup script executable
chmod +x start-app.sh

# 5. Set up the frontend using create-react-app
npx create-react-app frontend


# Method 1: Using the startup script (recommended)
./start-app.sh

# Method 2: Running manually
# In one terminal:
cd backend
npm start

# In another terminal:
cd frontend
npm start

# Copy the React component code into frontend/src/App.js
# (Use the React component code from the earlier artifact)