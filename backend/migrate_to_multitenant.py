#!/usr/bin/env python3
"""
Script di migrazione per convertire il database single-tenant a multi-tenant.
Aggiunge company_id a tutte le tabelle esistenti e crea le tabelle di autenticazione.
"""

import asyncio
import aiosqlite
import sys
from pathlib import Path

# Database path
DB_PATH = Path(__file__).parent / "worklog_storage.db"

async def migrate_to_multitenant():
    """Esegue la migrazione completa a multi-tenant."""

    print(f"🔄 Avvio migrazione multi-tenant su: {DB_PATH}")
    print("=" * 70)

    async with aiosqlite.connect(DB_PATH) as db:
        # Enable foreign keys
        await db.execute("PRAGMA foreign_keys = ON")

        # ========== 1. Crea tabelle di autenticazione ==========
        print("\n📋 Fase 1: Creazione tabelle di autenticazione...")

        # Companies/Organizations
        print("  → Creazione tabella 'companies'...")
        await db.execute("""
            CREATE TABLE IF NOT EXISTS companies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                domain TEXT,
                is_active INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # OAuth authenticated users
        print("  → Creazione tabella 'oauth_users'...")
        await db.execute("""
            CREATE TABLE IF NOT EXISTS oauth_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                google_id TEXT NOT NULL UNIQUE,
                email TEXT NOT NULL,
                first_name TEXT,
                last_name TEXT,
                picture_url TEXT,
                role TEXT NOT NULL DEFAULT 'USER',
                is_active INTEGER DEFAULT 1,
                last_login_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(company_id, email)
            )
        """)

        # Session tokens
        print("  → Creazione tabella 'auth_sessions'...")
        await db.execute("""
            CREATE TABLE IF NOT EXISTS auth_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES oauth_users(id) ON DELETE CASCADE,
                refresh_token TEXT NOT NULL UNIQUE,
                access_token_jti TEXT,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Invitations
        print("  → Creazione tabella 'invitations'...")
        await db.execute("""
            CREATE TABLE IF NOT EXISTS invitations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                email TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'USER',
                invited_by INTEGER REFERENCES oauth_users(id),
                token TEXT NOT NULL UNIQUE,
                status TEXT DEFAULT 'PENDING',
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Auth audit log
        print("  → Creazione tabella 'auth_audit_log'...")
        await db.execute("""
            CREATE TABLE IF NOT EXISTS auth_audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_id INTEGER REFERENCES companies(id),
                user_id INTEGER REFERENCES oauth_users(id),
                event_type TEXT NOT NULL,
                email TEXT,
                ip_address TEXT,
                metadata_json TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Indici per tabelle auth
        print("  → Creazione indici auth...")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_oauth_users_company ON oauth_users(company_id)")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_oauth_users_google_id ON oauth_users(google_id)")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_oauth_users_email ON oauth_users(email)")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id)")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_auth_sessions_token ON auth_sessions(refresh_token)")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_invitations_company ON invitations(company_id)")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token)")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email, status)")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_auth_audit_company ON auth_audit_log(company_id, created_at)")

        print("  ✅ Tabelle auth create")

        # ========== 2. Aggiungi company_id alle tabelle esistenti ==========
        print("\n📋 Fase 2: Aggiunta colonna company_id alle tabelle esistenti...")

        tables_to_migrate = [
            "teams",
            "users",
            "jira_instances",
            "worklogs",
            "epics",
            "billing_clients",
            "billing_projects",
            "invoices",
            "package_templates",
            "holidays",
            "factorial_config",
            "complementary_groups",
            "logs"
        ]

        for table in tables_to_migrate:
            try:
                print(f"  → Aggiunta company_id a '{table}'...")
                await db.execute(f"""
                    ALTER TABLE {table}
                    ADD COLUMN company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE
                """)
                print(f"    ✅ Colonna aggiunta a '{table}'")
            except aiosqlite.OperationalError as e:
                if "duplicate column name" in str(e).lower():
                    print(f"    ⚠️  Colonna già esistente in '{table}' (skip)")
                else:
                    print(f"    ❌ Errore su '{table}': {e}")

        # ========== 3. Crea company di default ==========
        print("\n📋 Fase 3: Creazione company di default...")

        # Verifica se esiste già una company
        cursor = await db.execute("SELECT COUNT(*) FROM companies")
        row = await cursor.fetchone()
        company_count = row[0]

        if company_count == 0:
            print("  → Inserimento company 'Default Company' (id=1)...")
            await db.execute("""
                INSERT INTO companies (id, name, domain, is_active)
                VALUES (1, 'Default Company', 'default.local', 1)
            """)
            print("  ✅ Company default creata (id=1)")
        else:
            print(f"  ℹ️  Company già presenti: {company_count} (skip)")

        # ========== 4. Migra dati esistenti alla company di default ==========
        print("\n📋 Fase 4: Assegnazione dati esistenti alla company_id=1...")

        for table in tables_to_migrate:
            # Verifica se la tabella esiste
            cursor = await db.execute("""
                SELECT name FROM sqlite_master
                WHERE type='table' AND name=?
            """, (table,))
            if not await cursor.fetchone():
                print(f"  ⚠️  Tabella '{table}' non esiste (skip)")
                continue

            # Aggiorna i record NULL
            result = await db.execute(f"""
                UPDATE {table}
                SET company_id = 1
                WHERE company_id IS NULL
            """)
            rows_updated = result.rowcount
            print(f"  → {table}: {rows_updated} record migrati a company_id=1")

        # ========== 5. Crea indici multi-tenant ==========
        print("\n📋 Fase 5: Creazione indici multi-tenant...")

        indices = [
            ("idx_teams_company", "teams", "company_id"),
            ("idx_users_company", "users", "company_id"),
            ("idx_jira_instances_company", "jira_instances", "company_id"),
            ("idx_worklogs_company", "worklogs", "company_id"),
            ("idx_worklogs_company_started", "worklogs", "company_id, started DESC"),
            ("idx_epics_company", "epics", "company_id"),
            ("idx_billing_clients_company", "billing_clients", "company_id"),
            ("idx_billing_projects_company", "billing_projects", "company_id"),
            ("idx_invoices_company", "invoices", "company_id"),
            ("idx_package_templates_company", "package_templates", "company_id"),
            ("idx_holidays_company", "holidays", "company_id"),
            ("idx_factorial_config_company", "factorial_config", "company_id"),
            ("idx_complementary_groups_company", "complementary_groups", "company_id"),
            ("idx_logs_company", "logs", "company_id, timestamp DESC"),
        ]

        for idx_name, table, columns in indices:
            try:
                await db.execute(f"""
                    CREATE INDEX IF NOT EXISTS {idx_name}
                    ON {table}({columns})
                """)
                print(f"  ✅ {idx_name}")
            except Exception as e:
                print(f"  ⚠️  {idx_name}: {e}")

        # ========== 6. Commit finale ==========
        print("\n💾 Commit delle modifiche...")
        await db.commit()
        print("  ✅ Modifiche committate con successo")

        # ========== 7. Verifica finale ==========
        print("\n🔍 Verifica finale della migrazione...")

        # Verifica tabelle auth
        cursor = await db.execute("""
            SELECT COUNT(*) FROM sqlite_master
            WHERE type='table' AND name IN ('companies', 'oauth_users', 'auth_sessions', 'invitations', 'auth_audit_log')
        """)
        auth_tables = (await cursor.fetchone())[0]
        print(f"  → Tabelle auth create: {auth_tables}/5")

        # Verifica company_id su worklogs
        cursor = await db.execute("PRAGMA table_info(worklogs)")
        columns = await cursor.fetchall()
        has_company_id = any(col[1] == 'company_id' for col in columns)
        print(f"  → worklogs.company_id: {'✅ PRESENTE' if has_company_id else '❌ MANCANTE'}")

        # Conta record worklogs migrati
        cursor = await db.execute("SELECT COUNT(*) FROM worklogs WHERE company_id = 1")
        migrated_worklogs = (await cursor.fetchone())[0]
        cursor = await db.execute("SELECT COUNT(*) FROM worklogs WHERE company_id IS NULL")
        null_worklogs = (await cursor.fetchone())[0]
        print(f"  → Worklogs migrati a company_id=1: {migrated_worklogs}")
        print(f"  → Worklogs con company_id NULL: {null_worklogs}")

        # Conta companies
        cursor = await db.execute("SELECT COUNT(*) FROM companies")
        companies = (await cursor.fetchone())[0]
        print(f"  → Companies totali: {companies}")

    print("\n" + "=" * 70)
    print("✅ Migrazione multi-tenant completata con successo!")
    print("\n📝 Prossimi passi:")
    print("   1. Riavvia l'applicazione FastAPI")
    print("   2. Verifica che l'autenticazione OAuth funzioni")
    print("   3. Controlla che i dati esistenti siano visibili")
    print("=" * 70)

if __name__ == "__main__":
    try:
        asyncio.run(migrate_to_multitenant())
    except Exception as e:
        print(f"\n❌ ERRORE FATALE: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
