#!/bin/bash

# Script để kiểm tra và chạy migrations
# Usage: ./scripts/check_migrations.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Database connection info
DB_CONTAINER="fullstack-postgres"
DB_USER="postgres"
DB_NAME="hst_db"

echo -e "${BLUE}🔍 Checking database migrations...${NC}"
echo ""

# Check if docker container is running
if ! docker ps | grep -q "$DB_CONTAINER"; then
    echo -e "${RED}❌ Database container '$DB_CONTAINER' is not running!${NC}"
    echo -e "${YELLOW}Start it with: docker-compose up -d postgres${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Database container is running${NC}"
echo ""

# Check if database exists
if ! docker exec "$DB_CONTAINER" psql -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo -e "${YELLOW}⚠️  Database '$DB_NAME' does not exist${NC}"
    echo -e "${YELLOW}Creating database...${NC}"
    docker exec "$DB_CONTAINER" psql -U "$DB_USER" -c "CREATE DATABASE $DB_NAME;"
    echo -e "${GREEN}✅ Database created${NC}"
else
    echo -e "${GREEN}✅ Database '$DB_NAME' exists${NC}"
fi

echo ""

# Check if schema_migrations table exists
SCHEMA_EXISTS=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'schema_migrations');")

if [ "$SCHEMA_EXISTS" = "t" ]; then
    echo -e "${GREEN}✅ schema_migrations table exists${NC}"
    
    # List applied migrations
    echo ""
    echo -e "${BLUE}📋 Applied migrations:${NC}"
    docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT filename, applied_at FROM schema_migrations ORDER BY applied_at;"
else
    echo -e "${YELLOW}⚠️  schema_migrations table does not exist${NC}"
    echo -e "${YELLOW}Migrations will be created automatically when backend starts${NC}"
fi

echo ""

# Check if main tables exist
echo -e "${BLUE}📊 Checking main tables...${NC}"

TABLES=("nguoi_dung" "thong_tin_nhan_keo" "tien_keo" "lich_su_nop_tien" "lich_su_rut_tien" "bet_receipt_history")

for table in "${TABLES[@]}"; do
    TABLE_EXISTS=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table');")
    
    if [ "$TABLE_EXISTS" = "t" ]; then
        ROW_COUNT=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM $table;")
        echo -e "${GREEN}  ✅ $table (rows: $ROW_COUNT)${NC}"
    else
        echo -e "${RED}  ❌ $table (not found)${NC}"
    fi
done

echo ""
echo -e "${BLUE}💡 Tip: If tables are missing, restart the backend to run migrations automatically${NC}"
echo -e "${YELLOW}   Or run: cd backend && go run cmd/api/main.go${NC}"


