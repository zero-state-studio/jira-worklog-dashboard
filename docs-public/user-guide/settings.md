# Settings

Configure your workspace preferences and application settings.

---

## Accessing Settings

Click the ⚙️ **Settings** icon in the top-right corner of any page.

<!-- TODO: Add screenshot of settings menu -->

**Settings organized by category:**
- 👤 Profile - Your personal account settings
- 🏢 Company - Organization-wide settings (Admin only)
- 🔔 Notifications - Alert preferences
- 🎨 Appearance - UI customization
- 🔐 Security - Password and privacy
- 💰 Billing - Payment and invoice settings (Admin/Manager)
- 🔄 Integrations - JIRA, Tempo, Factorial connections

---

## Profile Settings

### Personal Information

**Editable fields:**
- Display Name (shown on worklogs and reports)
- Email (used for login - Google email)
- Avatar (upload custom photo)
- Timezone (for worklog display)
- Language (English, Spanish, French, German - coming soon)

**How to edit:**
1. Settings → Profile
2. Update fields
3. Click "Save Changes"

### Password & Authentication

**Google OAuth (Primary):**
- Password managed by Google
- No password to set here
- Revoke access: Google Account settings

**Session Management:**
- View active sessions
- Log out remotely from other devices
- See login history (last 30 days)

---

## Company Settings (Admin Only)

### Organization Profile

**Company Information:**
- Company Name (shown on invoices)
- Logo (300x100px recommended)
- Tax ID / VAT Number
- Business Address
- Billing Email
- Phone Number

**Timezone:**
- Organization default timezone
- Affects worklog display for all users
- Users can override with personal timezone

**Fiscal Calendar:**
- Fiscal year start month (e.g., January or April)
- Used for annual reports and analytics

<!-- TODO: Add screenshot of company settings -->

### Branding

**Customize invoice appearance:**
- Logo upload
- Primary color (hex code or color picker)
- Accent color
- Font family (Sans-serif, Serif, Monospace)

**Preview:** See invoice sample with your branding

---

## Notification Settings

### Email Notifications

Control what triggers email alerts:

| Event | Default | Description |
|-------|---------|-------------|
| **Sync Complete** | ✅ On | When JIRA sync finishes |
| **Sync Errors** | ✅ On | When sync encounters errors |
| **Invoice Generated** | ✅ On | When invoice PDF created |
| **New User Added** | ❌ Off | When admin adds team member |
| **Weekly Summary** | ❌ Off | Monday morning team report |
| **Monthly Billing Reminder** | ✅ On | 1st of month reminder to invoice |

**Frequency:**
- Immediately (real-time)
- Daily digest (one email per day)
- Weekly digest (Monday morning)

### In-App Notifications

**Bell icon (🔔) alerts:**
- Sync status updates
- Invoice status changes
- Team mentions
- System announcements

**Settings:**
- Enable/disable per notification type
- Mark all as read
- Clear notification history

---

## Appearance Settings

### Theme

**Options:**
- ☀️ Light Mode (default)
- 🌙 Dark Mode
- 🌗 Auto (follows system preference)

### Dashboard Layout

**Customize dashboard:**
- Drag-and-drop widgets
- Show/hide specific charts
- Default date range on load
- Metric card order

### Date & Time Format

**Date Format:**
- MM/DD/YYYY (US)
- DD/MM/YYYY (International)
- YYYY-MM-DD (ISO)

**Time Format:**
- 12-hour (2:30 PM)
- 24-hour (14:30)

### Number Format

**Decimal separator:**
- Period (1,234.56)
- Comma (1.234,56)

**Currency display:**
- $1,234.56 USD
- USD $1,234.56
- 1.234,56 $

---

## Security Settings

### Two-Factor Authentication (2FA)

**Enable 2FA for extra security:**
1. Settings → Security → 2FA
2. Scan QR code with authenticator app
3. Enter verification code
4. Save backup codes (store securely)

**Recommended for:**
- Admin users (required)
- Users with billing access
- All users in high-security organizations

### Session Timeout

**Auto-logout settings:**
- After 30 minutes inactive (default)
- After 1 hour inactive
- After 8 hours inactive
- Never (not recommended)

### API Keys (Advanced)

**Generate API keys for automation:**
1. Settings → Security → API Keys
2. Click "Generate New Key"
3. Name your key (e.g., "CI/CD Pipeline")
4. Copy key (shown only once)
5. Use in scripts for programmatic access

**⚠️ Security:** Treat API keys like passwords. Don't commit to git!

---

## Billing Settings (Admin/Manager)

### Payment Methods

**Add payment method:**
- Credit Card
- ACH / Bank Account
- Wire Transfer (manual)

**Default payment method:** Used for subscription billing

### Invoice Preferences

**Invoice Number Format:**
```
Options:
- Sequential: 2026-001, 2026-002, ...
- Client-based: ACME-001, TECH-001, ...
- Custom: INV-{YYYY}-{MMMM}-{NNN}
```

**Payment Terms:**
- Default: Net 30
- Per-client override available

**Late Fees:**
- Enable/disable
- Percentage or fixed amount
- Grace period (days after due date)

### Tax Configuration

**Tax Rates:**
- Sales Tax (US)
- VAT (EU)
- GST (Canada, Australia)
- Custom tax rate per client/region

**Tax ID:**
- Your organization's tax identification number
- Appears on invoices

---

## Integration Settings

### JIRA Instances

**Manage connected JIRA accounts:**

<!-- TODO: Add screenshot of JIRA instances list -->

**For each instance:**
- Instance Name (display name)
- JIRA URL
- Authentication (API token or Basic Auth)
- Tempo API Token (optional)
- Status (Connected / Error)
- Last Sync (timestamp)

**Actions:**
- Test Connection
- Edit Credentials
- Delete Instance (⚠️ doesn't delete worklogs)

**Add New Instance:** See [JIRA Setup Guide](../admin-guide/jira-setup.md)

### Factorial HR (Optional)

**Connect Factorial for absence tracking:**
1. Settings → Integrations → Factorial
2. Click "Connect Factorial"
3. Authorize OAuth access
4. Sync employees and time-off data

**Use case:** Exclude holidays and sick days from capacity calculations

### Webhooks (Advanced)

**Send events to external systems:**
- Sync completed → Trigger backup script
- Invoice generated → Update accounting software
- New user added → Onboarding automation

**How to set up:**
1. Settings → Integrations → Webhooks
2. Add webhook URL
3. Select events to send
4. Test webhook
5. Save

**Payload example:**
```json
{
  "event": "sync.completed",
  "timestamp": "2026-02-01T14:30:00Z",
  "data": {
    "worklogs_synced": 245,
    "instances": ["Main JIRA", "Client A"],
    "duration_seconds": 87
  }
}
```

---

## Advanced Settings (Admin Only)

### Data Retention

**Worklog Archive Policy:**
- Keep worklogs indefinitely (default)
- Archive worklogs older than 2 years
- Archive worklogs older than 5 years

**Archived worklogs:**
- Not displayed in dashboard
- Still accessible via export
- Can be restored if needed

### Database Maintenance

**Optimize database:**
- Click "Optimize Database" to compact storage
- Recommended: Run monthly
- Improves query performance

**Backup database:**
- Automatic backups: Daily (retained 30 days)
- Manual backup: Click "Backup Now"
- Download backup file for off-site storage

### User Management

**See:** [User Management Guide](../admin-guide/user-management.md)

---

## Keyboard Shortcuts

**Enable/disable keyboard shortcuts:**
- Settings → Appearance → Keyboard Shortcuts
- Toggle on/off
- Customize key bindings (advanced)

**View all shortcuts:** Press `?` anywhere in app

---

## Import / Export

### Export Data

**Export all your data:**
1. Settings → Data → Export
2. Select data to export:
   - ☑ Worklogs
   - ☑ Users
   - ☑ Teams
   - ☑ Invoices
   - ☑ Billing Configuration
3. Choose format: JSON, CSV, Excel
4. Click "Export"
5. Download ZIP file

**Use case:**
- Backup before major changes
- Migrate to another system
- Compliance and audit requirements

### Import Data (Admin Only)

**Bulk import from external system:**
1. Settings → Data → Import
2. Upload CSV/Excel file
3. Map columns to fields
4. Preview import
5. Confirm and import

**Supported imports:**
- Users (from HR system)
- Historical worklogs (from old time tracking tool)
- Clients and projects

---

## Resetting Settings

### Reset to Defaults

**Individual sections:**
- Each settings page has "Reset to Default" button
- Reverts that section only

**Global reset:**
- Settings → Advanced → Factory Reset
- Resets ALL settings to defaults
- ⚠️ Cannot be undone
- Worklogs and data preserved

---

## Settings for Each Role

### USER Role

**Can access:**
- ✅ Profile settings
- ✅ Notification preferences
- ✅ Appearance settings
- ✅ Security (own account)

**Cannot access:**
- ❌ Company settings
- ❌ Billing settings
- ❌ User management
- ❌ Integration management

### MANAGER Role

**Additional access:**
- ✅ Billing settings
- ✅ View all users
- ✅ Team management
- ✅ Invoice generation

**Still cannot:**
- ❌ Company branding
- ❌ Add/remove JIRA instances
- ❌ Modify user roles
- ❌ Delete users

### ADMIN Role

**Full access:**
- ✅ All settings
- ✅ User management
- ✅ Integration configuration
- ✅ Company-wide preferences
- ✅ Data import/export

---

## Troubleshooting

### Settings won't save

**Possible causes:**
1. Network connectivity issue
2. Session expired (need to log in again)
3. Invalid values (e.g., malformed email)

**Solution:**
- Check error message
- Refresh page and try again
- Contact admin if persists

### Can't access certain settings

**Cause:** Insufficient permissions (USER role)

**Solution:** Contact your admin to request access or role change

### Forgot to save changes

**Auto-save:** Some settings auto-save (Profile, Appearance)

**Manual save required:** Billing, Company, Security

**Indicator:** Asterisk (*) next to section name if unsaved changes

---

## Next Steps

- **[JIRA Setup](../admin-guide/jira-setup.md)** - Connect JIRA instances
- **[User Management](../admin-guide/user-management.md)** - Manage team members
- **[Security Guide](../admin-guide/security.md)** - Understand data protection

---

*⚙️ Your settings, your way. Customize for your workflow.*
