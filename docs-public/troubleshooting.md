# Troubleshooting Guide

Solutions to common problems in the JIRA Worklog Dashboard.

---

## Quick Diagnostics

**Before diving into specific issues, try these universal fixes:**

### The "Turn It Off and On Again" Checklist

1. **Refresh the page** (Ctrl+R or Cmd+R)
2. **Clear browser cache**
   - Chrome: Ctrl+Shift+Delete
   - Firefox: Ctrl+Shift+Delete
   - Safari: Cmd+Option+E
3. **Log out and back in**
4. **Try incognito/private mode** (rules out extensions)
5. **Try a different browser** (Chrome, Firefox, Safari, Edge)
6. **Check your internet connection**
7. **Restart the desktop app** (if using desktop version)

**80% of issues resolve with one of these steps!**

---

## Login & Authentication Issues

### "Unable to log in with Google"

**Symptoms:** Clicking "Login with Google" does nothing, or redirects back to login page

**Possible causes:**
1. Pop-ups blocked by browser
2. Third-party cookies disabled
3. Google account issue

**Solutions:**

**Step 1: Allow pop-ups**
- Chrome: Click 🚫 icon in address bar → "Always allow pop-ups from this site"
- Firefox: Preferences → Privacy → Permissions → Unblock pop-ups
- Safari: Preferences → Websites → Pop-up Windows → Allow

**Step 2: Enable third-party cookies**
- Chrome: Settings → Privacy → Cookies → "Allow all cookies" (temporarily)
- Firefox: Settings → Privacy → Custom → "Cookies from unvisited websites" (check)

**Step 3: Try different Google account**
- Log out of all Google accounts
- Try logging in with correct email

**Step 4: Clear Google auth**
- Go to [myaccount.google.com/permissions](https://myaccount.google.com/permissions)
- Remove "JIRA Worklog Dashboard" app
- Try logging in again (will re-authorize)

---

### "Session Expired" or "401 Unauthorized"

**Symptoms:** Logged in successfully, but get logged out quickly or see "Unauthorized" errors

**Cause:** Session token expired (default: 24 hours)

**Solutions:**

**Step 1: Log out and back in**
- Click profile menu → "Logout"
- Log back in with Google
- Check "Remember me" (if available)

**Step 2: Clear application cookies**
- Chrome: Settings → Privacy → Cookies → "See all site data" → Find dashboard URL → Remove
- Refresh page and log in again

**Step 3: Check system time**
- Ensure your computer's clock is accurate
- JWT tokens are time-sensitive
- Windows: Settings → Time & Language → Sync now
- macOS: System Preferences → Date & Time → "Set date and time automatically"

---

### "Wrong user email" or "Cannot match JIRA user"

**Symptoms:** Logged in, but no worklogs appear (even after sync)

**Cause:** Your Google email differs from your JIRA email

**Solution:**

**Contact your administrator** to add an email alias:
- JIRA email: `john@client.com`
- Google email: `john@yourcompany.com`
- Admin can map these together

**Why this happens:** JIRA worklogs are tied to JIRA email, but you log in with Google email

---

## Sync Issues

### Sync button doesn't work / nothing happens

**Symptoms:** Click "Sync" button, but no progress indicator appears

**Solutions:**

**Step 1: Check browser console**
- Press F12 (or Cmd+Option+I on Mac)
- Click "Console" tab
- Look for red error messages
- Screenshot and send to admin

**Step 2: Verify JIRA connection**
- Settings → JIRA Instances
- Click "Test Connection" on each instance
- Fix any that show ❌ Failed

**Step 3: Disable browser extensions**
- Ad blockers, privacy tools can interfere
- Try in incognito mode (extensions disabled by default)

---

### Sync takes forever (>10 minutes)

**Causes:**
1. Large date range (syncing years of data)
2. Many worklogs (>10,000)
3. Not using Tempo API (native JIRA is slow)
4. Slow internet connection

**Solutions:**

**Quick fix: Reduce date range**
- Instead of "All Time", try "Last 30 Days"
- Sync in chunks (Jan, then Feb, then Mar, etc.)

**Long-term fix: Add Tempo API token**
- Tempo is 5-10x faster than native JIRA
- See [JIRA Setup Guide](./admin-guide/jira-setup.md)
- Ask admin to add Tempo token

**Monitor progress:**
- Sync dialog shows progress (worklogs fetched, current instance)
- If stuck at same number for >5 minutes, cancel and retry

---

### Sync fails with "Authentication Error"

**Symptoms:** Sync starts, then fails with "401 Unauthorized" or "403 Forbidden"

**Cause:** JIRA API token is invalid, expired, or lacks permissions

**Solutions:**

**Step 1: Test JIRA connection**
- Settings → JIRA Instances → [Instance Name]
- Click "Test Connection"
- If fails: Token is bad

**Step 2: Regenerate API token**
- Go to [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
- Delete old token
- Create new token
- Update in dashboard: Settings → JIRA Instances → Edit → Paste new token

**Step 3: Verify JIRA permissions**
- Your JIRA account needs "Browse Projects" permission
- Ask JIRA administrator if unsure

---

### Sync succeeds but worklogs missing

**Symptoms:** Sync completes with "X worklogs synced", but dashboard shows fewer (or none)

**Possible causes:**
1. Worklogs outside selected date range
2. User email mismatch (see above)
3. Synced to wrong company (if multi-company setup)

**Solutions:**

**Step 1: Expand date range**
- Dashboard → Date picker → "All Time"
- Do worklogs appear now?

**Step 2: Check filters**
- Clear all filters (Team, Instance, User)
- Look at raw worklog list
- Are worklogs there but filtered out?

**Step 3: Verify in JIRA directly**
- Log into JIRA
- Search for your worklogs: `worklogAuthor = currentUser() AND worklogDate >= -30d`
- Do worklogs exist in JIRA?
- If not: Log time in JIRA first, then sync

**Step 4: Check sync logs**
- Settings → Sync History
- Expand latest sync
- Look for errors or warnings

---

### Sync fails with "Rate Limit Exceeded"

**Symptoms:** Sync fails with "429 Too Many Requests" error

**Cause:** JIRA API rate limit hit (300 requests/minute for Cloud)

**Solutions:**

**Immediate:**
- Wait 5-10 minutes
- Retry sync

**Prevention:**
- Don't sync multiple large date ranges simultaneously
- Use Tempo API (more efficient, fewer requests)
- Sync one instance at a time (uncheck others)

**For admins:**
- Stagger automated syncs
- Monitor API usage in JIRA admin console

---

## Worklog Display Issues

### "No worklogs found" but I know I logged time

**Symptoms:** Dashboard shows "No worklogs found" message

**Checklist:**

1. **☑ Have you synced?**
   - Click "Sync" button (top-right)
   - First-time users have empty dashboard until first sync

2. **☑ Date range includes your worklogs?**
   - Default: Last 7 days
   - Try "Last 30 Days" or "All Time"

3. **☑ Correct JIRA instance selected?**
   - Dropdown at top: "All Instances" or specific one
   - Maybe your worklogs are in different instance

4. **☑ Filters cleared?**
   - Remove Team, User, Project filters
   - Click "Reset Filters"

5. **☑ USER role limitation?**
   - USER role only sees own worklogs
   - If using someone else's account, won't see their data

---

### Wrong hours showing (different from JIRA)

**Causes:**
1. Timezone difference (JIRA vs. Dashboard)
2. Stale data (needs fresh sync)
3. Rounding difference (JIRA uses minutes, Dashboard uses decimal hours)

**Solutions:**

**Step 1: Check timezone**
- Settings → Profile → Timezone
- Should match your actual timezone
- Change and refresh

**Step 2: Run fresh sync**
- Worklogs may have been edited in JIRA after last sync
- Re-sync to get latest data

**Step 3: Verify in JIRA**
- Log into JIRA
- Check worklog detail
- Compare exact times and durations
- If JIRA is correct, dashboard will match after sync

---

### Charts not loading or showing "No data"

**Symptoms:** Dashboard loads, but charts are empty or show loading spinner forever

**Solutions:**

**Step 1: Check browser console**
- F12 → Console
- Look for JavaScript errors
- Screenshot for admin

**Step 2: Disable browser extensions**
- Ad blockers, privacy tools can block chart libraries
- Try incognito mode

**Step 3: Clear browser cache**
- Ctrl+Shift+Delete
- Check "Cached images and files"
- Clear and refresh

**Step 4: Try different browser**
- Chrome, Firefox, Safari, Edge
- If works in one browser: Problem is browser-specific

---

## Billing & Invoice Issues

### Billing preview shows $0 for all worklogs

**Cause:** No rates configured

**Solution:**

**Step 1: Set default rate**
- Settings → Billing → Default Rate
- Enter your standard hourly rate (e.g., $125)
- Save

**Step 2: Configure client rates**
- Settings → Billing → Clients → Add Client
- Enter client name and default rate
- Map JIRA projects to clients

**Step 3: Regenerate preview**
- Billing → Preview
- Select client and date range
- Rates should now apply

**See:** [Billing Guide](./user-guide/billing.md) for full rate cascade setup

---

### Invoice PDF won't generate

**Symptoms:** Click "Generate Invoice", but nothing happens or error message

**Possible causes:**
1. Too many line items (>1000)
2. Browser timeout
3. Server overload

**Solutions:**

**Step 1: Reduce line items**
- Filter to smaller date range
- Or specific project
- Aim for <500 worklogs per invoice

**Step 2: Try desktop app**
- Desktop app more reliable for large invoices
- Download and install if using web

**Step 3: Split invoice**
- Generate multiple invoices for same period
- Split by project or team
- Combine manually if needed

**Step 4: Contact admin**
- May be server-side issue
- Admin can check logs

---

### Wrong rate applied to worklog

**Symptoms:** Worklog has unexpected hourly rate in billing preview

**Cause:** Rate cascade matching wrong level

**Solution:**

**Step 1: Check which cascade level matched**
- View worklog detail
- Shows "Rate source: [Client/Project/Epic/Issue]"
- Verify that rate is correct

**Step 2: Understand cascade priority**
- Package > Issue > Epic > Project > Client > Default
- Higher levels override lower levels
- First match wins

**Step 3: Fix rate at appropriate level**
- Go to Settings → Billing
- Update rate at the level that matched
- Or add rate at higher level to override

**Example:**
- Client rate: $100/hr
- Project rate: $125/hr
- Worklog uses $100/hr (Client level)
- Why? No project rate configured for this project
- Fix: Add project to Settings → Billing → Project Rates

---

## Performance Issues

### Dashboard is very slow

**Symptoms:** Pages take >5 seconds to load, charts lag, UI freezes

**Quick fixes:**

**Step 1: Reduce data volume**
- Shorten date range (Last 7 Days instead of All Time)
- Filter to specific team or instance
- Fewer worklogs = faster rendering

**Step 2: Close other tabs/apps**
- Browser memory limits
- Close unused tabs
- Quit memory-heavy apps

**Step 3: Clear browser cache**
- Ctrl+Shift+Delete
- Clear "Cached images and files"
- Refresh page

**Step 4: Use desktop app**
- Desktop app faster than web (no network latency)
- Download from admin

**Step 5: Check internet speed**
- Slow connection = slow loading
- Run speed test: [fast.com](https://fast.com)
- If slow: Use desktop app (less data transfer)

---

### Sync is getting slower over time

**Cause:** Database growing (more worklogs, more data)

**Solutions for admins:**

**Step 1: Optimize database**
- Settings → Advanced → Optimize Database
- Compacts storage, rebuilds indexes
- Run monthly

**Step 2: Archive old worklogs**
- Settings → Data Retention
- Archive worklogs >2 years old
- Keeps database lean

**Step 3: Consider PostgreSQL**
- For very large datasets (>100K worklogs)
- SQLite has limits
- Contact support for migration

---

## Desktop App Issues

### App won't launch (macOS)

**Symptoms:** Double-click app, nothing happens

**Cause:** macOS Gatekeeper blocking unsigned app

**Solution:**

**Step 1: Allow app in Security settings**
1. System Preferences → Security & Privacy
2. See message: "App was blocked from opening"
3. Click "Open Anyway"
4. Confirm

**Step 2: Right-click open**
1. Right-click app icon
2. Select "Open"
3. Click "Open" in warning dialog
4. App launches (only needed once)

**Step 3: Remove quarantine attribute**
```bash
xattr -d com.apple.quarantine /Applications/WorklogDashboard.app
```

---

### App won't launch (Windows)

**Symptoms:** Double-click, Windows Defender or SmartScreen blocks

**Cause:** App not code-signed (yet)

**Solution:**

**Step 1: Windows Defender**
1. Click "More info" in warning
2. Click "Run anyway"
3. App launches

**Step 2: SmartScreen**
1. Open Windows Security
2. App & browser control → Reputation-based protection settings
3. Turn off "Check apps and files" (temporarily)
4. Launch app
5. Turn protection back on

**Step 3: Add exception**
1. Windows Security → Virus & threat protection
2. Exclusions → Add exclusion
3. Browse to app folder
4. Add exception

---

### Desktop app: "Cannot connect to backend"

**Symptoms:** App opens, but shows "Backend unavailable" error

**Cause:** Backend server not starting

**Solutions:**

**Step 1: Check if backend running**
- macOS/Linux: `ps aux | grep worklog`
- Windows: Task Manager → Find "worklog-backend"
- If not running: Backend crashed

**Step 2: Restart app**
- Quit app completely (not just close window)
- Re-launch
- Backend auto-starts

**Step 3: Check backend logs**
- macOS: `~/Library/Logs/WorklogDashboard/backend.log`
- Windows: `%APPDATA%\WorklogDashboard\logs\backend.log`
- Linux: `~/.local/share/WorklogDashboard/logs/backend.log`
- Share with admin if errors

**Step 4: Reinstall app**
- Uninstall current version
- Download fresh copy
- Install and launch

---

## Data Export Issues

### Export fails or file is empty

**Symptoms:** Click "Export", download succeeds, but file is 0KB or won't open

**Solutions:**

**Step 1: Check export size limit**
- Very large exports (>50,000 worklogs) may timeout
- Reduce date range
- Export in chunks (Jan-Mar, Apr-Jun, etc.)

**Step 2: Try different format**
- CSV instead of Excel
- PDF instead of CSV
- Different formats have different size limits

**Step 3: Check disk space**
- Ensure enough free disk space (at least 1GB)
- Clean up downloads folder

**Step 4: Disable antivirus temporarily**
- Some antivirus blocks file creation
- Temporarily disable, try export, re-enable

---

### Exported CSV has encoding issues (special characters)

**Symptoms:** Accented characters (é, ñ, ü) display as gibberish

**Cause:** Excel doesn't auto-detect UTF-8

**Solution:**

**Open CSV correctly in Excel:**
1. Excel → Data → Get Data → From Text/CSV
2. Select your file
3. **File Origin:** "65001: Unicode (UTF-8)"
4. Click "Load"
5. Characters display correctly

**Alternative: Use Google Sheets**
- Upload CSV to Google Sheets
- Automatically handles UTF-8

---

## Error Messages Decoded

### "Company not found"

**Meaning:** Your user account is not associated with any company

**Cause:** Rare setup issue during invitation

**Solution:** Contact administrator - they need to re-invite you

---

### "Insufficient permissions"

**Meaning:** Your user role doesn't allow this action

**Examples:**
- USER trying to view other users' worklogs (need MANAGER)
- MANAGER trying to add JIRA instance (need ADMIN)

**Solution:** Contact administrator to request role upgrade (if justified)

---

### "Resource not found" or 404

**Meaning:** Data you're trying to access doesn't exist or belongs to different company

**Possible causes:**
1. Worklog/invoice/user was deleted
2. URL is incorrect (typo)
3. Multi-tenant isolation (trying to access other company's data)

**Solution:**
- Verify URL is correct
- Check if resource was deleted
- Use navigation menu instead of bookmarked URLs

---

### "Network error" or "Failed to fetch"

**Meaning:** Browser couldn't reach server

**Causes:**
1. Internet connection lost
2. Server is down
3. Firewall blocking
4. VPN issue

**Solutions:**
- Check internet connection
- Try different network (mobile hotspot)
- Disable VPN temporarily
- Contact admin (server may be down)

---

## Still Stuck?

### Escalation Path

1. **Try this guide first** (you're here!)
2. **Check FAQ** ([faq.md](./faq.md))
3. **Review User Guide** (specific to your issue area)
4. **Contact your administrator** (they may have internal KB)
5. **Submit support ticket** (via admin, with details below)

### Information to Provide

When reporting issues, include:

**Required:**
- What were you trying to do?
- What actually happened?
- Error message (exact text or screenshot)
- When did it start happening?

**Helpful:**
- Browser and version (Chrome 96, Firefox 95, etc.)
- Operating system (Windows 10, macOS 12, Ubuntu 20.04)
- Desktop or web app?
- Date range and filters applied
- Screenshots or screen recording

**Example good report:**
```
Problem: Sync fails with "Rate limit exceeded"

Steps:
1. Logged in at 9:00 AM
2. Clicked "Sync" button
3. Selected "Last 30 Days"
4. Clicked "Start Sync"
5. After 30 seconds, error appeared

Error message: "429 Too Many Requests - Rate limit exceeded"

Environment:
- Browser: Chrome 120 on Windows 11
- Date: Feb 12, 2026, 9:00 AM PST
- JIRA instance: company.atlassian.net
- Screenshot attached

Expected: Sync completes successfully
Actual: Error after 30 seconds
```

---

*🔧 Most issues have simple fixes. Don't hesitate to ask for help!*
