# JIRA Setup Guide

Connect and configure your JIRA and Tempo instances for seamless worklog syncing.

---

## Overview

This guide walks administrators through connecting JIRA Cloud and Tempo Timesheets instances to the Worklog Dashboard. Each instance you connect will be available for syncing worklogs.

**What you'll need:**
- ✅ JIRA Cloud URL
- ✅ JIRA admin or user account with worklog access
- ✅ API token from JIRA
- ✅ (Optional) Tempo API token for faster syncing

---

## Prerequisites

### JIRA Permissions Required

Your JIRA account must have these permissions:
- **Browse Projects** - View projects and issues
- **View Development Tools** - Access worklogs
- **View Voters and Watchers** - See user details

**How to check:**
1. Log into JIRA
2. Go to Settings → System → Global Permissions
3. Verify your user/group has required permissions

**If missing:** Contact your JIRA administrator

### Tempo Timesheets (Optional)

If your organization uses Tempo:
- Tempo Timesheets installed in JIRA
- Tempo API token (generates faster worklog queries)
- Tempo account with read access

**Without Tempo:** Dashboard still works, but syncing is slower (uses native JIRA worklog API)

---

## Step 1: Create JIRA API Token

<!-- TODO: Add screenshot of Atlassian API tokens page -->

### 1.1 Navigate to Atlassian Account Settings

1. Go to [https://id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Log in with your JIRA credentials

### 1.2 Create New Token

1. Click **"Create API token"** button
2. **Label:** Enter descriptive name (e.g., "Worklog Dashboard - Production")
3. Click **"Create"**

### 1.3 Copy Token

**⚠️ CRITICAL:** The token is shown only once!

1. Click **"Copy"** to copy token to clipboard
2. Paste into a temporary text file
3. You'll need this in Step 3

**Security tip:** Store tokens securely (password manager). Never commit to git or share publicly.

---

## Step 2: Create Tempo API Token (Optional)

<!-- TODO: Add screenshot of Tempo API settings -->

**Skip this step if you don't use Tempo Timesheets.**

### 2.1 Access Tempo Settings

1. Log into JIRA
2. Click **Apps** → **Tempo** → **Settings**
3. Navigate to **Data Access** → **API Integration**

### 2.2 Generate Token

1. Click **"New Token"**
2. **Name:** "Worklog Dashboard"
3. **Scope:** Select "Read" permissions for:
   - Worklogs
   - Accounts
   - Users
4. Click **"Create"**

### 2.3 Copy Token

1. Token displayed once - copy immediately
2. Store securely with JIRA API token

**Why Tempo?** Tempo API is 5-10x faster than native JIRA for date-range worklog queries.

---

## Step 3: Add JIRA Instance to Dashboard

<!-- TODO: Add screenshot of add JIRA instance form -->

### 3.1 Navigate to Settings

1. Log into Worklog Dashboard
2. Click ⚙️ **Settings** (top-right)
3. Select **JIRA Instances** from sidebar
4. Click **"Add JIRA Instance"** button

### 3.2 Fill in Instance Details

**Required Fields:**

| Field | Value | Example |
|-------|-------|---------|
| **Instance Name** | Friendly display name | "Main Company JIRA" |
| **JIRA URL** | Your Atlassian URL (without https://) | `yourcompany.atlassian.net` |
| **Authentication Type** | API Token (recommended) | API Token |
| **Email** | Your JIRA email | `admin@company.com` |
| **API Token** | Token from Step 1 | `ATATTxxxx...` (paste here) |

**Optional Fields:**

| Field | Purpose |
|-------|---------|
| **Tempo API Token** | Faster sync (paste from Step 2) |
| **Description** | Notes about this instance |

### 3.3 Test Connection

1. Click **"Test Connection"** button
2. Wait 5-10 seconds
3. **Expected result:**

```
✅ Connection Successful
   - JIRA API: Connected
   - Tempo API: Connected (if token provided)
   - Projects accessible: 12
   - Users found: 45
```

**If test fails:** See [Troubleshooting](#troubleshooting-connection-issues) below

### 3.4 Save Instance

1. Click **"Save Instance"**
2. Instance appears in list with ✅ Connected status
3. Ready to sync!

---

## Step 4: Configure Sync Settings

### 4.1 Default Sync Preferences

For each instance, configure:

**Sync Frequency:**
- Manual only (you click Sync button)
- TODO: Scheduled sync (hourly, daily, weekly) - Coming in Q2 2026

**Default Date Range:**
- Last 7 days (quick refresh)
- Last 30 days (monthly billing)
- Custom (specify)

**Include Archived Issues:**
- ✅ On - Sync worklogs from closed/archived issues
- ❌ Off - Active issues only (faster)

### 4.2 User Mapping (Optional)

**Why needed:** JIRA email may differ from Google login email

**How to configure:**
1. Settings → JIRA Instances → [Instance Name] → User Mapping
2. Add mappings:

```
JIRA Email               → Dashboard User
john.smith@client.com   → john.smith@yourcompany.com
sarah.external@abc.com  → sarah.chen@yourcompany.com
```

**Use case:** Consultants with different emails in client JIRA vs. your org

---

## Step 5: Run Your First Sync

1. Go to **Dashboard**
2. Click **Sync** button (top-right)
3. Select instance(s) to sync
4. Choose date range: "Last 30 Days"
5. Click **"Start Sync"**

**Expected time:**
- With Tempo: 1-2 minutes for 30 days
- Without Tempo: 3-5 minutes for 30 days

**Success:**
```
✅ Sync Complete
   Worklogs synced: 245
   Epics fetched: 12
   Issues updated: 89
```

---

## Managing Multiple JIRA Instances

### Use Cases for Multiple Instances

**Agency with client JIRAs:**
```
Instance 1: "Internal JIRA" (yourcompany.atlassian.net)
Instance 2: "Client A JIRA" (clienta.atlassian.net)
Instance 3: "Client B JIRA" (clientb.atlassian.net)
```

**Company with regional instances:**
```
Instance 1: "US JIRA" (us.yourcompany.atlassian.net)
Instance 2: "EU JIRA" (eu.yourcompany.atlassian.net)
```

**Departments with separate instances:**
```
Instance 1: "Engineering JIRA"
Instance 2: "Product JIRA"
Instance 3: "Support JIRA"
```

### Best Practices

**Naming convention:**
- Use descriptive names (not just "JIRA 1", "JIRA 2")
- Include client name or purpose
- Keep names short (shows in dropdowns)

**Instance organization:**
- Add Description field to document purpose
- Note point-of-contact for each instance
- Track which clients/projects use which instance

---

## Advanced Configuration

### Custom Fields (Coming Soon)

**Map JIRA custom fields to dashboard:**
- Client Name (custom field) → Billing Client
- Project Code (custom field) → Project filter
- Billable Flag (custom field) → Billable status

**Status:** Planned for Q2 2026

### Webhook Sync (Coming Soon)

**Real-time sync via JIRA webhooks:**
- Worklogs sync automatically when logged in JIRA
- No manual sync button needed
- Near-instant dashboard updates

**Status:** Planned for Q3 2026

### Project Filtering

**Exclude specific projects from sync:**
1. Settings → JIRA Instances → [Instance] → Project Filters
2. Uncheck projects to exclude
3. Useful for:
   - Internal/admin projects
   - Archived projects
   - Test/sandbox projects

---

## Security Best Practices

### API Token Security

✅ **Do:**
- Store tokens in password manager
- Use descriptive token names ("Worklog Dashboard - Prod")
- Rotate tokens every 6 months
- Revoke tokens when employee leaves

❌ **Don't:**
- Share tokens via email or Slack
- Commit tokens to git repositories
- Use same token across multiple tools
- Leave tokens in browser history

### Access Control

**Principle of least privilege:**
- Create dedicated JIRA service account for dashboard
- Grant only necessary permissions (Browse Projects, View Worklogs)
- Don't use admin account API tokens

**Audit logs:**
- JIRA tracks API token usage
- Review audit logs monthly
- Alert on suspicious activity

### Network Security

**IP Whitelisting (if required):**
- Some orgs restrict JIRA API access by IP
- Whitelist dashboard server IP in JIRA
- Cloud deployments: Use static IP

---

## Troubleshooting Connection Issues

### Error: "Authentication Failed"

**Possible causes:**
1. Incorrect email or API token
2. Token expired or revoked
3. Copy/paste error (extra spaces)

**Solutions:**
1. Regenerate API token in Atlassian
2. Copy carefully (no trailing spaces)
3. Test with curl:
   ```bash
   curl -u email@example.com:YOUR_API_TOKEN \
     https://yourcompany.atlassian.net/rest/api/3/myself
   ```
4. If curl works, try again in dashboard

### Error: "Forbidden - No Access"

**Cause:** JIRA account lacks required permissions

**Solution:**
1. Verify JIRA permissions (see [Prerequisites](#prerequisites))
2. Contact JIRA administrator
3. Grant Browse Projects permission

### Error: "Instance Not Found"

**Cause:** Incorrect JIRA URL

**Solutions:**
- ✅ Correct: `yourcompany.atlassian.net`
- ❌ Wrong: `https://yourcompany.atlassian.net` (no protocol)
- ❌ Wrong: `yourcompany.atlassian.net/` (no trailing slash)
- ❌ Wrong: `yourcompany.jira.com` (old URL format)

### Error: "Tempo API Connection Failed"

**Cause:** Tempo token invalid or insufficient permissions

**Solutions:**
1. Verify token in Tempo settings
2. Check token has "Read" scope for worklogs
3. Try without Tempo token (slower sync, but works)

### Sync Succeeds but No Worklogs

**Possible causes:**
1. No worklogs in selected date range
2. User filter excludes all worklogs
3. Projects not visible to API token user

**Solutions:**
1. Expand date range
2. Log into JIRA directly and verify worklogs exist
3. Check project permissions in JIRA

---

## Editing Existing Instances

### Updating Credentials

1. Settings → JIRA Instances
2. Click instance name
3. Update fields:
   - API Token (if rotated)
   - Tempo Token (if added)
   - Instance Name (if renamed)
4. Click **"Test Connection"** (verify still works)
5. Save Changes

### Rotating API Tokens

**When to rotate:**
- Every 6 months (routine security)
- When employee with access leaves
- If token compromised

**How to rotate:**
1. Create new API token in Atlassian (Step 1)
2. Update dashboard with new token
3. Test connection
4. Delete old token in Atlassian
5. Update documentation

---

## Deleting JIRA Instances

### Before You Delete

**⚠️ Warning:** Deleting an instance does NOT delete synced worklogs!

**Worklogs remain in dashboard** even after instance deleted.

**To fully remove:**
1. Delete worklogs manually (Worklogs → Filter by instance → Delete)
2. Then delete instance

### How to Delete

1. Settings → JIRA Instances
2. Click ⋯ menu next to instance
3. Select **"Delete Instance"**
4. Confirm deletion

**Use case:** Client project ended, no longer need their JIRA connected

---

## Monitoring Instance Health

### Instance Status Dashboard

<!-- TODO: Add screenshot of instance health dashboard -->

**View health metrics:**
1. Settings → JIRA Instances
2. Each instance shows:
   - ✅ / ❌ Connection Status
   - Last Sync timestamp
   - Sync success rate (%)
   - Average sync duration

**Red flags:**
- ❌ Connection status (token expired)
- Sync success rate < 90% (investigate errors)
- Sync duration increasing (performance issue)

### Sync Logs

**Review sync history:**
1. Settings → Sync History
2. Filter by instance
3. See detailed logs:
   - Timestamp
   - Worklogs synced
   - Errors encountered
   - Duration

**Use for:**
- Debugging sync failures
- Auditing data import
- Capacity planning (how long syncs take)

---

## Next Steps

- **[User Management](./user-management.md)** - Add team members and assign roles
- **[Your First Sync](../getting-started/first-sync.md)** - Detailed sync guide
- **[Billing Setup](../user-guide/billing.md)** - Configure rates for invoicing

---

*🔗 Connect once, sync forever. Set up your JIRA instances right.*
