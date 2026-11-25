#!/bin/bash
cd "$(dirname "$0")"
if [ ! -f ".dev.env" ]; then
  echo "Missing .dev.env. Create it from .dev.env.example and fill in your Supabase URL and service-role key."
  read -p "Press Enter to close..."
  exit 1
fi
if [ ! -d "node_modules" ]; then
 echo "Installing dependencies..."
 npm install
 if [ $? -ne 0 ]; then read -p "Install failed. Press Enter..."; exit 1; fi
fi
node dev-server.mjs
