#!/bin/bash
cd "$(dirname "$0")"
if [ ! -f ".env.local" ]; then
  echo "Missing .env.local. Copy your original .env.local into this folder first."
  read -p "Press Enter to close..."
  exit 1
fi
if [ ! -x "node_modules/.bin/vite" ]; then
  echo "Installing or repairing dependencies (this may take a few minutes)..."
  npm install
  if [ $? -ne 0 ] || [ ! -x "node_modules/.bin/vite" ]; then
    echo "Dependency installation failed. Check your internet connection and try again."
    read -p "Press Enter to close..."
    exit 1
  fi
fi
echo "Starting Family Hub..."
npm run dev -- --host 0.0.0.0
