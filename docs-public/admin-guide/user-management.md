# User Management

Manage team members, assign roles, and control access to the dashboard.

---

## Overview

As an administrator, you're responsible for adding users, assigning roles, and managing access to the Worklog Dashboard. This guide covers all user management tasks.

**Admin responsibilities:**
- 👥 Invite new users
- 🎭 Assign roles (ADMIN, MANAGER, USER)
- 🏢 Organize users into teams
- 🔐 Manage permissions
- ❌ Deactivate or remove users

<!-- TODO: Add screenshot of users list -->

---

## User Roles

### Understanding the 3 Roles

| Role | Access Level | Use Case |
|------|--------------|----------|
| **ADMIN** | Full access to everything | Company admins, IT managers |
| **MANAGER** | View all data, manage billing | Billing managers, team leads |
| **USER** | View only own worklogs | Individual contributors |

### ADMIN Role

**Can do:**
- ✅ All settings and configuration
- ✅ Add/remove JIRA instances
- ✅ Manage all users (invite, edit, delete)
- ✅ Assign roles
- ✅ View all worklogs company-wide
- ✅ Generate invoices
- ✅ Edit billing rates and clients
- ✅ Delete worklogs and data

**Use for:**
- Company administrators
- IT department
- Dashboard owner/maintainer

**Recommended:** 1-3 admins per company

---

### MANAGER Role

**Can do:**
- ✅ View all worklogs (entire company)
- ✅ Generate billing previews and invoices
- ✅ Manage clients, rates, and billing
- ✅ Create and manage teams
- ✅ View all users (but not edit)
- ✅ Export data

**Cannot do:**
- ❌ Add/remove JIRA instances
- ❌ Add/remove users
- ❌ Change user roles
- ❌ Modify company settings
- ❌ Delete worklogs

**Use for:**
- Billing/finance team
- Project managers
- Team leads who need full visibility

**Recommended:** 2-5 managers per company

---

### USER Role

**Can do:**
- ✅ View only their own worklogs
- ✅ See their personal dashboard
- ✅ Export their own worklog data
- ✅ Update their profile settings

**Cannot do:**
- ❌ View other users' worklogs
- ❌ Access billing features
- ❌ Manage teams
- ❌ Generate invoices
- ❌ See company-wide analytics

**Use for:**
- Individual contributors
- Developers
- Designers
- Anyone who just needs to see their own time

**Typical:** 90% of users are USER role

---

## Adding New Users

### Method 1: Email Invitation (Recommended)

<!-- TODO: Add screenshot of invite user form -->

**Step-by-step:**
1. Navigate to **Settings → Users**
2. Click **"Invite User"** button
3. Fill in invitation form:

| Field | Required | Description |
|-------|----------|-------------|
| **Email** | ✅ Yes | Must be Google account email |
| **Role** | ✅ Yes | Select ADMIN, MANAGER, or USER |
| **Display Name** | ❌ No | Pre-fill name (user can change) |
| **Teams** | ❌ No | Add to teams immediately |
| **Send Email** | ✅ Yes | Check to send invite link |

4. Click **"Send Invitation"**
5. User receives email with signup link
6. User clicks link, logs in with Google, automatically added

**Invitation email example:**
```
Subject: You've been invited to JIRA Worklog Dashboard

Hi John,

You've been invited to join Your Company's JIRA Worklog
Dashboard as a MANAGER.

Click below to accept and sign in with Google:
[Accept Invitation]

This link expires in 7 days.

Questions? Contact admin@yourcompany.com
```

---

### Method 2: Bulk User Import

**For large teams (10+ users):**

1. **Prepare CSV file:**

```csv
Email,Role,Display Name,Teams
john@company.com,USER,John Doe,Engineering
sarah@company.com,MANAGER,Sarah Chen,"Engineering,Leadership"
mike@company.com,USER,Mike Johnson,QA
```

2. **Import:**
   - Settings → Users → Import
   - Upload CSV
   - Map columns (if headers differ)
   - Preview import
   - Confirm

3. **Send invitations:**
   - Bulk select imported users
   - Click "Send Invitations"
   - All users receive emails

**Use case:** Onboarding entire department

---

### Method 3: Manual User Creation (No Email)

**For users who can't receive email:**

1. Settings → Users → Create User Manually
2. Enter email and role
3. Copy signup link
4. Share link via Slack, Teams, or in-person

**⚠️ Security:** Manual links don't expire. Delete if unused.

---

## Editing Users

### Changing User Roles

**Common scenarios:**
- Promoting USER to MANAGER (team lead promotion)
- Demoting MANAGER to USER (role change)
- Making user ADMIN (IT admin onboarding)

**How to change:**
1. Settings → Users
2. Click user's name
3. **Role** dropdown → Select new role
4. Click **"Save Changes"**

**⚠️ Important:** Role change takes effect immediately. User may need to log out and back in.

---

### Updating User Information

**Editable fields (by Admin):**
- Display Name
- Teams (add/remove)
- Role
- Status (Active / Inactive)

**User-controlled fields:**
- Email (locked to Google account)
- Profile picture
- Timezone
- Notification preferences

---

### Assigning Users to Teams

**Why assign teams?**
- Better reporting and filtering
- Workload distribution analysis
- Team-specific dashboards

**How to assign:**

**Method 1: From User Profile**
1. Settings → Users → [User Name]
2. **Teams** section
3. Check teams to add user to
4. Save

**Method 2: From Team Settings**
1. Settings → Teams → [Team Name]
2. Click "Add Members"
3. Check users to add
4. Save

**Multi-team membership:** Users can belong to multiple teams (common for cross-functional roles)

---

## Deactivating Users

### When to Deactivate

**Use cases:**
- ✅ Employee left company (preserve worklog data)
- ✅ Contractor engagement ended
- ✅ User on long-term leave
- ✅ Temporary suspension

**Don't deactivate for:**
- ❌ Changing user role (edit instead)
- ❌ Removing from team (edit teams instead)

---

### How to Deactivate

1. Settings → Users → [User Name]
2. **Status** dropdown → Select "Inactive"
3. Click "Save"

**What happens:**
- ✅ User cannot log in
- ✅ Worklogs remain visible in reports
- ✅ Past invoices unchanged
- ✅ Can be reactivated later
- ❌ User loses access immediately

**Reactivate:** Same process, set Status back to "Active"

---

## Deleting Users (Permanent)

### ⚠️ Warning: Irreversible Action

**Deleting a user:**
- ❌ Permanently removes user account
- ⚠️ Worklogs remain (attributed to deleted user email)
- ⚠️ Cannot be undone

**Recommendation:** Use "Deactivate" instead of "Delete" in most cases

---

### When to Delete

**Only delete if:**
- User created by mistake (never logged time)
- Testing account no longer needed
- Legal requirement to remove PII

**How to delete:**
1. Settings → Users → [User Name]
2. Click ⋯ menu → "Delete User"
3. Type user's email to confirm
4. Click "Delete Permanently"

---

## User Permissions

### What Each Role Can Access

**ADMIN:**
```
✅ Dashboard (all data)
✅ Teams (all)
✅ Users (all)
✅ Epics (all)
✅ Issues (all)
✅ Billing (full access)
✅ Settings (all)
✅ Worklogs (view, edit, delete)
```

**MANAGER:**
```
✅ Dashboard (all data)
✅ Teams (all)
✅ Users (view only)
✅ Epics (all)
✅ Issues (all)
✅ Billing (full access)
✅ Settings (limited: profile, teams, billing)
❌ Settings (no: company, integrations, users)
✅ Worklogs (view all, edit own)
```

**USER:**
```
✅ Dashboard (own data only)
❌ Teams (cannot access)
✅ Users (view own profile only)
❌ Epics (cannot access)
❌ Issues (cannot access)
❌ Billing (cannot access)
✅ Settings (profile only)
✅ Worklogs (view own, cannot edit)
```

---

## Managing Multiple Admins

### Best Practices

**Primary Admin:**
- Owns company account
- Has billing/payment access
- Final decision-maker

**Secondary Admins:**
- Backup for primary
- Handle day-to-day user management
- Technical integrations

**Recommended setup:**
```
Primary Admin:      CTO or Operations Manager
Secondary Admin 1:  IT Manager
Secondary Admin 2:  Finance Manager (for billing)
```

**Why multiple admins?**
- ✅ Redundancy (primary on vacation)
- ✅ Separation of duties (IT vs. billing)
- ✅ Faster support response

---

## User Onboarding Workflow

### Recommended Process

**Before user joins:**
1. Create JIRA account for user (if new)
2. Add to appropriate JIRA projects
3. Configure JIRA permissions

**Day 1:**
1. Invite user to Worklog Dashboard (send email)
2. Assign to team(s)
3. Set role (usually USER)
4. Send welcome email with:
   - Login instructions
   - Link to user guide
   - Team lead contact info

**Week 1:**
1. Check user has logged in
2. Verify worklogs syncing correctly
3. Address any JIRA email mismatch
4. Quick training (optional)

**Month 1:**
1. Review user's worklog accuracy
2. Ask for feedback on dashboard
3. Adjust team memberships if needed

---

## User Offboarding Workflow

### Recommended Process

**Last Day:**
1. Deactivate user in Worklog Dashboard
2. Revoke JIRA access
3. Document final billable hours

**Week After:**
1. Run final sync to capture last worklogs
2. Generate final billing reports
3. Archive user data (if required)

**Month After:**
1. Review past invoices (ensure accuracy)
2. Transfer team lead duties (if applicable)
3. Delete user (if legal requirement)

**Best practice:** Keep deactivated for 90 days before deleting

---

## Common User Management Tasks

### Scenario 1: Promoting a User to Manager

**Situation:** Developer promoted to team lead, needs manager access

**Steps:**
1. Settings → Users → [User Name]
2. **Role** → Change to MANAGER
3. Save
4. Notify user:
   "You now have manager access. You can view all team worklogs and generate invoices."

---

### Scenario 2: Contractor Access

**Situation:** External consultant needs limited access

**Steps:**
1. Invite with USER role
2. Do NOT add to internal teams
3. Use separate JIRA instance (if possible)
4. Set expiration reminder (calendar)
5. Deactivate when contract ends

**Security:** Contractors should NOT have ADMIN or MANAGER roles

---

### Scenario 3: Billing-Only Access

**Situation:** Finance person needs to generate invoices, nothing else

**Steps:**
1. Create user with MANAGER role
2. Don't add to any teams
3. Train on billing features only
4. User can:
   - View all worklogs
   - Generate invoices
   - Manage billing clients
5. User cannot:
   - Modify JIRA integrations
   - Add/remove users
   - Change company settings

---

## Troubleshooting

### User can't log in

**Possible causes:**
1. Using wrong Google account (must match invitation email)
2. Account deactivated
3. Invitation link expired (7 days)

**Solutions:**
- Verify email matches invitation
- Check user status (Active/Inactive)
- Resend invitation

### User doesn't see their worklogs

**Check:**
1. ✅ JIRA email matches dashboard email (case-sensitive!)
2. ✅ User's JIRA account has worklogs
3. ✅ Recent sync has run
4. ✅ User has USER role (can only see own data)

**Common issue:** Email mismatch

**Solution:** Settings → Users → [User] → Add Email Alias

### User sees too much data (security concern)

**Cause:** User has MANAGER or ADMIN role

**Solution:**
1. Verify role is correct for their job function
2. If not: Change to USER role
3. If yes: This is expected (managers see all data)

---

## User Analytics

### Monitor User Activity

**Track engagement:**
1. Settings → Users → Analytics
2. View metrics:
   - Last login timestamp
   - Worklogs logged (this month)
   - Dashboard page views
   - Features used

**Red flags:**
- No logins (user not engaging)
- Zero worklogs (JIRA sync issue?)
- Excessive deletions (data integrity concern)

### User Activity Report

**Monthly report shows:**
- Active users (logged in past 30 days)
- Inactive users (no logins past 90 days)
- Top contributors (most worklogs)
- Role distribution

**Use for:**
- License optimization
- Engagement monitoring
- Security audit

---

## Next Steps

- **[JIRA Setup](./jira-setup.md)** - Connect JIRA instances
- **[Security Guide](./security.md)** - Understand data protection
- **[Teams Guide](../user-guide/teams.md)** - Organize users into teams

---

*👥 Your team is your greatest asset. Manage them well.*
