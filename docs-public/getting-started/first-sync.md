# Your First Sync

Learn how to configure and run your first worklog sync like a pro.

---

## What is Syncing?

**Syncing** is the process of importing worklogs from your JIRA and Tempo instances into the Worklog Dashboard. Unlike real-time systems, you control when to sync - giving you full control over API usage and data freshness.

### How It Works

```
Your JIRA Instances → API Call → Worklog Dashboard → Local Database
```

1. **You trigger a sync** (manually click "Sync" button)
2. **Dashboard connects** to your JIRA/Tempo APIs
3. **Worklogs are fetched** for the specified date range
4. **Data is imported** and stored locally
5. **Dashboard updates** with fresh data

**Important:** This is NOT real-time. Your dashboard shows data as of the last sync. To see recent changes in JIRA, run a new sync.

---

## Planning Your First Sync

Before clicking "Sync," consider these factors:

### 1. Date Range Selection

**Options:**

| Range | When to Use | Approx. Time | Worklogs (avg) |
|-------|-------------|--------------|----------------|
| **Last 7 days** | Quick refresh for recent work | 10-30 sec | 50-200 |
| **Last 30 days** | Monthly billing prep | 1-2 min | 200-800 |
| **This Month** | Month-end reporting | 1-3 min | 200-1000 |
| **Last Quarter** | Quarterly reviews | 5-10 min | 1000-3000 |
| **This Year** | Annual reporting | 10-30 min | 5000-15000 |
| **Custom** | Specific project timelines | Varies | Varies |

**💡 Recommendation for First Sync:** Start with "Last 30 days" to get meaningful data without waiting too long.

### 2. Instance Selection

If you have multiple JIRA instances:

- ✅ **Sync all instances** if you need complete reporting
- ✅ **Sync selectively** if you only need specific client/project data
- ✅ **Sync one at a time** if you want to verify each instance separately

**First Time Tip:** Sync just one instance first to verify your credentials work correctly.

### 3. Time of Day

**Best Times to Sync:**
- 🌅 **Early morning** (before 9 AM) - JIRA APIs less busy
- 🌙 **End of day** (after 6 PM) - Team done logging time
- 📅 **End of month** (last business day) - For billing and invoicing

**Avoid:**
- ❌ Middle of workday (API rate limits more likely)
- ❌ During JIRA maintenance windows
- ❌ While team is actively logging time (data incomplete)

---

## Step-by-Step: Your First Sync

### Step 1: Open the Sync Dialog

<!-- TODO: Add screenshot of sync button location -->

**From Dashboard:**
1. Look for the **"Sync"** button in the top-right corner
2. It may show a timestamp: "Last synced: 2 days ago"
3. Click to open the sync dialog

**From Settings:**
1. Navigate to **Settings → Sync**
2. View sync history and configuration
3. Click **"New Sync"**

### Step 2: Configure Sync Parameters

<!-- TODO: Add screenshot of sync configuration dialog -->

#### Date Range

**Quick Select (Recommended for First Sync):**
- Click **"Last 30 Days"** for a good balance of data and speed
- This will import the most recent month of worklogs

**Custom Range:**
- Click **"Custom"**
- Select **Start Date** and **End Date**
- Useful for specific reporting periods

**⚠️ Warning:** Syncing large date ranges (>1 year) can take 15-30 minutes and consume significant API quota.

#### Instance Selection

**All Instances (Default):**
- ✅ All configured JIRA instances are checked
- Syncs all instances in parallel
- Recommended for complete reporting

**Selective Sync:**
- Uncheck instances you want to skip
- Useful for testing or troubleshooting
- Saves time and API calls

**💡 First-Time Tip:** If you have multiple instances, uncheck all except one for your first sync. This helps you verify credentials and see how long sync takes per instance.

#### Advanced Options (Optional)

**Include Archived Issues:**
- Default: Off
- Turn on if you need historical data from completed projects
- Adds ~10-20% more worklogs (slower sync)

**Sync User Details:**
- Default: On
- Fetches display names and avatars for worklog authors
- Recommended: Keep enabled for better UI

**Fetch Epic Details:**
- Default: On
- Imports epic names and descriptions
- Required for epic-based reporting and filtering

### Step 3: Review Sync Summary

Before starting, you'll see a summary:

```
📊 Sync Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Date Range:    Jan 1, 2026 - Jan 31, 2026
Instances:     Main JIRA, Client A JIRA
Expected Time: ~2 minutes
Estimated API Calls: ~150
```

**Review this carefully:**
- ✅ Date range is correct
- ✅ Instances are selected
- ✅ Expected time is reasonable

### Step 4: Start Sync

<!-- TODO: Add screenshot of sync progress -->

1. Click **"Start Sync"**
2. Progress bar appears showing:
   - Current instance being synced
   - Worklogs fetched so far
   - Estimated time remaining
3. **You can navigate away** - sync continues in background

**Progress Indicators:**

```
🔄 Syncing Main JIRA...
   ├─ Fetching worklogs... 45/unknown
   ├─ Fetching issues... 12/15
   └─ Fetching epics... 3/3

✅ Main JIRA complete (128 worklogs)

🔄 Syncing Client A JIRA...
   └─ Fetching worklogs... 22/unknown
```

### Step 5: Review Results

When sync completes, you'll see a summary:

<!-- TODO: Add screenshot of sync completion summary -->

```
✅ Sync Complete!

Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Worklogs: 256
New: 198
Updated: 58
Errors: 0

By Instance:
• Main JIRA: 128 worklogs
• Client A JIRA: 128 worklogs

Duration: 1 minute 34 seconds
```

**What to Check:**
- ✅ **Total worklogs** looks reasonable (not 0, not suspiciously low)
- ✅ **Errors: 0** (if errors exist, review error log)
- ✅ **All instances** synced successfully

### Step 6: Verify Data in Dashboard

1. **Navigate to Dashboard**
   - Click "Dashboard" in main navigation
   - You should now see data in all charts

2. **Sanity Check:**
   - Does total hours look right? (Compare to JIRA)
   - Do you see expected team members?
   - Are key projects represented?

3. **Spot Check Individual Worklogs:**
   - Go to **Users** tab
   - Click on your name
   - Verify a few worklogs match what's in JIRA

---

## Understanding Sync Behavior

### What Gets Synced?

**Worklog Data:**
- ✅ Time logged (hours, start time)
- ✅ Issue key and summary
- ✅ Epic key and name (if issue is in an epic)
- ✅ Author (email and display name)
- ✅ JIRA instance source
- ✅ Project name
- ✅ Comment/description

**NOT Synced:**
- ❌ JIRA comments (only worklog comments)
- ❌ Issue attachments
- ❌ Sprint information (not yet supported)
- ❌ Custom fields (not yet supported)

### How Updates Work

**Upsert Logic:**

When syncing, the dashboard uses "upsert" (update or insert):

- **New worklogs** → Inserted into database
- **Existing worklogs** → Updated with latest data from JIRA
- **Deleted worklogs** → Not automatically removed (see below)

**⚠️ Important:** If you delete a worklog in JIRA, it won't automatically disappear from the dashboard. You need to manually delete it or run a full resync.

### Sync vs. Resync

**Sync (Default):**
- Imports worklogs in specified date range
- Updates existing worklogs if changed
- Fast and efficient

**Full Resync (Advanced):**
- Deletes all worklogs for selected instances
- Re-imports everything from scratch
- Slower, but ensures data accuracy
- Use when: Data seems corrupted or outdated

**How to Resync:**
1. Go to Settings → Sync History
2. Click **"Full Resync"**
3. Confirm the action (this cannot be undone)

---

## Sync Best Practices

### ✅ Do's

**✅ Sync Regularly**
- Daily or weekly keeps data fresh
- Shorter date ranges = faster syncs

**✅ Use Tempo API**
- If you have Tempo, always add the API token
- 5-10x faster than native JIRA worklog API

**✅ Sync After Month-End**
- Wait until everyone logs their time
- Run sync on the 1st or 2nd of the month for previous month

**✅ Check Sync Logs**
- Review errors and warnings
- Address API token issues promptly

**✅ Sync Before Invoicing**
- Always run a fresh sync before generating invoices
- Ensures all billable hours are captured

### ❌ Don'ts

**❌ Don't Sync Every Hour**
- JIRA has rate limits (300 requests/min)
- Most worklogs don't change once created
- Daily sync is sufficient for most teams

**❌ Don't Sync Massive Date Ranges**
- Syncing 5+ years of data is usually unnecessary
- Risks API timeouts and rate limiting
- Archive old data instead

**❌ Don't Sync During JIRA Maintenance**
- Check JIRA status page first
- Sync will fail if JIRA is down

**❌ Don't Ignore Errors**
- Failed syncs can indicate credential issues
- Fix errors before they compound

---

## Troubleshooting Sync Issues

### Sync Takes Forever (>10 minutes)

**Possible Causes:**
1. Very large date range (>1 year)
2. Many worklogs (>10,000)
3. Slow JIRA API response
4. Not using Tempo API (native JIRA worklog API is slower)

**Solutions:**
- ✅ Reduce date range
- ✅ Add Tempo API token
- ✅ Sync one instance at a time
- ✅ Run sync during off-peak hours

### Sync Fails with "Authentication Error"

**Cause:** API token or credentials are invalid or expired.

**Solutions:**
1. Go to Settings → JIRA Instances
2. Click "Test Connection" on the failing instance
3. If test fails:
   - Regenerate API token in JIRA
   - Update credentials in dashboard
   - Save and retry sync

### Sync Completes but No Data Shows

**Possible Causes:**
1. No worklogs exist in selected date range
2. Your JIRA user doesn't have permission to see worklogs
3. Worklogs belong to users not in any configured team

**Solutions:**
- ✅ Verify worklogs exist in JIRA directly
- ✅ Check JIRA permissions (need "Browse Projects")
- ✅ Expand date range
- ✅ Review sync error log

### "Rate Limit Exceeded" Error

**Cause:** Too many API requests in short time (JIRA Cloud limit: 300/min)

**Solutions:**
- ✅ Wait 5-10 minutes and retry
- ✅ Sync one instance at a time instead of all together
- ✅ Reduce sync frequency (daily vs. hourly)

### Some Instances Sync, Others Fail

**Cause:** Instance-specific credential or permission issue

**Solutions:**
1. Check Settings → Sync History
2. Expand failed instance details
3. Note specific error message
4. Test connection for that instance
5. Fix credentials or permissions

---

## Advanced Sync Strategies

### Strategy 1: Incremental Daily Sync

**Goal:** Keep data fresh with minimal API usage

**How:**
1. Run automatic sync every morning at 6 AM (TODO: Implement scheduled sync)
2. Sync "Yesterday" only (1 day range)
3. Takes <10 seconds
4. Captures any late worklogs from previous day

### Strategy 2: Monthly Billing Sync

**Goal:** Accurate data for invoicing

**How:**
1. On the 1st of each month, sync "Last Month"
2. Run twice: Once on the 1st, again on the 2nd
3. Captures late entries from month-end
4. Generate invoices after second sync

### Strategy 3: Multi-Instance Prioritization

**Goal:** Sync important instances more frequently

**How:**
1. **Daily:** Main company JIRA
2. **Weekly:** Client JIRAs
3. **Monthly:** Archive/legacy JIRAs
4. Reduces API load while keeping critical data fresh

---

## Next Steps

Now that you've completed your first sync:

**Explore Your Data:**
- [Dashboard Overview](../user-guide/dashboard.md) - Understand the metrics
- [Worklog Filtering](../user-guide/worklogs.md) - Advanced search and filtering

**Set Up for Success:**
- [Team Management](../user-guide/teams.md) - Organize users into teams
- [Billing Setup](../user-guide/billing.md) - Configure rates for invoicing

**Automate Your Workflow:**
- TODO: Scheduled sync documentation (feature in progress)
- TODO: Sync API endpoint for custom automation

---

## FAQ

**Q: How often should I sync?**
A: Daily for active projects, weekly for historical analysis. Before generating invoices, always run a fresh sync.

**Q: Does sync consume a lot of JIRA API quota?**
A: Moderate usage. Syncing 30 days typically uses 50-150 API calls. JIRA Cloud allows 300 calls/min.

**Q: Can I sync while others are using the dashboard?**
A: Yes! Sync runs in background and doesn't block other users.

**Q: What if JIRA is down during scheduled sync?**
A: Sync will fail gracefully. Retry when JIRA is back online.

**Q: Can I undo a sync?**
A: Not directly, but you can run a "Full Resync" to revert to fresh JIRA data.

---

*🚀 You're now a sync expert! Keep your data fresh and your insights accurate.*
