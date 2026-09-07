#!/bin/bash
echo "🚀 Starting BRAM IS HERE Bot..."

mkdir -p auth_info
mkdir -p logs

if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install --production
fi

echo "⚡ Running bot..."
node index.js 2>&1 | tee logs/bot.log