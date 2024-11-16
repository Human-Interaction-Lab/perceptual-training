# structure
mkdir audio-perception-app
cd audio-perception-app
mkdir backend frontend

# backend
cd backend
npm init -y
# Install backend dependencies
npm install express mongoose cors bcryptjs jsonwebtoken dotenv

# install shadcn
npm install -g shadcn-ui
npm install @radix-ui/react-label @radix-ui/react-slot class-variance-authority clsx tailwind-merge lucide-react
cd ..
npm install react-scripts

# Create .env file
echo "JWT_SECRET=your_secret_key
MONGODB_URI=mongodb://localhost:27017/audio-perception
PORT=3000" > .env

# install mongodb
# First, tap the MongoDB Homebrew tap:
brew tap mongodb/brew

# Then install MongoDB Community Edition:
brew install mongodb-community@7.0

# Start MongoDB service
brew services start mongodb-community@7.0

# install shadcn
# npm install -D @shadcn/ui
# npx shadcn-ui@latest init

# json2csv
cd backend
npm install json2csv archiver

# Copy the server.js code from earlier into backend/server.js

# frontend
cd ../frontend
# Create a new React app using create-react-app or Next.js
npx create-react-app .
# Install frontend dependencies
npm install @radix-ui/react-alert-dialog @radix-ui/react-slot class-variance-authority clsx lucide-react tailwindcss postcss autoprefixer

# run application
cd backend
# Start MongoDB (if not already running)
sudo service mongodb start  # for Ubuntu
# or
brew services start mongodb-community  # for MacOS

# Start the backend server
node server.js

# frontend
cd frontend
npm start
