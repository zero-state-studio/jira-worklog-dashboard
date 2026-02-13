# Frequently Asked Questions (FAQ)

Quick answers to common questions about the JIRA Worklog Dashboard.

---

## Getting Started

### What is JIRA Worklog Dashboard?

A platform that consolidates worklog data from multiple JIRA instances into a unified dashboard with automated billing, analytics, and invoice generation.

**Think of it as:** A central hub for all your JIRA time tracking across different projects, clients, and instances.

---

### Do I need to install anything?

**Desktop app:** Yes, download and install the app for your OS (macOS, Windows, Linux)

**Web app:** No installation needed - just visit the URL in your browser

**Recommended:** Desktop app for better performance and offline access

---

### How much does it cost?

Pricing information is available from your system administrator or at [pricing page URL]. Typically billed per user per month.

---

### Can I try it before committing?

Contact your administrator about trial options. Many organizations offer 30-day free trials.

---

## Authentication & Access

### Why do I need a Google account?

We use Google OAuth for secure, password-free authentication. It's faster, more secure, and means one less password to remember.

**Don't have Google?** Create a free Gmail account at gmail.com

---

### My Google email is different from my JIRA email. Will it work?

Yes! Admins can map your JIRA email to your Google login email. Contact your administrator to set this up.

**Example:** JIRA uses `john@client.com`, but you log in with `john@yourcompany.com`

---

### Can I use multiple email addresses?

Your dashboard account has ONE primary email (Google login), but admins can add email aliases to match different JIRA accounts.

---

### How do I reset my password?

We don't use passwords! You log in with Google. To reset your Google password, visit [myaccount.google.com](https://myaccount.google.com)

---

## Syncing Worklogs

### How often does data sync from JIRA?

**Manual sync:** You click "Sync" button whenever you want fresh data

**Automatic sync:** Not yet available (coming Q2 2026)

**Recommendation:** Sync daily or before generating invoices

---

### Why isn't my sync real-time?

JIRA's API has rate limits (300 requests/minute). Real-time syncing would quickly hit these limits. Manual sync gives you control and avoids quota issues.

**Future:** Optional real-time sync planned for Q3 2026

---

### How long does a sync take?

**With Tempo API:**
- 7 days: ~30 seconds
- 30 days: ~1-2 minutes
- 1 year: ~10-15 minutes

**Without Tempo (native JIRA):**
- 5-10x slower

**Tip:** Add Tempo API token for much faster syncing!

---

### Can I sync while others are using the dashboard?

Yes! Sync runs in the background and doesn't block other users.

---

### What if JIRA is down during sync?

Sync will fail gracefully with an error message. Just retry when JIRA is back online.

---

## Worklogs & Data

### Why don't I see any worklogs?

**Check these:**
1. Have you run a sync? (Click "Sync" button)
2. Is the date range correct?
3. Do worklogs exist in JIRA for this period?
4. Is your JIRA email mapped correctly?

**Still stuck?** Contact your administrator

---

### Why are some worklogs missing?

**Common causes:**
1. Worklogs logged after last sync (run fresh sync)
2. Worklogs in projects your API token can't access
3. Date range filter excluding them
4. JIRA instance not selected in filters

---

### Can I edit worklogs in the dashboard?

**Admins/Managers:** Yes, but changes don't sync back to JIRA

**Best practice:** Edit in JIRA first, then re-sync

**Users:** Cannot edit worklogs (read-only)

---

### Can I delete worklogs?

**Admins only:** Yes, but this doesn't delete from JIRA - only from dashboard

**Use case:** Removing duplicate or erroneous imports

---

### How far back can I see worklogs?

As far back as you've synced. The dashboard doesn't limit historical data - JIRA is the limit.

**Tip:** Sync a long date range once (e.g., "All Time") to backfill historical data

---

## Billing & Invoicing

### How does the rate cascade work?

Rates are checked in priority order until a match is found:

1. **Package** (highest priority)
2. **Issue**
3. **Epic**
4. **Project**
5. **Client**
6. **Default** (fallback)

**First match wins!** See [Billing Guide](./user-guide/billing.md) for details

---

### Why are all my worklogs showing $0?

**Cause:** No rates configured in billing system

**Solution:**
1. Go to Settings → Billing → Clients
2. Add clients with default rates
3. Or set a Default Rate as fallback
4. Regenerate billing preview

---

### Can I override rates for specific invoices?

Yes! In the billing preview, you can adjust individual worklog rates before generating the invoice.

**Use case:** Negotiated discounts, rush job premiums, rounding

---

### How do I mark work as non-billable?

**Automatically:** Set rate to $0 at any cascade level

**Manually:** Select worklogs → "Mark as Non-Billable"

**Common non-billable:** Internal projects, training, meetings

---

### Can I export invoices to my accounting software?

Yes! Export invoices as CSV or Excel, then import into QuickBooks, Xero, FreshBooks, etc.

**Tip:** Export includes all line-item details for easy import

---

## Teams & Users

### What's the difference between Teams and Roles?

**Teams:** Grouping for reporting (e.g., "Engineering Team", "Design Team")
- Used for filtering and analytics
- Users can belong to multiple teams
- No permission impact

**Roles:** Permission levels (ADMIN, MANAGER, USER)
- Determines what user can access
- Each user has ONE role
- Controls security and access

---

### Can I be on multiple teams?

Yes! Users can belong to any number of teams.

**Example:** You could be on "Engineering", "Client A Project", and "Leadership" teams

---

### How do I join a team?

Contact your administrator - they assign team memberships.

**Users cannot** add themselves to teams.

---

### Why can't I see other users' worklogs?

**Cause:** You have USER role (can only see own worklogs)

**Solution:** If you need broader visibility, ask admin to upgrade you to MANAGER role

**Security:** This is intentional - protects individual privacy

---

## Technical Issues

### The dashboard is slow. What can I do?

**Try these:**
1. Clear browser cache (Ctrl+Shift+Delete)
2. Use desktop app (faster than web)
3. Reduce date range (fewer worklogs to load)
4. Close other tabs/apps
5. Check internet connection

**Still slow?** Contact your administrator - may be server issue

---

### I'm getting "Session Expired" errors

**Cause:** Your login session expired (default: 24 hours)

**Solution:** Log out and log back in with Google

**Tip:** Enable "Remember Me" to stay logged in longer

---

### Charts aren't loading

**Common fixes:**
1. Refresh page (Ctrl+R or Cmd+R)
2. Try different browser (Chrome, Firefox, Safari)
3. Disable browser extensions (ad blockers can interfere)
4. Check console for errors (F12 → Console tab)

**Report to admin if persists**

---

### Desktop app won't launch

**Windows:** Check Windows Defender didn't block it
**macOS:** Go to System Preferences → Security → Allow app
**Linux:** Verify executable permissions (`chmod +x`)

**Still stuck?** Reinstall the app

---

## Features & Functionality

### Can I export my data?

**All users:** Export your own worklog data (CSV, Excel, PDF)

**Admins:** Export all company data (Settings → Data → Export)

**Format options:** CSV, Excel, JSON, PDF

---

### Is there a mobile app?

Not yet! Planned for Q4 2026.

**Current workaround:** Web app works on mobile browsers (responsive design)

---

### Can I get notifications when sync completes?

Yes! Enable in Settings → Notifications → "Sync Complete"

**Options:** Email, in-app notification, or both

---

### Can I customize the dashboard?

**Limited customization:**
- ✅ Date range default
- ✅ Theme (light/dark)
- ✅ Show/hide certain widgets
- ❌ Full drag-and-drop customization (coming Q2 2026)

---

### Does it work offline?

**Desktop app:** Yes, for viewing data. Syncing requires internet.

**Web app:** No, requires internet connection

---

## Integrations

### What JIRA versions are supported?

**JIRA Cloud:** Fully supported (current primary use case)

**JIRA Server/Data Center:** Partially supported (requires on-premise deployment)

**JIRA versions:** Compatible with JIRA 7.x, 8.x, 9.x

---

### Do I need Tempo Timesheets?

**No, but highly recommended!**

**Without Tempo:** Uses native JIRA worklog API (slower)

**With Tempo:** 5-10x faster sync, better date filtering

**Cost:** Tempo is a separate paid add-on from Atlassian

---

### Can it integrate with [other tool]?

**Currently supported:**
- ✅ JIRA Cloud
- ✅ Tempo Timesheets
- ✅ Factorial HR (for absences)
- ✅ Google OAuth

**Coming soon:**
- 📋 Slack notifications (Q2 2026)
- 📋 Microsoft Teams (Q2 2026)
- 📋 Webhooks (Q2 2026)

**Want something else?** Request via your admin

---

## Security & Privacy

### Is my data secure?

Yes! See [Security Guide](./admin-guide/security.md) for full details.

**Key protections:**
- 🔒 Multi-tenant isolation (your data never visible to other companies)
- 🔐 Google OAuth (no passwords to leak)
- 🛡️ HTTPS encryption (data in transit)
- 🔑 Encrypted credentials (JIRA tokens)

---

### Can other companies see my worklogs?

**Absolutely not.** Multi-tenant isolation ensures complete data separation.

Each company's data is filtered at the database level - it's impossible to accidentally access another company's data.

---

### Who can see my worklogs?

**Within your company:**
- **ADMIN:** Can see all worklogs
- **MANAGER:** Can see all worklogs
- **USER:** Can only see their own worklogs

**Outside your company:** No one

---

### Can I delete my data?

**Users:** Request deletion from your administrator (GDPR right to erasure)

**Admins:** Can delete any user's data (Settings → Users → Delete)

**Note:** Deletion is permanent and cannot be undone

---

## Billing & Subscription

### How am I billed?

Contact your administrator - they manage company subscription.

**Typical model:** Per-user per-month pricing

---

### What happens if my subscription lapses?

**Immediate:**
- Cannot sync new worklogs
- Cannot generate new invoices

**After 30 days:**
- Read-only mode (view existing data)
- Cannot edit or export

**After 90 days:**
- Account suspended
- Data retained for 1 year (for reactivation)

---

### Can I cancel anytime?

Subscription terms vary by plan. Contact your administrator or sales team.

**Tip:** Export all data before canceling (Settings → Data → Export)

---

## Support

### How do I get help?

1. **Check this FAQ** (you're here!)
2. **Read the User Guide** ([Dashboard](./user-guide/dashboard.md), [Worklogs](./user-guide/worklogs.md), etc.)
3. **Try Troubleshooting Guide** ([troubleshooting.md](./troubleshooting.md))
4. **Contact your administrator** (they may have internal support)
5. **Email support** (if provided by your organization)

---

### I found a bug. How do I report it?

**Report to your administrator.** They can:
1. Verify the issue
2. Check if it's already known
3. Submit to development team with details

**Include:**
- What you were doing
- What you expected
- What actually happened
- Screenshots (if helpful)

---

### Can I request new features?

Yes! Submit feature requests through your administrator.

**Popular requests** are prioritized for future releases. Check [Changelog](./changelog.md) for what's coming.

---

## Still have questions?

**Can't find your answer here?**

- Review the full [User Guide](./user-guide/dashboard.md)
- Check the [Troubleshooting Guide](./troubleshooting.md)
- Contact your system administrator
- Email support (if your organization provides support)

---

*💡 Most answers are just a click away. Keep exploring the docs!*
