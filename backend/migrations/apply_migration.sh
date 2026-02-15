#!/bin/bash
# Apply PostgreSQL migration

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=========================================="
echo "JIRA Worklog Dashboard - Database Migration"
echo -e "==========================================${NC}"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ ERROR: DATABASE_URL environment variable not set${NC}"
    echo ""
    echo "Set it with:"
    echo "  export DATABASE_URL='postgresql://user:password@localhost:5432/dbname'"
    echo ""
    exit 1
fi

echo -e "${BLUE}📊 Applying migration to:${NC}"
echo "  $DATABASE_URL"
echo ""

# Extract connection details
DB_URL=$DATABASE_URL

# Apply migration
echo -e "${BLUE}🚀 Applying 001_initial_schema.sql...${NC}"
psql "$DB_URL" -f "$(dirname "$0")/001_initial_schema.sql"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}=========================================="
    echo "✅ MIGRATION COMPLETATA!"
    echo -e "==========================================${NC}"
    echo ""
    echo "Database ready! Now you can:"
    echo "  1. Start the backend: uvicorn app.main:app --reload"
    echo "  2. Run tests: pytest"
    echo ""
else
    echo ""
    echo -e "${RED}❌ MIGRATION FAILED${NC}"
    echo "Check the error messages above"
    exit 1
fi
