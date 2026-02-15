# Quick Start Guide

Get up and running with JIRA Worklog Dashboard in just 5 minutes.

---

## Prerequisites

Before you begin, make sure you have:

✅ **Google Account** - Required for authentication (we use Google OAuth for secure login)

✅ **JIRA Access** - API credentials for at least one JIRA instance:
- JIRA Cloud URL (e.g., `yourcompany.atlassian.net`)
- JIRA API token or username/password
- (Optional) Tempo API token for better sync performance

✅ **Administrator Invite** - If joining an existing organization, you'll need an invitation link from your admin

---

## Step 1: Sign In with Google

<!-- TODO: Add screenshot of login screen -->

1. **Open the Application**
   - **Desktop:** Launch the JIRA Worklog Dashboard app
   - **Web:** Navigate to your organization's dashboard URL

2. **Click "Login with Google"**
   - You'll be redirected to Google's secure login page
   - No password needed - we use Google OAuth for authentication

3. **Authorize Access**
   - Review the permissions (we only request email and profile)
   - Click "Allow" to grant access

4. **Redirect to Dashboard**
   - You'll be automatically logged in
   - First-time users will see a welcome screen

**🔒 Security Note:** Your Google password is never shared with us. We use OAuth tokens that can be revoked anytime from your Google account settings.

---

## Step 2: Initial Setup (First-Time Users)

### For New Organizations

If you're the first user in your organization:

1. **Company Profile Setup**
   - Enter your company name
   - (Optional) Upload company logo for invoices
   - Select your timezone

2. **Create Your Admin Account**
   - Your Google email will be used as your username
   - You'll automatically be assigned the ADMIN role
   - You can add team members later

<!-- TODO: Add screenshot of company setup form -->

### For Invited Users

If you were invited by an administrator:

1. **Use the Invitation Link**
   - Click the link provided by your admin
   - You'll be added to your organization automatically

2. **Complete Your Profile**
   - Your role (ADMIN/MANAGER/USER) is pre-assigned
   - Verify your display name and email

---

## Step 3: Connect Your First JIRA Instance

Now let's connect to your JIRA account to start importing worklogs.

<!-- TODO: Add screenshot of JIRA instance setup form -->

### 3.1 Navigate to Settings

1. Click the **⚙️ Settings** icon in the top-right corner
2. Select **"JIRA Instances"** from the sidebar
3. Click **"Add JIRA Instance"** button

### 3.2 Enter JIRA Credentials

**Required Fields:**

| Field | Description | Example |
|-------|-------------|---------|
| **Instance Name** | Friendly name for this JIRA | "Main Company JIRA" |
| **JIRA URL** | Your Atlassian URL (without https://) | `yourcompany.atlassian.net` |
| **Authentication Type** | Basic Auth or API Token | Choose "API Token" (recommended) |
| **Email** | Your JIRA email | `you@company.com` |
| **API Token** | Token from JIRA | See instructions below |

**Optional Fields:**

| Field | Description |
|-------|-------------|
| **Tempo API Token** | For faster sync (highly recommended) |
| **Description** | Notes about this instance |

### 3.3 Get Your JIRA API Token

**Don't have an API token yet?**

1. Go to [https://id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click **"Create API token"**
3. Give it a label (e.g., "Worklog Dashboard")
4. Copy the token (you won't see it again!)
5. Paste into the "API Token" field

**🔐 Security:** Tokens are encrypted and stored securely. Only administrators can view or edit credentials.

### 3.4 (Optional) Get Your Tempo API Token

If you use Tempo Timesheets, adding a Tempo token significantly improves sync speed.

1. Go to [https://tempo.io/](https://tempo.io/) and log in
2. Navigate to **Settings → API Integration**
3. Click **"New Token"**
4. Copy the token
5. Paste into the "Tempo API Token" field

### 3.5 Test Connection

1. Click **"Test Connection"** to verify your credentials
2. You should see: ✅ "Connection successful"
3. If it fails, double-check your URL and credentials

### 3.6 Save

Click **"Save Instance"** to store your configuration.

---

## Step 4: Run Your First Sync

Now you're ready to import worklogs from JIRA!

<!-- TODO: Add screenshot of sync interface -->

### 4.1 Navigate to Dashboard

1. Click **"Dashboard"** in the main navigation
2. You'll see a banner: *"No worklogs found. Click Sync to import data."*

### 4.2 Configure Sync Settings

1. Click the **"Sync"** button in the top-right corner
2. **Select Date Range:**
   - **Quick Options:** Last 7 days, Last 30 days, This Month, Last Month
   - **Custom:** Pick specific start and end dates

3. **Select Instances:**
   - ✅ Check all JIRA instances you want to sync
   - (You can uncheck instances to skip them)

### 4.3 Start Sync

1. Click **"Start Sync"**
2. A progress indicator will show:
   - Number of worklogs fetched
   - Current instance being synced
   - Any errors encountered

3. **Wait for Completion**
   - Typical sync times:
     - 7 days: ~30 seconds
     - 30 days: ~2 minutes
     - 1 year: ~10-15 minutes
   - You can navigate away - sync runs in background

4. **Success!**
   - You'll see a notification: "Synced X worklogs from Y instances"
   - Your dashboard will now display data

---

## Step 5: Explore Your Dashboard

Congratulations! You now have worklog data in the dashboard.

<!-- TODO: Add screenshot of populated dashboard -->

### What You'll See:

**Key Metrics (Top Cards):**
- **Total Hours** - All logged time in selected date range
- **Billable Hours** - Only worklogs marked as billable
- **Team Members** - Number of active contributors
- **Projects** - Unique projects worked on

**Charts & Visualizations:**
- **Hours by Day** - Trend line showing daily worklog totals
- **Hours by Team** - Pie chart of team distribution
- **Top Contributors** - Bar chart of most active team members
- **Project Breakdown** - Which projects consumed the most time

**Filters (Left Sidebar):**
- Date range picker
- JIRA instance selector
- Team filter
- User filter

### Try These Actions:

1. **Change Date Range**
   - Use the date picker to view different time periods
   - Notice how charts update automatically

2. **Filter by Team**
   - If you have teams configured, filter to see specific team data
   - Great for team leads to focus on their group

3. **Drill Down**
   - Click on a chart element (e.g., a team name)
   - View detailed worklogs for that selection

4. **View Individual Worklogs**
   - Navigate to **Users** in the sidebar
   - Click on any user to see their detailed worklog history

---

## Next Steps

Now that you're set up, here's what to explore next:

### For All Users:
- **[Dashboard Guide](../user-guide/dashboard.md)** - Deep dive into all dashboard features
- **[Worklog Filtering](../user-guide/worklogs.md)** - Advanced search and filtering options
- **[Team Management](../user-guide/teams.md)** - Create teams for better organization

### For Billing Managers:
- **[Billing System Overview](../user-guide/billing.md)** - Learn about rate cascades
- **[Invoice Generation](../user-guide/invoices.md)** - Create your first invoice

### For Administrators:
- **[User Management](../admin-guide/user-management.md)** - Invite team members and assign roles
- **[Security Settings](../admin-guide/security.md)** - Understand data access controls

---

## Common Issues

### "Connection Failed" when testing JIRA credentials

**Solutions:**
1. Verify your JIRA URL is correct (no `https://`, no trailing `/`)
2. Check that your API token is valid (try creating a new one)
3. Ensure your JIRA account has permission to access worklogs
4. If using IP restrictions in JIRA, whitelist the dashboard server

### "No worklogs found" after sync

**Possible Reasons:**
1. No worklogs exist in the selected date range
2. The JIRA users in your instance don't match any configured teams
3. Sync encountered errors (check the sync log)

**Solutions:**
- Try a longer date range
- Verify worklogs exist in JIRA directly
- Check Settings → Sync Logs for error messages

### "Unauthorized" or "403 Forbidden" errors

**Cause:** Your API token or credentials don't have sufficient permissions.

**Solution:**
- Ensure your JIRA account has "Browse Projects" permission
- For Tempo: Verify your Tempo token has worklog read access
- Contact your JIRA administrator if you can't access certain projects

---

## Keyboard Shortcuts

Speed up your workflow with these shortcuts:

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Open quick search |
| `Ctrl/Cmd + S` | Trigger sync |
| `Ctrl/Cmd + ,` | Open settings |
| `Ctrl/Cmd + /` | Show keyboard shortcuts |

---

## Tips for Success

✅ **Sync Regularly** - Run a sync daily or weekly to keep data fresh

✅ **Use Tempo** - If available, Tempo API is much faster than native JIRA

✅ **Set Up Teams** - Organize users into teams for better reporting

✅ **Configure Billing Early** - If you plan to use invoicing, set up rates and clients now

✅ **Explore Filters** - The dashboard is powerful - experiment with different views

---

## Need Help?

**Stuck on something?**

- Check the [FAQ](../faq.md) for common questions
- Review the [Troubleshooting Guide](../troubleshooting.md)
- Contact your system administrator

**Ready to learn more?**

Continue to [Your First Sync](./first-sync.md) for a deeper dive into syncing strategies and best practices.

---

*🎉 You're all set! Happy worklog tracking!*
