# Fix per UNIQUE Constraint Failed: worklogs.id

## 🐛 Problema

Errore durante sincronizzazione JIRA:
```
UNIQUE constraint failed: worklogs.id
```

## 🔍 Causa

La tabella `worklogs` ha `id` come **PRIMARY KEY semplice**, ma quando si usano **più istanze JIRA**, queste possono generare worklogs con lo **stesso ID numerico**:

- JIRA Instance A → worklog ID `10001`
- JIRA Instance B → worklog ID `10001` (stesso ID, worklog diverso!)

Quando il sistema cerca di inserire entrambi, SQLite blocca l'inserimento perché l'ID è già presente.

## ✅ Soluzione Applicata

### 1. Fix nel Codice (cache.py)

**Modificato:** `backend/app/cache.py` - funzione `upsert_worklogs()`

Il sistema ora:
- Verifica duplicati usando la coppia `(id, jira_instance)` invece del solo `id`
- Filtra per `company_id` per isolare correttamente i dati multi-tenant
- Previene nuovi duplicati durante la sincronizzazione

**Commit:** `git diff cache.py` per vedere le modifiche

### 2. Pulizia Duplicati Esistenti

Se hai già dati duplicati nel database, devi pulirli usando lo script fornito.

## 📋 Istruzioni per il Tuo Collega

### Step 1: Backup del Database

```bash
cd backend
cp worklog_storage.db worklog_storage.db.backup
```

### Step 2: Analizza Duplicati

```bash
# Opzione A: Script Python (consigliato)
python fix_duplicate_worklogs.py

# Opzione B: Query SQL manuale
sqlite3 worklog_storage.db < check_duplicates.sql
```

### Step 3: Fix dei Duplicati

Esegui lo script e scegli una strategia:

```bash
python fix_duplicate_worklogs.py
```

**Strategia 1 (SICURA):** Rinomina gli ID duplicati
- Trasforma `10001` → `10001_JiraInstanceA`, `10001_JiraInstanceB`
- **Non cancella dati**
- Consigliata nella maggior parte dei casi

**Strategia 2 (DISTRUTTIVA):** Rimuove duplicati
- Mantiene solo il worklog più recente per ogni ID
- ⚠️ **Cancella dati** - usa solo se i duplicati sono errori

### Step 4: Riavvia Backend

```bash
# Riavvia uvicorn
uvicorn app.main:app --reload
```

### Step 5: Risincronizza

Vai su `/settings` → "Integrazioni JIRA" → Clicca "Sincronizza" su ogni istanza

✅ La sincronizzazione dovrebbe ora completarsi senza errori!

## 🔬 Verifica che il Fix Funzioni

Dopo aver applicato il fix:

1. Apri il database:
   ```bash
   sqlite3 worklog_storage.db
   ```

2. Verifica che non ci siano più duplicati:
   ```sql
   SELECT id, COUNT(*) as count, GROUP_CONCAT(jira_instance) as instances
   FROM worklogs
   GROUP BY id
   HAVING COUNT(*) > 1;
   ```

   Risultato atteso: **nessuna riga** (zero duplicati)

3. Verifica che i worklogs siano stati importati:
   ```sql
   SELECT COUNT(*) FROM worklogs;
   SELECT COUNT(DISTINCT jira_instance) as instances FROM worklogs;
   ```

## 📊 Diagnostica

### Query Utili

```sql
-- Conta worklogs per istanza
SELECT jira_instance, COUNT(*) as count
FROM worklogs
GROUP BY jira_instance;

-- Trova worklogs recenti
SELECT id, jira_instance, started, author_email
FROM worklogs
ORDER BY started DESC
LIMIT 10;

-- Verifica company_id
SELECT company_id, COUNT(*) as count
FROM worklogs
GROUP BY company_id;
```

## 🚀 Soluzione Definitiva (Opzionale)

Per una soluzione permanente, serve una **migrazione del database** che cambi la PRIMARY KEY da:
```sql
id TEXT PRIMARY KEY
```

A una chiave composta:
```sql
PRIMARY KEY (id, jira_instance, company_id)
```

Questo richiede ricreare la tabella (SQLite non supporta ALTER TABLE per PRIMARY KEY).

**Se vuoi implementare questa migrazione, contattami.**

## 📞 Supporto

Se il problema persiste:

1. Controlla i log dell'applicazione: `backend/logs/`
2. Verifica che tutte le istanze JIRA abbiano `jira_instance` configurato correttamente
3. Esegui query diagnostiche sopra
4. Contatta il team per supporto

## 🎯 TL;DR - Quick Fix

```bash
cd backend

# Backup
cp worklog_storage.db worklog_storage.db.backup

# Fix duplicati
python fix_duplicate_worklogs.py
# Scegli opzione 1 (SICURA)

# Riavvia backend
# Vai su /settings → Sincronizza tutte le istanze JIRA

✅ Problema risolto!
```
