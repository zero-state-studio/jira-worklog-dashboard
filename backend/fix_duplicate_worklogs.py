#!/usr/bin/env python3
"""
Script per risolvere il problema dei worklog duplicati causati da
più istanze JIRA con gli stessi ID worklog.

PROBLEMA: La tabella worklogs ha PRIMARY KEY(id), ma dovrebbe essere (id, jira_instance)
perché istanze JIRA diverse possono avere lo stesso ID worklog.

SOLUZIONE:
1. Questo script identifica e rimuove i duplicati esistenti
2. Il fix nel codice (cache.py) previene nuovi duplicati
3. Per una soluzione definitiva, serve una migrazione DB per cambiare la PRIMARY KEY

ATTENZIONE: Fare backup del database prima di eseguire!
"""

import asyncio
import aiosqlite
import sys
from pathlib import Path

DB_PATH = Path(__file__).parent / "worklog_storage.db"


async def analyze_duplicates():
    """Analizza i duplicati presenti nel database."""
    async with aiosqlite.connect(DB_PATH) as db:
        # Trova ID duplicati
        async with db.execute("""
            SELECT
                id,
                COUNT(*) as occurrences,
                GROUP_CONCAT(jira_instance) as instances,
                GROUP_CONCAT(company_id) as companies
            FROM worklogs
            GROUP BY id
            HAVING COUNT(*) > 1
            ORDER BY occurrences DESC
        """) as cursor:
            duplicates = await cursor.fetchall()

        if not duplicates:
            print("✅ Nessun duplicato trovato!")
            return []

        print(f"❌ Trovati {len(duplicates)} ID duplicati:\n")
        for dup in duplicates[:10]:  # Mostra primi 10
            id_val, count, instances, companies = dup
            print(f"  ID: {id_val}")
            print(f"  Occorrenze: {count}")
            print(f"  Istanze JIRA: {instances}")
            print(f"  Companies: {companies}")
            print()

        if len(duplicates) > 10:
            print(f"... e altri {len(duplicates) - 10} ID duplicati")

        return duplicates


async def fix_duplicates_strategy_1():
    """
    Strategia 1: Crea ID univoci concatenando id + jira_instance

    Cambia gli ID da "12345" a "12345_JiraInstanceName" per renderli univoci.
    Questa è la soluzione più sicura perché non cancella dati.
    """
    async with aiosqlite.connect(DB_PATH) as db:
        # Trova tutti i worklogs con ID duplicati
        async with db.execute("""
            SELECT id, jira_instance, company_id
            FROM worklogs
            WHERE id IN (
                SELECT id
                FROM worklogs
                GROUP BY id
                HAVING COUNT(*) > 1
            )
            ORDER BY id, jira_instance
        """) as cursor:
            duplicates = await cursor.fetchall()

        if not duplicates:
            print("✅ Nessun duplicato da fixare")
            return

        print(f"Fixing {len(duplicates)} worklogs duplicati...")

        # Per ogni worklog duplicato, cambia l'ID in "id_instance"
        for old_id, instance, company_id in duplicates:
            new_id = f"{old_id}_{instance.replace(' ', '_')}"

            try:
                await db.execute("""
                    UPDATE worklogs
                    SET id = ?
                    WHERE id = ? AND jira_instance = ? AND company_id = ?
                """, (new_id, old_id, instance, company_id))

                print(f"  ✅ {old_id} → {new_id} (instance: {instance})")
            except Exception as e:
                print(f"  ❌ Errore su {old_id}: {e}")

        await db.commit()
        print("\n✅ Fix completato!")


async def fix_duplicates_strategy_2():
    """
    Strategia 2: Rimuove i duplicati mantenendo solo il più recente

    ⚠️ ATTENZIONE: Questa strategia CANCELLA dati!
    Usa solo se sei sicuro che i duplicati siano errori e non dati legittimi.
    """
    async with aiosqlite.connect(DB_PATH) as db:
        # Per ogni ID duplicato, mantieni solo il worklog più recente (updated_at più recente)
        result = await db.execute("""
            DELETE FROM worklogs
            WHERE rowid NOT IN (
                SELECT MAX(rowid)
                FROM worklogs
                GROUP BY id, jira_instance, company_id
            )
            AND id IN (
                SELECT id
                FROM worklogs
                GROUP BY id
                HAVING COUNT(*) > 1
            )
        """)

        deleted = result.rowcount
        await db.commit()

        print(f"✅ Rimossi {deleted} worklogs duplicati")


async def main():
    print("=" * 60)
    print("WORKLOG DUPLICATES FIXER")
    print("=" * 60)
    print()

    if not DB_PATH.exists():
        print(f"❌ Database non trovato: {DB_PATH}")
        sys.exit(1)

    print(f"📁 Database: {DB_PATH}\n")

    # Analizza duplicati
    print("🔍 Analizzando duplicati...\n")
    duplicates = await analyze_duplicates()

    if not duplicates:
        sys.exit(0)

    print("\n" + "=" * 60)
    print("OPZIONI DI FIX:")
    print("=" * 60)
    print()
    print("1. Strategia 1 (SICURA): Rinomina ID duplicati → 'id_InstanceName'")
    print("   - Non cancella dati")
    print("   - Crea ID univoci combinando id + instance")
    print()
    print("2. Strategia 2 (DISTRUTTIVA): Rimuove duplicati, mantiene il più recente")
    print("   - ⚠️  CANCELLA DATI!")
    print("   - Usa solo se i duplicati sono errori")
    print()
    print("3. Solo analisi - non modificare nulla")
    print()

    choice = input("Scegli opzione (1/2/3): ").strip()

    if choice == "1":
        confirm = input("\n⚠️  Vuoi procedere con Strategia 1? (sì/no): ").strip().lower()
        if confirm in ["sì", "si", "yes", "y"]:
            print("\n🔧 Applicando fix...")
            await fix_duplicates_strategy_1()
        else:
            print("❌ Operazione annullata")

    elif choice == "2":
        print("\n⚠️⚠️⚠️  ATTENZIONE: Questa operazione CANCELLA dati! ⚠️⚠️⚠️")
        confirm = input("Sei SICURO di voler procedere? (scrivi 'ELIMINA'): ").strip()
        if confirm == "ELIMINA":
            print("\n🔧 Rimuovendo duplicati...")
            await fix_duplicates_strategy_2()
        else:
            print("❌ Operazione annullata")

    else:
        print("✅ Solo analisi - nessuna modifica effettuata")


if __name__ == "__main__":
    asyncio.run(main())
