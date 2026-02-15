# Security & Privacy

Understanding how your data is protected in the Worklog Dashboard.

---

## Overview

The JIRA Worklog Dashboard is built with security as a foundation. This guide explains our security architecture, data isolation, and best practices for administrators.

**Key Security Features:**
- 🔒 Multi-tenant data isolation
- 🔐 Google OAuth authentication
- 🛡️ Role-based access control (RBAC)
- 🔑 Encrypted credential storage
- 📊 Audit logging
- 🌐 HTTPS-only communication

---

## Multi-Tenant Data Isolation

### What is Multi-Tenancy?

**Multi-tenant** means multiple companies share the same application infrastructure, but data is completely isolated between companies.

**Your data is never visible to other companies.**

### How Isolation Works

Every piece of data (worklogs, users, invoices) is tagged with your company ID:

```
Company A sees:
├─ Worklogs: Only Company A's worklogs
├─ Users: Only Company A's users
├─ Invoices: Only Company A's invoices
└─ Settings: Only Company A's settings

Company B sees:
├─ Worklogs: Only Company B's worklogs
├─ Users: Only Company B's users
└─ (completely separate data)
```

**Technical implementation:**
- Every database query includes company filter
- API endpoints validate user belongs to correct company
- Cross-company access returns "Not Found" (not "Forbidden")

**Result:** It's impossible for one company to accidentally see another's data

---

## Authentication & Authorization

### Google OAuth (Primary Method)

**How it works:**
1. User clicks "Login with Google"
2. Redirected to Google's login (we never see your password)
3. Google verifies identity
4. User returns to dashboard with access token
5. Token expires after 24 hours (must re-login)

**Benefits:**
- ✅ No passwords to manage or leak
- ✅ Google's 2FA protects your account
- ✅ Single Sign-On (SSO) experience
- ✅ Secure, industry-standard OAuth 2.0

**Security controls:**
- Access tokens expire (24 hours)
- Refresh tokens expire (30 days)
- Tokens stored in HTTP-only cookies (not localStorage)
- HTTPS-only (no plaintext transmission)

---

### Role-Based Access Control (RBAC)

**3 Roles with different permissions:**

```
ADMIN (Full Access)
├─ View all company data
├─ Modify settings
├─ Manage users
├─ Add/remove JIRA instances
└─ Delete data

MANAGER (Billing + View All)
├─ View all company data
├─ Generate invoices
├─ Manage billing clients
└─ Cannot modify users or settings

USER (Own Data Only)
├─ View only own worklogs
└─ Cannot see other users' data
```

**Enforcement:**
- Every API call validates user's role
- Insufficient permissions → 403 Forbidden
- Cannot escalate own role (admin must do it)

---

## Data Encryption

### Data at Rest

**Encrypted storage:**
- ✅ JIRA API tokens (encrypted before storage)
- ✅ Database backups (encrypted archives)
- ✅ User passwords (N/A - we use Google OAuth)

**Encryption standard:** AES-256

**Where data is stored:**
- **Desktop app:** Local SQLite database on your computer
- **Web app:** Secure cloud database (AWS/GCP with encryption enabled)

---

### Data in Transit

**All communication uses HTTPS:**
- Dashboard ↔ Your browser: HTTPS/TLS 1.3
- Dashboard ↔ JIRA API: HTTPS
- Dashboard ↔ Tempo API: HTTPS

**Certificate:** Valid TLS certificate (no self-signed)

**Result:** Data cannot be intercepted in transit

---

## Credential Management

### JIRA API Tokens

**How we store them:**
1. You enter API token in settings
2. Token encrypted with company-specific key
3. Stored in encrypted form in database
4. Decrypted only when needed for JIRA API calls

**Who can view tokens:**
- Admins can see masked tokens (e.g., `ATATTxxxx...****`)
- Full tokens NEVER displayed after initial entry
- Re-entry required if forgotten

**Best practices:**
- Rotate tokens every 6 months
- Use dedicated service account (not personal)
- Revoke tokens when admin leaves

---

### Google OAuth Tokens

**Access tokens:**
- Short-lived (24 hours)
- Stored in HTTP-only cookies (not JavaScript-accessible)
- Expire automatically

**Refresh tokens:**
- Longer-lived (30 days)
- Used to get new access tokens
- Revoked on logout

**Security:** Even if access token stolen, it expires quickly

---

## Audit Logging

### What We Log

**User actions logged:**
- ✅ Logins and logouts
- ✅ User creation, modification, deletion
- ✅ JIRA instance added/removed
- ✅ Invoice generation
- ✅ Worklog edits and deletions
- ✅ Settings changes

**Not logged:**
- ❌ Viewing worklogs (read operations)
- ❌ Dashboard navigation
- ❌ Search queries

**Retention:** Audit logs kept for 1 year

---

### Viewing Audit Logs (Admin Only)

1. Settings → Security → Audit Logs
2. Filter by:
   - User
   - Action type
   - Date range
3. Export to CSV for compliance

**Use cases:**
- Security incident investigation
- Compliance audits
- Understanding who changed what

<!-- TODO: Add screenshot of audit log -->

---

## Access Control Best Practices

### Principle of Least Privilege

**Give users minimum access needed:**

```
❌ Bad: Everyone is MANAGER
✅ Good: Most users are USER, few MANAGER, 1-2 ADMIN
```

**Role assignment guide:**
- **Individual contributors:** USER role
- **Billing/finance team:** MANAGER role
- **IT admin, company owner:** ADMIN role

---

### Regular Access Reviews

**Monthly review:**
1. Settings → Users
2. Review role assignments
3. Ask:
   - Are roles still appropriate?
   - Should any users be deactivated?
   - Are there inactive users (90+ days)?

**Annual audit:**
1. Full access review with HR
2. Verify all users still employed
3. Deactivate ex-employees
4. Rotate JIRA API tokens

---

## Data Privacy & Compliance

### GDPR Compliance (EU)

**User rights supported:**
- ✅ **Right to Access:** Users can export their worklog data
- ✅ **Right to Rectification:** Users/admins can edit worklogs
- ✅ **Right to Erasure:** Admins can delete user accounts
- ✅ **Right to Portability:** Export data in CSV/JSON formats

**How to exercise:**
1. User requests via admin
2. Admin exports user data (Settings → Users → Export User Data)
3. Provide to user
4. Optionally delete user after retention period

---

### Data Retention

**Default retention:**
- Worklogs: Indefinite (until manually deleted)
- Audit logs: 1 year
- Invoices: 7 years (recommended for tax compliance)

**Configurable:**
1. Settings → Data Retention
2. Set policies:
   - Archive worklogs > X years
   - Auto-delete old logs
   - Backup before deletion

---

### SOC 2 / ISO 27001 (Coming Soon)

**Planned certifications:**
- SOC 2 Type II (Q3 2026)
- ISO 27001 (Q4 2026)

**What this means:**
- Third-party audit of security controls
- Verified compliance with industry standards
- Annual recertification

---

## Network Security

### IP Whitelisting (Optional)

**Restrict access by IP address:**
1. Settings → Security → IP Whitelist
2. Add allowed IP ranges:
   - Office IPs
   - VPN IPs
   - Home office IPs (if known)
3. Block all others

**Use case:** High-security organizations

**Trade-off:** Users can't access from untrusted networks (coffee shop, hotel)

---

### Two-Factor Authentication (2FA)

**Enable 2FA for added security:**

**For users:**
1. Profile → Security → Enable 2FA
2. Scan QR code with authenticator app (Google Authenticator, Authy)
3. Enter verification code
4. Save backup codes

**For admins (required):**
- Admins MUST enable 2FA within 7 days of account creation
- Enforced by system

**How 2FA works:**
1. Log in with Google (something you know: password)
2. Enter 6-digit code (something you have: phone)
3. Both required = higher security

---

## Security Incident Response

### If You Suspect a Breach

**Immediate actions:**
1. **Change all JIRA API tokens**
   - Settings → JIRA Instances → Regenerate Tokens
2. **Force logout all users**
   - Settings → Security → Revoke All Sessions
3. **Review audit logs**
   - Settings → Security → Audit Logs
   - Look for suspicious activity
4. **Contact support**
   - Email: security@worklogdashboard.com
   - Provide: What you observed, when, affected users

---

### Indicators of Compromise

**Watch for:**
- 🚨 Logins from unusual locations
- 🚨 Bulk data exports by non-admins
- 🚨 Failed login attempts (brute force?)
- 🚨 Unexpected user role changes
- 🚨 JIRA API token regeneration (if you didn't do it)

**How to check:**
1. Settings → Security → Audit Logs
2. Filter by suspicious actions
3. Investigate anomalies

---

## Secure Configuration Checklist

**For Admins:**

### Initial Setup
- [ ] Enable 2FA for all admins
- [ ] Review default user roles
- [ ] Set strong password policy (if using password auth)
- [ ] Configure session timeout (30 minutes recommended)
- [ ] Enable audit logging

### Monthly Tasks
- [ ] Review active users
- [ ] Deactivate ex-employees
- [ ] Check audit logs for anomalies
- [ ] Verify JIRA API token validity

### Quarterly Tasks
- [ ] Rotate JIRA API tokens
- [ ] Full access review (users + roles)
- [ ] Test backup restore procedure
- [ ] Update emergency contact list

### Annual Tasks
- [ ] Comprehensive security audit
- [ ] Review data retention policies
- [ ] Penetration testing (if budget allows)
- [ ] Security training for admins

---

## Data Backup & Recovery

### Automatic Backups

**Desktop app:**
- Database backed up daily to `~/.claude/backups/`
- Retain 30 days of backups
- Automatic rotation (oldest deleted)

**Web app:**
- Database backed up hourly
- Stored in secure S3 bucket (encrypted)
- Retention: 30 days point-in-time recovery

---

### Manual Backup

**How to backup:**
1. Settings → Data → Export
2. Select "Full Database Export"
3. Download ZIP file
4. Store securely (encrypted external drive)

**Recommended frequency:**
- Before major changes
- Before user bulk imports
- Monthly routine backup

---

### Disaster Recovery

**Recovery Time Objective (RTO):** 4 hours
- How long to restore service after outage

**Recovery Point Objective (RPO):** 1 hour
- Maximum data loss (last backup)

**How to restore:**
1. Contact support
2. Provide backup file (if custom restore)
3. Restore performed by ops team
4. Verify data integrity

---

## Compliance Frameworks

### Supported Standards

**Current:**
- ✅ GDPR (EU)
- ✅ CCPA (California)
- ✅ HTTPS/TLS 1.3
- ✅ OAuth 2.0

**Planned:**
- 📋 SOC 2 Type II (Q3 2026)
- 📋 ISO 27001 (Q4 2026)
- 📋 HIPAA (Q1 2027 - if demand exists)

---

## Security FAQ

**Q: Is my data shared with other companies?**
A: No. Multi-tenant isolation ensures complete data separation.

**Q: Can Worklog Dashboard staff see my data?**
A: Support staff can access data ONLY with your explicit permission for troubleshooting. All access is logged.

**Q: What happens if I forget my password?**
A: We use Google OAuth - no passwords to forget! Reset via Google account recovery.

**Q: How often should I rotate JIRA tokens?**
A: Every 6 months, or immediately if admin with access leaves.

**Q: Is the desktop app more secure than web?**
A: Yes, slightly. Desktop stores data locally (not on our servers). Both use HTTPS for JIRA communication.

**Q: Can I use custom SSO (Okta, Azure AD)?**
A: Planned for Q3 2026 (Enterprise plan).

---

## Reporting Security Issues

**Found a vulnerability?**

**Do:**
- ✅ Email: security@worklogdashboard.com
- ✅ Include: Steps to reproduce, potential impact
- ✅ Give us 90 days to fix before public disclosure

**Don't:**
- ❌ Post publicly on social media
- ❌ Exploit the vulnerability
- ❌ Access other companies' data

**We appreciate responsible disclosure!**

**Bug bounty:** Coming Q3 2026 (rewards for valid findings)

---

## Next Steps

- **[User Management](./user-management.md)** - Control who has access
- **[JIRA Setup](./jira-setup.md)** - Securely connect JIRA instances
- **[Settings](../user-guide/settings.md)** - Configure security preferences

---

*🔒 Security isn't a feature - it's the foundation. We take it seriously.*
