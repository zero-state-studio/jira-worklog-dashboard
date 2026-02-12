# Dashboard Overview

Your central hub for worklog analytics and insights.

---

## What is the Dashboard?

The **Dashboard** is your main view for understanding team productivity, workload distribution, and project progress at a glance. It consolidates worklog data from all your JIRA instances into visualizations and metrics that help you make data-driven decisions.

<!-- TODO: Add screenshot of full dashboard -->

---

## Dashboard Layout

### Top Navigation Bar

<!-- TODO: Add screenshot of navigation bar -->

**Left Side:**
- 🏠 **Dashboard** - Return to main view (you are here)
- 👥 **Teams** - View team-specific analytics
- 👤 **Users** - Individual contributor details
- 📊 **Epics** - Epic-centric progress tracking
- 💰 **Billing** - Invoice generation and rate management
- ⚙️ **Settings** - Configuration and preferences

**Right Side:**
- 🔄 **Sync** button - Import latest worklogs from JIRA
- 🔔 **Notifications** - Alerts and updates
- 👤 **Profile** menu - Account settings and logout

### Global Filters (Always Visible)

<!-- TODO: Add screenshot of filter panel -->

**Date Range Picker:**
- Quick select: Today, Yesterday, Last 7 Days, Last 30 Days, This Month
- Custom range: Click calendar icon to pick specific dates
- 💡 **Tip:** Date range applies to ALL dashboard views

**JIRA Instance Filter:**
- Dropdown to select specific JIRA instance
- "All Instances" (default) shows consolidated data
- Useful when you need single-instance reporting

**Team Filter (if configured):**
- Filter by specific team
- Great for team leads focusing on their group
- "All Teams" shows organization-wide data

---

## Key Metrics Cards

At the top of the dashboard, you'll see 4 key metric cards:

<!-- TODO: Add screenshot of metrics cards -->

### 1. Total Hours

**What it shows:** Sum of all time logged in the selected date range

```
📊 Total Hours
   ━━━━━━━━━━━━
   1,247.5 hrs
   ↑ 12% from last period
```

**Use cases:**
- Track overall team capacity utilization
- Compare periods (monthly, quarterly)
- Identify seasonal patterns

**Click to:** View detailed breakdown by day

### 2. Billable Hours

**What it shows:** Hours marked as billable (for client invoicing)

```
💰 Billable Hours
   ━━━━━━━━━━━━
   892.0 hrs (71%)
   Target: 75%
```

**Use cases:**
- Monitor billable utilization rate
- Identify non-billable time sinks
- Track against revenue goals

**Click to:** See billable vs. non-billable breakdown

### 3. Active Team Members

**What it shows:** Number of users who logged time in the period

```
👥 Active Members
   ━━━━━━━━━━━━
   24 members
   ↑ 2 from last period
```

**Use cases:**
- Track team size trends
- Identify inactive members
- Capacity planning

**Click to:** View list of active members with hours

### 4. Projects Worked

**What it shows:** Count of unique projects with logged time

```
📁 Projects Worked
   ━━━━━━━━━━━━
   12 projects
   ↓ 1 from last period
```

**Use cases:**
- Monitor project portfolio size
- Identify project sprawl
- Track focus vs. multitasking

**Click to:** View project breakdown with hours

---

## Visualizations

### 1. Hours by Day (Line Chart)

<!-- TODO: Add screenshot of hours by day chart -->

**What it shows:** Daily worklog totals over selected date range

**Features:**
- Hover over points to see exact hours
- Identify trends (increasing/decreasing workload)
- Spot anomalies (unusually high or low days)

**Insights to look for:**
- 📈 **Upward trend:** Team ramping up on project
- 📉 **Downward trend:** Project winding down or capacity issues
- 🔴 **Spikes:** Deadline crunches or one-time events
- ⚫ **Gaps:** Holidays, team off-sites, JIRA sync issues

**Filters:**
- Click legend items to toggle teams on/off
- Zoom by dragging on chart
- Export chart as PNG

### 2. Hours by Team (Pie Chart)

<!-- TODO: Add screenshot of hours by team chart -->

**What it shows:** Distribution of hours across teams

**Features:**
- Color-coded slices per team
- Percentages and absolute hours
- Click slice to filter dashboard to that team

**Insights to look for:**
- 🟢 **Balanced distribution:** All teams contributing equally
- 🟡 **Imbalanced:** One team carrying most of workload
- 🔴 **Missing teams:** Expected team has no hours (red flag)

**Use cases:**
- Resource allocation decisions
- Team capacity planning
- Identifying overburdened teams

### 3. Top Contributors (Bar Chart)

<!-- TODO: Add screenshot of top contributors chart -->

**What it shows:** Team members with most logged hours (top 10)

**Features:**
- Sorted by total hours (highest first)
- Shows billable vs. non-billable split
- Click bar to view that user's details

**Insights to look for:**
- 🟢 **Even distribution:** Workload well-balanced
- 🟡 **Top-heavy:** Few people doing most work (bus factor risk)
- 🔴 **Overwork:** Individual exceeding sustainable hours (>50/week)

**Filters:**
- Toggle "Show Billable Only"
- Change time period to see different rankings

### 4. Project Breakdown (Horizontal Bar Chart)

<!-- TODO: Add screenshot of project breakdown chart -->

**What it shows:** Hours logged per project, sorted by total

**Features:**
- Shows project key and name
- Color-coded by JIRA instance
- Click to drill into project details

**Insights to look for:**
- Top projects consuming most resources
- Projects below/above estimated effort
- Abandoned projects (few hours, should be closed?)

---

## Worklog Activity Feed

At the bottom of the dashboard, see recent worklog activity:

<!-- TODO: Add screenshot of activity feed -->

```
📝 Recent Activity
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Jan 15  john@company.com    PROJ-123    4.5h    Feature development
Jan 15  sarah@company.com   PROJ-124    2.0h    Code review
Jan 14  mike@company.com    PROJ-125    6.5h    Bug fixing
...
```

**Features:**
- Paginated (50 worklogs per page)
- Click worklog to see full details
- Filter by user, project, or issue

**Use cases:**
- Spot-check recent entries for accuracy
- Monitor real-time team activity
- Identify unusual work patterns

---

## Customizing Your Dashboard

### Changing Date Range

**Quick Ranges:**
1. Click date range dropdown
2. Select from preset options
3. Dashboard updates automatically

**Custom Range:**
1. Click "Custom" in date range dropdown
2. Pick start and end dates from calendar
3. Click "Apply"

**💡 Pro Tip:** Use keyboard shortcuts:
- `T` - Today
- `Y` - Yesterday
- `W` - This Week
- `M` - This Month

### Filtering by Team

1. Click "Team" dropdown in top bar
2. Select specific team
3. All metrics and charts update to show only that team's data

**Use case:** Team leads can focus on their team without seeing organization-wide data.

### Filtering by JIRA Instance

1. Click "Instance" dropdown
2. Select specific JIRA instance
3. Dashboard shows only worklogs from that instance

**Use case:** Client-specific reporting (e.g., "Show me only Client A's JIRA data")

---

## Understanding the Numbers

### What Counts as a "Worklog"?

- ✅ Any time entry logged in JIRA or Tempo
- ✅ Must have a duration > 0
- ✅ Must be associated with a valid issue
- ✅ Included if within selected date range (based on `started` timestamp)

### How Hours are Calculated

**Total Hours:**
```
Sum of time_spent_seconds / 3600
```

**Billable Hours:**
- Only worklogs with billable flag = true
- Or worklogs where rate cascade assigns a rate > $0

**Percentages:**
```
(Billable Hours / Total Hours) * 100
```

### What if Numbers Look Wrong?

**Check these:**
1. ✅ **Date range** - Are you looking at the right period?
2. ✅ **Filters** - Any active team/instance filters?
3. ✅ **Last sync** - When did you last sync? (Check timestamp in top bar)
4. ✅ **JIRA accuracy** - Do numbers match when you query JIRA directly?

**Still wrong?** Try:
- Run a fresh sync
- Clear browser cache
- Contact administrator

---

## Dashboard Best Practices

### For Team Leads

**Morning Routine:**
1. ☀️ Check dashboard first thing (after coffee)
2. 📊 Review "Hours by Day" for yesterday's activity
3. 👥 Spot-check top contributors for overwork
4. 🚨 Address any red flags (missing team members, zero hours, etc.)

**Weekly Review:**
1. 📅 Set date range to "Last 7 Days"
2. 📈 Compare to previous week's metrics
3. 🎯 Identify trends (ramping up/down)
4. 💬 Discuss findings in team meeting

### For Billing Managers

**End-of-Month Workflow:**
1. 🔄 Run sync on 1st of month (capture previous month)
2. 📆 Set date range to "Last Month"
3. 💰 Review billable percentage (target: 70-80%)
4. 🧾 Generate invoices from Billing page
5. 📧 Send invoices to clients

**Monthly Metrics to Track:**
- Total billable hours (revenue proxy)
- Billable percentage (utilization)
- Hours per project (client profitability)
- Trend vs. previous months

### For Executives

**Quarterly Business Reviews:**
1. 📊 Set date range to "Last Quarter"
2. 🎯 Key metrics to screenshot:
   - Total hours trend
   - Billable percentage
   - Team size growth
   - Project count
3. 📈 Compare to previous quarter
4. 🚀 Identify growth opportunities

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `D` | Go to Dashboard |
| `T` | Today's data |
| `M` | This Month's data |
| `S` | Trigger sync |
| `?` | Show all shortcuts |

---

## Common Questions

**Q: Why don't I see any data?**
A: You need to run a sync first. Click "Sync" in top-right corner.

**Q: Can I export dashboard data?**
A: Yes! Click the ⋯ menu on any chart and select "Export as CSV" or "Export as PNG."

**Q: Why is "Billable Hours" 0 even though I have worklogs?**
A: You need to configure billing rates first. See [Billing Guide](./billing.md).

**Q: How do I compare this month to last month?**
A: Use the "Compare to Previous Period" toggle in the date range picker.

**Q: Can I save custom dashboard views?**
A: Not yet, but this is on the roadmap! For now, bookmark URLs with filters applied.

**Q: What timezone are worklogs displayed in?**
A: Your organization's configured timezone (Settings → Company → Timezone). Worklogs are converted from JIRA's UTC timestamps.

---

## Next Steps

Now that you understand the dashboard:

- **[Worklog Filtering](./worklogs.md)** - Deep dive into individual worklog analysis
- **[Team Management](./teams.md)** - Organize users into teams
- **[Billing System](./billing.md)** - Set up automated billing

---

*📊 Your data tells a story. The dashboard helps you read it.*
