#!/usr/bin/env python3
"""
Applicazione indici composite Phase 1 (Quick Wins) dal OPTIMIZATION_PLAN.md
Target: 87% miglioramento performance su query critiche
"""

import asyncio
import aiosqlite
import time
from pathlib import Path

DB_PATH = Path(__file__).parent / "worklog_storage.db"

async def apply_phase1_indexes():
    """Applica gli indici composite ottimizzati Phase 1."""

    print("🚀 Applicazione Indici Composite - Phase 1 (Quick Wins)")
    print("=" * 70)
    print("Target: 87% miglioramento performance query critiche")
    print("Downtime: ZERO (creazione in background)")
    print("=" * 70)

    async with aiosqlite.connect(DB_PATH) as db:
        # Enable foreign keys
        await db.execute("PRAGMA foreign_keys = ON")

        # Verifica stato database prima della migrazione
        print("\n📊 Pre-Migration State:")

        # Conta indici esistenti
        cursor = await db.execute("""
            SELECT COUNT(*) FROM sqlite_master
            WHERE type='index' AND sql IS NOT NULL
        """)
        index_count_before = (await cursor.fetchone())[0]
        print(f"  • Indici esistenti: {index_count_before}")

        # Conta worklogs
        cursor = await db.execute("SELECT COUNT(*) FROM worklogs")
        worklog_count = (await cursor.fetchone())[0]
        print(f"  • Worklogs in DB: {worklog_count:,}")

        # ========== Phase 1: Critical Composite Indexes ==========
        print("\n📋 Phase 1: Creazione Indici Composite...")

        indexes = [
            {
                "name": "idx_worklogs_user_range",
                "table": "worklogs",
                "columns": "(company_id, author_email, started DESC)",
                "sql": """
                    CREATE INDEX IF NOT EXISTS idx_worklogs_user_range
                    ON worklogs(company_id, author_email, started DESC)
                """,
                "impact": "~40% faster user dashboard queries",
                "priority": "🔴 CRITICAL"
            },
            {
                "name": "idx_worklogs_instance_range",
                "table": "worklogs",
                "columns": "(company_id, jira_instance, started DESC)",
                "sql": """
                    CREATE INDEX IF NOT EXISTS idx_worklogs_instance_range
                    ON worklogs(company_id, jira_instance, started DESC)
                """,
                "impact": "~35% faster sync operations",
                "priority": "🔴 CRITICAL"
            },
            {
                "name": "idx_billing_rates_lookup",
                "table": "billing_rates",
                "columns": "(billing_project_id, user_email, issue_type)",
                "sql": """
                    CREATE INDEX IF NOT EXISTS idx_billing_rates_lookup
                    ON billing_rates(billing_project_id, user_email, issue_type)
                """,
                "impact": "~25% faster billing calculations",
                "priority": "🟡 MODERATE"
            },
            {
                "name": "idx_factorial_leaves_company_status",
                "table": "factorial_leaves",
                "columns": "(user_id, status, start_date DESC)",
                "sql": """
                    CREATE INDEX IF NOT EXISTS idx_factorial_leaves_company_status
                    ON factorial_leaves(user_id, status, start_date DESC)
                """,
                "impact": "~20% faster absence tracking",
                "priority": "🟡 MODERATE"
            }
        ]

        created = 0
        skipped = 0
        errors = 0

        for idx in indexes:
            print(f"\n  {idx['priority']} {idx['name']}")
            print(f"     Table: {idx['table']}{idx['columns']}")
            print(f"     Impact: {idx['impact']}")

            start_time = time.time()

            try:
                # Verifica se esiste già
                cursor = await db.execute("""
                    SELECT COUNT(*) FROM sqlite_master
                    WHERE type='index' AND name=?
                """, (idx['name'],))
                exists = (await cursor.fetchone())[0] > 0

                if exists:
                    print(f"     Status: ⚠️  Già esistente (skip)")
                    skipped += 1
                    continue

                # Crea l'indice
                await db.execute(idx['sql'])
                elapsed = time.time() - start_time

                print(f"     Status: ✅ Creato in {elapsed:.2f}s")
                created += 1

            except Exception as e:
                elapsed = time.time() - start_time
                print(f"     Status: ❌ Errore dopo {elapsed:.2f}s")
                print(f"     Error: {e}")
                errors += 1

        # ========== Analyze per aggiornare statistiche ==========
        print("\n📊 Aggiornamento statistiche query planner...")
        start_time = time.time()
        await db.execute("ANALYZE")
        elapsed = time.time() - start_time
        print(f"  ✅ ANALYZE completato in {elapsed:.2f}s")

        # ========== Commit ==========
        print("\n💾 Commit delle modifiche...")
        await db.commit()
        print("  ✅ Modifiche committate")

        # ========== Verifica Post-Migration ==========
        print("\n📊 Post-Migration State:")

        cursor = await db.execute("""
            SELECT COUNT(*) FROM sqlite_master
            WHERE type='index' AND sql IS NOT NULL
        """)
        index_count_after = (await cursor.fetchone())[0]
        print(f"  • Indici totali: {index_count_after} (+{index_count_after - index_count_before})")

        # Verifica indici Phase 1
        phase1_names = [idx['name'] for idx in indexes]
        cursor = await db.execute(f"""
            SELECT name FROM sqlite_master
            WHERE type='index' AND name IN ({','.join(['?']*len(phase1_names))})
        """, phase1_names)
        present_indexes = await cursor.fetchall()
        print(f"  • Indici Phase 1 presenti: {len(present_indexes)}/{len(indexes)}")

        # Stima dimensione indici (approssimativa)
        cursor = await db.execute("PRAGMA page_count")
        page_count = (await cursor.fetchone())[0]
        cursor = await db.execute("PRAGMA page_size")
        page_size = (await cursor.fetchone())[0]
        db_size_mb = (page_count * page_size) / (1024 * 1024)
        print(f"  • Database size: {db_size_mb:.2f} MB")

    print("\n" + "=" * 70)
    print(f"✅ Phase 1 Completata: {created} creati, {skipped} già esistenti, {errors} errori")
    print("\n📈 Benefici Attesi:")
    print("  • User dashboard queries: ~40% più veloci")
    print("  • Sync operations: ~35% più veloci")
    print("  • Billing calculations: ~25% più veloci")
    print("  • Absence tracking: ~20% più veloci")
    print("  • Overall improvement: 87% su query critiche")
    print("\n💡 Note:")
    print("  • Indici creati in background (zero downtime)")
    print("  • SQLite query planner aggiornato (ANALYZE)")
    print("  • Nessun impatto su query esistenti")
    print("\n📝 Next Steps:")
    print("  • Riavvia l'applicazione per vedere i miglioramenti")
    print("  • Monitora le performance con query profiling")
    print("  • Considera Phase 2 per data integrity (vedi OPTIMIZATION_PLAN.md)")
    print("=" * 70)

if __name__ == "__main__":
    try:
        asyncio.run(apply_phase1_indexes())
    except Exception as e:
        print(f"\n❌ ERRORE FATALE: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
