#!/usr/bin/env bash
set -euo pipefail

# ── The Wooden Dutch — Droplet Bootstrap ────────────────
# Run on a fresh Ubuntu 24.04 Droplet:
#   curl -sSL https://raw.githubusercontent.com/YOUR_USER/wooden-dutch/main/deploy/setup.sh | bash
#
# Prerequisites:
#   - Domain thedutchwood.com A record pointing to this Droplet's IP
#   - Git repo accessible (public or deploy key configured)

APP_DIR="/opt/wooden-dutch"
REPO_URL="${REPO_URL:-https://github.com/YOUR_USER/wooden-dutch.git}"
BRANCH="${BRANCH:-main}"

echo "==> Installing Docker..."
apt-get update -qq
apt-get install -y -qq ca-certificates curl
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
apt-get update -qq
apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin

echo "==> Cloning repo..."
git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
cd "$APP_DIR"

echo "==> Creating .env from template..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo ""
    echo "!! IMPORTANT: Edit $APP_DIR/.env before starting !!"
    echo "   - Set real MYSQL_ROOT_PASSWORD and MYSQL_PASSWORD (use: openssl rand -base64 32)"
    echo "   - Set GHOST_URL=https://thedutchwood.com"
    echo "   - Set GHOST_ADMIN_API_KEY after first Ghost admin setup"
    echo "   - Set AWS credentials for article generation"
    echo ""
fi

echo "==> Starting services..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

echo ""
echo "==> Done! Next steps:"
echo "   1. Edit $APP_DIR/.env with real credentials"
echo "   2. Restart: cd $APP_DIR && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d"
echo "   3. Set up Ghost admin: https://thedutchwood.com/ghost/"
echo "   4. Activate the 'wooden-dutch' theme in Ghost Admin > Settings > Design"
echo "   5. Create author accounts: harrison-blake, priya-chandrasekaran, jean-baptiste-mercier, dakota-chen"
