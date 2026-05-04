#!/bin/bash

set -e

REPO_DIR="$HOME/documents/projects/botTelegram-webapp"
APP_DIR="/opt/botTelegram-webapp"
WEB_ROOT="/var/www/bottelegram-webapp"

echo "Changing to the repository directory..."
cd "$REPO_DIR" || exit 1

echo "Ensuring runtime PATH..."
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  . "$HOME/.nvm/nvm.sh"
fi

if command -v corepack >/dev/null 2>&1; then
  corepack enable
  corepack prepare pnpm@11.0.4 --activate
elif ! command -v pnpm >/dev/null 2>&1; then
  npm install -g pnpm@11.0.4
fi

echo "Pulling latest changes..."
git pull origin main

echo "Installing dependencies..."
CI=true pnpm install --frozen-lockfile

echo "Building the webapp..."
pnpm build

echo "Copying the build"
mkdir -p "$APP_DIR" "$WEB_ROOT"
rm -rf "$APP_DIR/dist"
cp -r "$REPO_DIR/dist" "$APP_DIR/dist"

echo "Publishing the webapp..."
mkdir -p "$WEB_ROOT"
rm -rf "$WEB_ROOT"/*
cp -r "$APP_DIR/dist"/* "$WEB_ROOT"/

echo "Reloading web server if installed..."
if systemctl list-unit-files | grep -q "^caddy.service"; then
  systemctl reload caddy
fi
if systemctl list-unit-files | grep -q "^nginx.service"; then
  systemctl reload nginx
fi

echo "Deployment complete!"
