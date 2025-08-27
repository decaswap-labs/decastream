#!/bin/bash

# DECAStream Protocol Bot Startup Script

echo "🚀 Starting DECAStream Protocol Bot..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "Please copy env.template to .env and configure your settings"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the project
echo "🔨 Building bot..."
npm run build

# Start the bot
echo "🎯 Starting bot..."
npm start
