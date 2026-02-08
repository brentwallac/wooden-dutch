#!/usr/bin/env bash
set -euo pipefail

# ── Seed Ghost with The Wooden Dutch author personas ────
# Run from the project root:
#   bash deploy/seed-authors.sh
#
# Requires: docker compose running (Ghost + MySQL)

COMPOSE_FILES="-f docker-compose.yml"
if [ -f docker-compose.prod.yml ]; then
  COMPOSE_FILES="-f docker-compose.yml -f docker-compose.prod.yml"
fi

# Wait for MySQL to be ready
echo "==> Waiting for MySQL..."
until docker compose $COMPOSE_FILES exec -T mysql mysqladmin ping -h localhost --silent 2>/dev/null; do
  sleep 2
done

run_sql() {
  docker compose $COMPOSE_FILES exec -T mysql mysql -u ghost -p"${MYSQL_PASSWORD:-ghost_db_password}" ghost -e "$1"
}

echo "==> Creating author accounts..."

# Generate deterministic UUIDs from slugs (hex-encoded, padded to 24 chars for Ghost object IDs)
# Ghost uses 24-char hex IDs

run_sql "
INSERT INTO users (id, name, slug, password, email, status, visibility, created_at, created_by)
VALUES
  (SUBSTR(HEX('harrisonblake000'), 1, 24),
   'Harrison Blake',
   'harrison-blake',
   '\$2b\$10\$invalidhashnotforlogin000000000000000000000000000000',
   'harrison.blake@thedutchwood.com',
   'active', 'public', NOW(), '1')
ON DUPLICATE KEY UPDATE name=VALUES(name);
"

run_sql "
INSERT INTO users (id, name, slug, password, email, status, visibility, created_at, created_by)
VALUES
  (SUBSTR(HEX('priyachandrase00'), 1, 24),
   'Priya Chandrasekaran',
   'priya-chandrasekaran',
   '\$2b\$10\$invalidhashnotforlogin000000000000000000000000000000',
   'priya.chandrasekaran@thedutchwood.com',
   'active', 'public', NOW(), '1')
ON DUPLICATE KEY UPDATE name=VALUES(name);
"

run_sql "
INSERT INTO users (id, name, slug, password, email, status, visibility, created_at, created_by)
VALUES
  (SUBSTR(HEX('jeanbaptistemer0'), 1, 24),
   'Jean-Baptiste Mercier',
   'jean-baptiste-mercier',
   '\$2b\$10\$invalidhashnotforlogin000000000000000000000000000000',
   'jean-baptiste.mercier@thedutchwood.com',
   'active', 'public', NOW(), '1')
ON DUPLICATE KEY UPDATE name=VALUES(name);
"

run_sql "
INSERT INTO users (id, name, slug, password, email, status, visibility, created_at, created_by)
VALUES
  (SUBSTR(HEX('dakotachen000000'), 1, 24),
   'Dakota Chen',
   'dakota-chen',
   '\$2b\$10\$invalidhashnotforlogin000000000000000000000000000000',
   'dakota.chen@thedutchwood.com',
   'active', 'public', NOW(), '1')
ON DUPLICATE KEY UPDATE name=VALUES(name);
"

echo "==> Setting author profiles (location, bio)..."

run_sql "
UPDATE users SET
  location = 'Senior Correspondent',
  bio = 'Harrison Blake has covered global freight markets for over two decades. He has personally witnessed three container shipping crises, survived the Great Chassis Shortage of 2021, and once spent 47 consecutive days tracking a single TEU from Ningbo to Memphis.'
WHERE slug = 'harrison-blake';
"

run_sql "
UPDATE users SET
  location = 'Technology & Innovation Editor',
  bio = 'Priya Chandrasekaran covers the intersection of supply chain operations and technology disruption. She holds a degree in Industrial Engineering that she describes as a four-year masterclass in identifying problems that software will claim to solve.'
WHERE slug = 'priya-chandrasekaran';
"

run_sql "
UPDATE users SET
  location = 'Maritime Affairs Correspondent',
  bio = 'Jean-Baptiste Mercier has chronicled the world'\''s oceans and the vessels that traverse them since before containerisation was fashionable. He maintains that the shipping industry peaked in 1987 and has been in aesthetic decline ever since.'
WHERE slug = 'jean-baptiste-mercier';
"

run_sql "
UPDATE users SET
  location = 'Supply Chain Culture Reporter',
  bio = 'Dakota Chen covers logistics from the perspective of someone who still can'\''t believe this is a real industry. Previously at a now-defunct logistics startup, they bring the energy of someone who has seen the sausage being made and decided to write about the factory.'
WHERE slug = 'dakota-chen';
"

echo "==> Assigning Author role..."

run_sql "
INSERT IGNORE INTO roles_users (id, role_id, user_id)
SELECT
  SUBSTR(HEX(CONCAT(u.slug, FLOOR(RAND()*1000))), 1, 24),
  r.id,
  u.id
FROM users u
CROSS JOIN roles r
WHERE u.slug IN ('harrison-blake', 'priya-chandrasekaran', 'jean-baptiste-mercier', 'dakota-chen')
  AND r.name = 'Author'
  AND NOT EXISTS (
    SELECT 1 FROM roles_users ru WHERE ru.user_id = u.id AND ru.role_id = r.id
  );
"

echo "==> Restarting Ghost to pick up changes..."
docker compose $COMPOSE_FILES restart ghost

echo ""
echo "==> Done! Authors created:"
run_sql "SELECT name, slug, location FROM users WHERE slug IN ('harrison-blake', 'priya-chandrasekaran', 'jean-baptiste-mercier', 'dakota-chen');"
