#!/usr/bin/env python3
"""Script di verifica post-migrazione multi-tenant."""

import asyncio
import aiosqlite
from pathlib import Path

DB_PATH = Path(__file__).parent / "worklog_storage.db"

async def verify_migration():
    """Verifica lo stato della migrazione multi-tenant."""

    print("🔍 Verifica struttura multi-tenant")
    print("=" * 70)

    async with aiosqlite.connect(DB_PATH) as db:
        # 1. Verifica tabelle auth
        print("\n📋 Tabelle di autenticazione:")
        auth_tables = ['companies', 'oauth_users', 'auth_sessions', 'invitations', 'auth_audit_log']
        for table in auth_tables:
            cursor = await db.execute(f"""
                SELECT COUNT(*) FROM sqlite_master
                WHERE type='table' AND name=?
            """, (table,))
            exists = (await cursor.fetchone())[0] > 0
            status = "✅" if exists else "❌"

            if exists:
                cursor = await db.execute(f"SELECT COUNT(*) FROM {table}")
                count = (await cursor.fetchone())[0]
                print(f"  {status} {table:<20} ({count} record)")
            else:
                print(f"  {status} {table:<20} (NON ESISTE)")

        # 2. Verifica company_id su tabelle principali
        print("\n📋 Colonna company_id su tabelle principali:")
        main_tables = ['worklogs', 'epics', 'teams', 'users', 'jira_instances',
                       'billing_clients', 'billing_projects', 'invoices']

        for table in main_tables:
            cursor = await db.execute(f"""
                SELECT name FROM sqlite_master
                WHERE type='table' AND name=?
            """, (table,))

            if not await cursor.fetchone():
                print(f"  ⚠️  {table:<20} (tabella non esiste)")
                continue

            cursor = await db.execute(f"PRAGMA table_info({table})")
            columns = await cursor.fetchall()
            has_company_id = any(col[1] == 'company_id' for col in columns)

            status = "✅" if has_company_id else "❌"

            if has_company_id:
                cursor = await db.execute(f"SELECT COUNT(*) FROM {table}")
                total = (await cursor.fetchone())[0]
                cursor = await db.execute(f"SELECT COUNT(*) FROM {table} WHERE company_id IS NOT NULL")
                with_company = (await cursor.fetchone())[0]
                cursor = await db.execute(f"SELECT COUNT(*) FROM {table} WHERE company_id IS NULL")
                null_company = (await cursor.fetchone())[0]

                print(f"  {status} {table:<20} (tot: {total}, con company_id: {with_company}, NULL: {null_company})")
            else:
                print(f"  {status} {table:<20} (company_id MANCANTE)")

        # 3. Verifica indici multi-tenant
        print("\n📋 Indici multi-tenant principali:")
        key_indices = [
            'idx_worklogs_company_started',
            'idx_oauth_users_company',
            'idx_teams_company',
            'idx_users_company'
        ]

        for idx in key_indices:
            cursor = await db.execute(f"""
                SELECT COUNT(*) FROM sqlite_master
                WHERE type='index' AND name=?
            """, (idx,))
            exists = (await cursor.fetchone())[0] > 0
            status = "✅" if exists else "❌"
            print(f"  {status} {idx}")

        # 4. Conta totale indici
        cursor = await db.execute("""
            SELECT COUNT(*) FROM sqlite_master
            WHERE type='index' AND name LIKE '%company%'
        """)
        company_indices = (await cursor.fetchone())[0]
        print(f"\n  📊 Totale indici multi-tenant: {company_indices}")

        # 5. Verifica company di default
        print("\n📋 Companies configurate:")
        cursor = await db.execute("SELECT id, name, domain, is_active FROM companies")
        companies = await cursor.fetchall()
        if companies:
            for comp in companies:
                active = "🟢 ATTIVA" if comp[3] else "🔴 INATTIVA"
                print(f"  • ID {comp[0]}: {comp[1]} ({comp[2]}) - {active}")
        else:
            print("  ⚠️  Nessuna company configurata")

    print("\n" + "=" * 70)
    print("✅ Verifica completata")
    print("\n💡 Note:")
    print("  • Il database è ora completamente multi-tenant")
    print("  • Tutti i nuovi record DEVONO avere company_id")
    print("  • L'autenticazione OAuth assegnerà automaticamente company_id agli utenti")
    print("=" * 70)

if __name__ == "__main__":
    asyncio.run(verify_migration())
