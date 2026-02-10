#!/usr/bin/env python3
"""
Script per verificare lo stato dei worklogs nel database.
Controlla quanti worklogs ci sono e con quale company_id.
"""
import sqlite3
from pathlib import Path

# Path al database (modifica se necessario)
DB_PATH = Path(__file__).parent / "backend" / "worklog_storage.db"

def check_worklogs():
    if not DB_PATH.exists():
        print(f"❌ Database non trovato: {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print("=" * 60)
    print("VERIFICA WORKLOGS NEL DATABASE")
    print("=" * 60)

    # Check total worklogs
    cursor.execute("SELECT COUNT(*) FROM worklogs")
    total = cursor.fetchone()[0]
    print(f"\n📊 Totale worklogs nel database: {total}")

    # Check worklogs per company_id
    cursor.execute("""
        SELECT company_id, COUNT(*)
        FROM worklogs
        GROUP BY company_id
        ORDER BY company_id
    """)
    print("\n📋 Distribuzione per company_id:")
    for company_id, count in cursor.fetchall():
        if company_id is None:
            print(f"  company_id = NULL: {count} worklogs ⚠️")
        else:
            print(f"  company_id = {company_id}: {count} worklogs")

    # Check date range
    cursor.execute("""
        SELECT
            MIN(date(started)) as first_date,
            MAX(date(started)) as last_date
        FROM worklogs
    """)
    first_date, last_date = cursor.fetchone()
    print(f"\n📅 Range temporale: {first_date} → {last_date}")

    # Check recent worklogs (last 5)
    cursor.execute("""
        SELECT
            id,
            company_id,
            author_email,
            date(started) as date,
            time_spent_seconds / 3600.0 as hours
        FROM worklogs
        ORDER BY started DESC
        LIMIT 5
    """)
    print("\n🔍 Ultimi 5 worklogs:")
    for row in cursor.fetchall():
        wl_id, company_id, email, date, hours = row
        company_str = f"company_id={company_id}" if company_id else "company_id=NULL ⚠️"
        print(f"  {date} | {email} | {hours:.1f}h | {company_str}")

    # Check user's company_id from oauth_users
    print("\n👤 Utenti OAuth registrati:")
    cursor.execute("""
        SELECT id, email, company_id, role
        FROM oauth_users
        WHERE is_active = 1
    """)
    users = cursor.fetchall()
    if users:
        for user_id, email, company_id, role in users:
            print(f"  {email} → company_id={company_id} ({role})")
    else:
        print("  Nessun utente OAuth trovato")

    conn.close()

    print("\n" + "=" * 60)
    print("DIAGNOSI")
    print("=" * 60)

    # Check if NULL company_ids exist
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM worklogs WHERE company_id IS NULL")
    null_count = cursor.fetchone()[0]
    conn.close()

    if null_count > 0:
        print(f"\n⚠️  PROBLEMA: Trovati {null_count} worklogs con company_id=NULL")
        print("   Questi worklogs non saranno visibili nel frontend.")
        print("\n💡 SOLUZIONE:")
        print("   1. Riavvia il backend (il backfill automatico li migrerà)")
        print("   2. Oppure usa POST /api/settings/migration/execute")
    else:
        print("\n✅ Tutti i worklogs hanno un company_id valido")
        print("\n🔍 Se i worklogs non sono ancora visibili, verifica:")
        print("   1. Che l'utente abbia lo stesso company_id dei worklogs")
        print("   2. Che il range di date sia corretto")
        print("   3. Che gli account JIRA siano mappati correttamente")

if __name__ == "__main__":
    check_worklogs()
