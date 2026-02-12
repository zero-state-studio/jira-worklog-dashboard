# Viewing Worklogs

Master advanced worklog search, filtering, and analysis.

---

## Overview

The **Worklogs** view gives you detailed access to individual time entries from all your JIRA instances. Use it to verify billing accuracy, audit time allocation, or drill into specific projects and issues.

<!-- TODO: Add screenshot of worklogs table -->

---

## Accessing Worklogs

### Method 1: From Users Page

1. Navigate to **Users** in main navigation
2. Click on any user's name
3. View that user's complete worklog history

**Use case:** Checking your own time entries or reviewing a team member's worklogs

### Method 2: From Dashboard

1. Click on any chart element (e.g., a project name)
2. Dashboard filters to show only those worklogs
3. Scroll down to worklog table

**Use case:** Investigating specific metrics from dashboard

### Method 3: From Issues/Epics

1. Go to **Epics** or search for an issue
2. Click on epic/issue key
3. View all worklogs for that epic/issue

**Use case:** Project-specific time tracking

---

## Worklog Table

<!-- TODO: Add screenshot of worklog table with columns labeled -->

### Columns

| Column | Description | Sortable | Filterable |
|--------|-------------|----------|------------|
| **Date** | When work was performed | ✅ Yes | ✅ Yes |
| **User** | Who logged the time (display name + email) | ✅ Yes | ✅ Yes |
| **Issue** | JIRA issue key and summary | ✅ Yes | ✅ Yes |
| **Epic** | Parent epic (if applicable) | ✅ Yes | ✅ Yes |
| **Hours** | Time logged (decimal hours) | ✅ Yes | ✅ Yes |
| **Billable** | ✓ if billable, ✗ if not | ✅ Yes | ✅ Yes |
| **Rate** | Hourly rate assigned (if configured) | ✅ Yes | ✅ Yes |
| **Total** | Hours × Rate = Billable amount | ✅ Yes | ❌ No |
| **Instance** | Which JIRA instance | ❌ No | ✅ Yes |
| **Comment** | Worklog description | ❌ No | ✅ Yes |

### Sorting

Click any column header to sort:
- **First click:** Ascending (A→Z, 0→9, oldest→newest)
- **Second click:** Descending (Z→A, 9→0, newest→oldest)
- **Third click:** Remove sort

**Tip:** Hold `Shift` while clicking to sort by multiple columns (e.g., User then Date)

### Pagination

- Default: 50 worklogs per page
- Options: 25, 50, 100, 200, All
- Use ← → buttons to navigate pages
- Jump to specific page with number input

---

## Filtering Worklogs

### Basic Filters (Always Visible)

<!-- TODO: Add screenshot of filter panel -->

**Date Range:**
- Select start and end dates
- Or use quick filters: Today, This Week, This Month, etc.

**User:**
- Type name or email to filter to specific user
- Autocomplete suggests matching users
- Clear to show all users

**Instance:**
- Dropdown to select specific JIRA instance
- "All Instances" shows consolidated data

**Team:**
- Filter by team (if teams configured)
- Great for team leads

### Advanced Filters (Click "Advanced")

**Issue/Epic:**
- Search by issue key (e.g., "PROJ-123")
- Or issue summary text (e.g., "login bug")
- Supports wildcards: `PROJ-*` matches all issues in PROJ

**Billable Status:**
- ✓ Billable only
- ✗ Non-billable only
- All (default)

**Hour Range:**
- Min hours: Show only worklogs >= X hours
- Max hours: Show only worklogs <= X hours
- **Use case:** Find short worklogs (<0.5h) or long sessions (>8h)

**Rate Range:**
- Filter by assigned rate
- **Use case:** "Show all worklogs with rate > $100/hr"

**Comment Contains:**
- Text search in worklog descriptions
- **Use case:** Find worklogs mentioning "meeting" or "on-call"

### Filter Combinations

Filters stack (AND logic). Example:

```
Date: Last 30 Days
User: john@company.com
Billable: Yes
Hours: >= 4.0

Result: John's billable worklogs >= 4 hours in last 30 days
```

**Clear All Filters:** Click "Reset" button to remove all filters

---

## Worklog Details View

Click any worklog row to see full details:

<!-- TODO: Add screenshot of worklog detail modal -->

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WORKLOG DETAILS

Issue:        PROJ-123 - Implement login feature
Epic:         EPIC-45 - Authentication System
Date:         January 15, 2026 (14:30 - 18:30)
Duration:     4.0 hours
User:         John Doe (john@company.com)

Billable:     ✓ Yes
Rate:         $125.00/hr
Total:        $500.00

Instance:     Main Company JIRA
Project:      Customer Portal

Comment:
Built OAuth integration with Google. Implemented
token refresh logic and added session management.

Actions:
[View in JIRA] [Edit] [Delete]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Actions Available

**View in JIRA:**
- Opens original worklog in JIRA
- Useful for adding comments or editing in JIRA directly

**Edit (Admin/Manager only):**
- Modify worklog details (hours, date, billable status)
- **⚠️ Warning:** Changes here do NOT sync back to JIRA
- Use sparingly - prefer editing in JIRA and re-syncing

**Delete (Admin only):**
- Permanently remove worklog from dashboard
- **⚠️ Warning:** Does not delete from JIRA
- Use for imported errors or duplicates

---

## Bulk Actions

Select multiple worklogs using checkboxes:

<!-- TODO: Add screenshot of bulk actions toolbar -->

### Mark as Billable/Non-Billable

1. Check worklogs you want to modify
2. Click "Mark as Billable" or "Mark as Non-Billable"
3. Confirm action

**Use case:** Correcting billable status for invoice preparation

### Export Selected

1. Check worklogs to export
2. Click "Export Selected"
3. Choose format: CSV, Excel, PDF
4. File downloads automatically

**Use case:** Client reporting, accounting system import

### Bulk Delete (Admin only)

1. Check worklogs to delete
2. Click "Delete Selected"
3. Confirm (this cannot be undone)

**⚠️ Warning:** Use with caution! This does not delete from JIRA.

---

## Searching Worklogs

### Quick Search (Top Bar)

<!-- TODO: Add screenshot of quick search -->

Type in search box to instantly filter worklogs:

**Search Capabilities:**
- Issue keys: `PROJ-123`
- User emails: `john@company.com`
- User names: `John Doe`
- Issue summaries: `login bug`
- Epic names: `Authentication`
- Comments: `meeting notes`

**Tips:**
- Search is case-insensitive
- Matches partial words (typing "auth" finds "Authentication")
- Results update as you type

### Saved Searches

**Create a Saved Search:**
1. Apply filters to find what you need
2. Click "Save Search" button
3. Name your search (e.g., "My Billable This Month")
4. Click "Save"

**Load a Saved Search:**
1. Click "Saved Searches" dropdown
2. Select saved search name
3. Filters apply automatically

**Common Saved Searches:**
- "My worklogs this week"
- "Team billable hours this month"
- "Non-billable internal work"
- "Client A worklogs"

**Edit/Delete Saved Searches:**
- Click ⋯ icon next to saved search name
- Select "Edit" or "Delete"

---

## Exporting Worklogs

### Export Formats

**CSV (Comma-Separated Values):**
- ✅ Best for: Excel, Google Sheets, accounting software
- ✅ Lightweight file size
- ✅ All columns included
- ❌ No formatting (raw data)

**Excel (XLSX):**
- ✅ Best for: Professional reports, formatted spreadsheets
- ✅ Includes formatting (colors, borders, totals)
- ✅ Auto-calculated summary row
- ❌ Larger file size

**PDF:**
- ✅ Best for: Client-facing reports, archiving
- ✅ Professional appearance
- ✅ Can't be edited (tamper-proof)
- ❌ Not machine-readable

### How to Export

1. Apply filters to select worklogs you want
2. Click "Export" button (top-right)
3. Choose format
4. (Optional) Customize columns
5. Click "Download"

### Export Options

**Include/Exclude Columns:**
- Check boxes for columns you want in export
- Useful to hide rates for client-facing reports

**Group By:**
- None (default): Flat list
- User: Subtotals per user
- Project: Subtotals per project
- Date: Subtotals per day/week/month

**Summary Row:**
- Toggle on/off
- Shows totals: Hours, Billable Amount, etc.

---

## Worklog Calendar View

Switch to calendar view for visual time tracking:

<!-- TODO: Add screenshot of calendar view -->

**Features:**
- Day, Week, or Month view
- Color-coded by project or user
- Click day to see detailed worklogs
- Identify gaps (days with no worklogs)

**How to Access:**
1. Go to Users → [Your Name]
2. Click "Calendar View" tab
3. Navigate with ← → buttons

**Use case:** Visual review of your time allocation over weeks/months

---

## Understanding Billable vs. Non-Billable

### What Makes a Worklog Billable?

**Automatically Billable if:**
- ✅ Issue is in a billable project
- ✅ Rate cascade assigns a rate > $0
- ✅ Epic/Issue has billable flag enabled

**Manually Set:**
- Admins/Managers can override billable status
- Use bulk actions or edit individual worklogs

### Why Some Worklogs Show $0 Rate?

**Common reasons:**
1. No rate configured in rate cascade (defaults to $0)
2. Internal project (intentionally non-billable)
3. Worklog marked as non-billable manually
4. Issue not associated with any client

**To fix:** Configure rates in Billing → Rate Management

---

## Common Workflows

### Workflow 1: Weekly Self-Review

**Goal:** Verify your own time entries are accurate

1. Go to Users → [Your Name]
2. Set date range: "This Week"
3. Sort by Date (newest first)
4. Spot-check each worklog:
   - ✅ Hours are correct
   - ✅ Issue is right
   - ✅ Description makes sense
5. Fix errors in JIRA (then re-sync)

### Workflow 2: Manager Weekly Audit

**Goal:** Review team worklogs for anomalies

1. Set filters:
   - Team: [Your Team]
   - Date: Last 7 Days
2. Sort by Hours (highest first)
3. Check for:
   - 🔴 Unusually high hours (>12h in one day)
   - 🟡 Missing days (expected workdays with 0 hours)
   - 🟢 Suspicious issues (team working on wrong projects)
4. Follow up with team members as needed

### Workflow 3: Client Billing Prep

**Goal:** Extract billable hours for client invoice

1. Set filters:
   - Date: Last Month
   - Instance: [Client's JIRA]
   - Billable: Yes
2. Review totals (bottom of table)
3. Export as Excel
4. Attach to invoice or import into accounting system

### Workflow 4: Project Time Analysis

**Goal:** Understand time spent on specific project

1. Quick Search: Type project key (e.g., "PROJ")
2. All issues in that project appear
3. Review:
   - Total hours
   - Distribution by user
   - Billable percentage
4. Export for project retrospective

---

## Troubleshooting

### "No worklogs found"

**Check:**
1. ✅ Date range includes expected worklogs
2. ✅ Filters aren't too restrictive
3. ✅ Last sync timestamp (may need to sync)
4. ✅ User has worklogs in JIRA (verify directly)

### Worklog appears in JIRA but not dashboard

**Possible causes:**
1. Haven't synced since worklog was created
2. Worklog outside selected date range
3. JIRA sync error (check Settings → Sync Logs)

**Solution:** Run a fresh sync

### Wrong hours displayed

**Common causes:**
1. JIRA timezone differs from dashboard timezone
2. Worklog edited in JIRA after last sync
3. Rounding differences (JIRA uses minutes, dashboard uses decimal hours)

**Solution:** Re-sync to get latest data

### Can't edit or delete worklog

**Check your role:**
- **USER:** Can only view own worklogs (read-only)
- **MANAGER:** Can edit all worklogs (but not delete)
- **ADMIN:** Can edit and delete

**Contact admin if you need different permissions**

---

## Best Practices

### ✅ Do's

**✅ Review worklogs weekly**
- Catch errors early
- Verify billable status
- Confirm accurate issue assignment

**✅ Use saved searches**
- Save time with common filters
- Share search links with team

**✅ Export before month-end**
- Archive data for compliance
- Backup for accounting

**✅ Add worklog comments**
- In JIRA, add descriptive comments
- Helps billing managers understand work

### ❌ Don'ts

**❌ Don't edit in dashboard**
- Edit in JIRA first, then re-sync
- Dashboard edits don't sync back

**❌ Don't delete synced worklogs**
- Creates data inconsistency
- Delete in JIRA instead

**❌ Don't rely on stale data**
- Always check last sync timestamp
- Re-sync before critical reports

---

## Next Steps

- **[Billing System](./billing.md)** - Configure rates for automatic billable calculations
- **[Invoice Generation](./invoices.md)** - Turn worklogs into professional invoices
- **[Team Management](./teams.md)** - Organize users for better filtering

---

*🔍 The details matter. Accurate worklogs lead to accurate billing.*
