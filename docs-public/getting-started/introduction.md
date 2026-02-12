# Introduction to JIRA Worklog Dashboard

## What is JIRA Worklog Dashboard?

JIRA Worklog Dashboard is a powerful platform that consolidates worklog data from multiple JIRA instances into a single, unified dashboard. It's designed for teams and companies that use JIRA for project management and need better visibility into time tracking, billing, and team productivity.

### The Problem We Solve

If your company uses JIRA, you might be familiar with these challenges:

**🔀 Fragmented Data**
- Managing worklogs across multiple JIRA instances (per client, per department, per project)
- Switching between different JIRA accounts to see the full picture
- No easy way to get a unified view of all work across instances

**💰 Manual Billing**
- Spending hours each month extracting worklogs for invoicing
- Manually calculating billable hours with different client rates
- Error-prone spreadsheet work that delays invoice delivery

**📊 Limited Analytics**
- JIRA's native reporting doesn't show cross-instance insights
- Hard to track team workload distribution and capacity
- No visibility into billable vs. non-billable work

**⚖️ Compliance Overhead**
- Tracking time for compliance and audit requirements
- Generating reports for different clients with varying needs
- Ensuring accurate time allocation across projects

### Our Solution

JIRA Worklog Dashboard provides:

✅ **Unified Worklog View** - See all worklogs from multiple JIRA instances in one place

✅ **Automated Billing** - Generate invoices in minutes with smart rate cascades that automatically assign correct rates

✅ **Team Analytics** - Understand workload distribution, identify bottlenecks, and optimize resource allocation

✅ **Secure Multi-Tenant** - Complete data isolation ensures client confidentiality (perfect for agencies)

✅ **Desktop & Web Access** - Available as both a native desktop app and web application

✅ **Simple Sync** - One-click sync to pull the latest worklogs from all your JIRA instances

---

## Key Features

### 🔄 Multi-Instance Sync

Connect unlimited JIRA and Tempo instances. With one click, sync worklogs from all sources into a centralized database. No more logging into multiple accounts.

**Supported Integrations:**
- JIRA Cloud instances (via REST API)
- Tempo Timesheets (recommended for better performance)
- Multiple instances per organization

### 📈 Analytics & Reporting

Visualize worklog data with powerful charts and filters:
- Team workload distribution
- Billable vs. non-billable hours
- Project progress tracking
- Individual contributor metrics
- Historical trends and velocity

### 💵 Intelligent Billing System

Our 6-level rate cascade automatically assigns the correct hourly rate:

```
Package Rate → Issue Rate → Epic Rate → Project Rate → Client Rate → Default Rate
(First match wins)
```

**Example:** A worklog on issue "PROJ-123" will use the Issue rate if set, otherwise the Epic rate, and so on.

### 🧾 Professional Invoicing

Generate polished PDF invoices with:
- Your company logo and branding
- Itemized worklog breakdown by issue/epic/team member
- Multiple currency support
- Custom notes and terms
- Ready to send to clients

### 👥 Role-Based Access

Three user roles for flexible access control:

- **ADMIN** - Full access to all features and settings
- **MANAGER** - View all data, manage billing and teams
- **USER** - View only their own worklogs

### 🔐 Enterprise-Grade Security

- Complete data isolation between companies (multi-tenant architecture)
- Google OAuth authentication (no passwords to manage)
- Encrypted data storage
- Access control at every level

---

## Who Should Use This?

### Perfect For:

**Digital Agencies**
- Manage multiple client JIRA instances
- Need accurate billing for client projects
- Require data isolation between clients

**Consulting Firms**
- Track billable hours across engagements
- Different rate structures per client/project
- Need professional invoice generation

**Software Development Teams**
- Monitor team capacity and workload
- Track sprint velocity and progress
- Identify resource bottlenecks

**Project Management Offices**
- Consolidated reporting across departments
- Compliance and audit reporting
- Cross-project analytics

---

## How It Works

### 1. Connect Your JIRA Instances

Add your JIRA Cloud and Tempo instances by providing:
- Instance URL (e.g., `yourcompany.atlassian.net`)
- API token or credentials
- Optional: Tempo API token for better performance

### 2. Sync Your Worklogs

Click the "Sync" button to import worklogs. You control when to sync:
- On-demand (click when you need fresh data)
- Specify date ranges (e.g., "last 30 days" or "this month")
- Runs in the background (no waiting)

**Note:** This is not real-time sync. Worklogs are imported when you trigger a sync.

### 3. Explore Your Data

Use the dashboard to:
- View total hours logged by team, project, user
- Filter by date range, JIRA instance, team
- Drill down into specific epics or issues
- See who's working on what

### 4. Generate Invoices (Optional)

For billing managers:
- Set up clients and rate structures
- Select date range and client
- Review auto-calculated totals
- Export professional PDF invoice

---

## Desktop vs. Web

JIRA Worklog Dashboard is available in two formats:

### Desktop App (Recommended)

**Advantages:**
- ✅ Faster performance (local database)
- ✅ Works offline (after initial sync)
- ✅ Native OS integration
- ✅ More secure (data stored locally)

**Available for:** macOS, Windows, Linux

### Web Application

**Advantages:**
- ✅ No installation required
- ✅ Access from any device
- ✅ Automatic updates
- ✅ Collaborative (shared database)

**Access:** Via web browser at your organization's URL

---

## Getting Started

Ready to dive in? Continue to the [Quick Start Guide](./quickstart.md) to set up your account and connect your first JIRA instance.

**Next Steps:**
1. [Quick Start Guide](./quickstart.md) - Set up in 5 minutes
2. [Your First Sync](./first-sync.md) - Import your first worklogs
3. [Dashboard Overview](../user-guide/dashboard.md) - Explore the interface

---

## System Requirements

### For Desktop App:
- **macOS:** 10.15 (Catalina) or later
- **Windows:** Windows 10 or later
- **Linux:** Ubuntu 20.04+ or equivalent
- **Disk Space:** 500MB minimum (plus database growth)
- **Internet:** Required for JIRA sync and authentication

### For Web Application:
- **Browser:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Internet:** Required for all operations
- **Screen Resolution:** 1280x720 minimum (1920x1080 recommended)

---

## Support & Community

**Need Help?**
- Check the [FAQ](../faq.md)
- Read the [Troubleshooting Guide](../troubleshooting.md)
- Contact your administrator

**Want to Learn More?**
- Explore the [User Guide](../user-guide/dashboard.md)
- Review [Admin Documentation](../admin-guide/jira-setup.md)

---

*Welcome aboard! Let's make worklog management effortless.*
