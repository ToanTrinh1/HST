#!/bin/bash

# Script helper để chạy database migrations
# Usage: ./scripts/migrate.sh [migration_file]

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Database connection info
DB_CONTAINER="fullstack-postgres"
DB_USER="postgres"
DB_NAME="hst_db"

# Check if docker container is running
if ! docker ps | grep -q "$DB_CONTAINER"; then
    echo -e "${RED}❌ Database container '$DB_CONTAINER' is not running!${NC}"
    echo -e "${YELLOW}Start it with: docker-compose up -d postgres${NC}"
    exit 1
fi

# If migration file is provided as argument
if [ -n "$1" ]; then
    MIGRATION_FILE="$1"
else
    # Default: run the bet tables migration
    MIGRATION_FILE="migrations/001_create_bet_tables.sql"
fi

# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}❌ Migration file not found: $MIGRATION_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}⬆️  Running migration: $MIGRATION_FILE${NC}"
echo -e "${YELLOW}Database: $DB_NAME${NC}"
echo -e "${YELLOW}Container: $DB_CONTAINER${NC}"
echo ""

# Run migration
cat "$MIGRATION_FILE" | docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Migration completed successfully!${NC}"
else
    echo ""
    echo -e "${RED}❌ Migration failed!${NC}"
    exit 1
fi
