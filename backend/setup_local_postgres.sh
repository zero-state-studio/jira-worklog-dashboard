#!/bin/bash
# Setup PostgreSQL locale per sviluppo

echo "=========================================="
echo "SETUP POSTGRESQL LOCALE"
echo "=========================================="

# 1. Installa PostgreSQL (se non già installato)
if ! command -v psql &> /dev/null; then
    echo "📦 Installazione PostgreSQL via Homebrew..."
    brew install postgresql@15
    echo "✅ PostgreSQL installato"
else
    echo "✅ PostgreSQL già installato: $(psql --version)"
fi

# 2. Avvia servizio PostgreSQL
echo ""
echo "🚀 Avvio servizio PostgreSQL..."
brew services start postgresql@15 || brew services start postgresql

# 3. Crea database
echo ""
echo "📊 Creazione database 'jira_worklog_dev'..."
createdb jira_worklog_dev 2>/dev/null && echo "✅ Database creato" || echo "⚠️  Database già esistente"

# 4. Crea user (opzionale, per sicurezza)
echo ""
echo "👤 Creazione user 'jira_user'..."
psql postgres -c "CREATE USER jira_user WITH PASSWORD 'dev_password_123';" 2>/dev/null && echo "✅ User creato" || echo "⚠️  User già esistente"

# 5. Grant privileges
echo ""
echo "🔐 Assegnazione permessi..."
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE jira_worklog_dev TO jira_user;"
psql jira_worklog_dev -c "GRANT ALL ON SCHEMA public TO jira_user;"
psql jira_worklog_dev -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO jira_user;"

# 6. Test connessione
echo ""
echo "🔌 Test connessione..."
psql jira_worklog_dev -c "SELECT version();" && echo "✅ Connessione OK"

echo ""
echo "=========================================="
echo "✅ SETUP COMPLETATO!"
echo "=========================================="
echo ""
echo "Connection string locale:"
echo "DATABASE_URL=postgresql://jira_user:dev_password_123@localhost:5432/jira_worklog_dev"
echo ""
echo "Test connessione:"
echo "psql jira_worklog_dev"
echo ""
