# Managing Teams

Organize your users into teams for better reporting and workload analysis.

---

## What are Teams?

**Teams** are logical groupings of users that help you organize and filter worklog data. They don't affect permissions - they're purely for reporting and analytics.

**Use cases:**
- 👥 Department-based teams (Engineering, Design, QA)
- 📍 Location-based teams (US Team, EU Team, Remote Team)
- 🎯 Project-based teams (Client A Team, Product Team, Support Team)
- 💼 Role-based teams (Developers, Managers, Consultants)

<!-- TODO: Add screenshot of teams list -->

---

## Creating Teams

### Prerequisites

**Required role:** ADMIN or MANAGER

### Step-by-Step

1. **Navigate to Settings**
   - Click ⚙️ Settings in top navigation
   - Select **Teams** from sidebar

2. **Click "Create Team"**
   <!-- TODO: Add screenshot of create team form -->

3. **Fill in Team Details**

   | Field | Required | Description | Example |
   |-------|----------|-------------|---------|
   | **Team Name** | ✅ Yes | Unique team identifier | "Engineering Team" |
   | **Description** | ❌ No | What this team does | "Full-stack developers working on core product" |
   | **Team Lead** | ❌ No | Select from user dropdown | john@company.com |
   | **Color** | ❌ No | For charts and visualizations | 🟦 Blue |

4. **Add Team Members**
   - Click "Add Members" button
   - Check users to add to team
   - Users can belong to multiple teams

5. **Save Team**
   - Click "Create Team"
   - Team appears in team list

---

## Managing Team Members

### Adding Members

**Method 1: From Team Settings**
1. Go to Settings → Teams
2. Click team name
3. Click "Add Members"
4. Check users and click "Add"

**Method 2: From User Profile**
1. Go to Users → [User Name]
2. Click "Edit User"
3. Under "Teams," check team memberships
4. Save changes

### Removing Members

1. Go to Settings → Teams → [Team Name]
2. Find member in list
3. Click ✕ (remove) icon
4. Confirm removal

**Note:** Removing from team doesn't delete the user - just removes team association

### Bulk Member Management

**Add multiple users at once:**
1. Click team name
2. Click "Bulk Add"
3. Paste emails (one per line) or select from list
4. Click "Add Selected"

**Use case:** Onboarding entire department to a team

---

## Team Roles

### Team Lead (Optional)

**What it does:**
- ✅ Designates primary contact for team
- ✅ Receives team-related notifications
- ✅ Shows in team list with badge
- ❌ Does NOT grant additional permissions

**How to set:**
1. Edit team settings
2. Select user from "Team Lead" dropdown
3. Save

**Can team leads view all team data?**
- **MANAGER** role: Yes, can view all company data
- **USER** role: No, still only see their own worklogs
- Team Lead is informational, not a permission level

---

## Team Analytics

### Viewing Team Performance

1. **From Dashboard:**
   - Use "Team" filter to select specific team
   - All metrics update to show only that team

2. **From Teams Page:**
   - Navigate to Teams
   - Click team name
   - See team-specific dashboard

<!-- TODO: Add screenshot of team detail page -->

### Team Metrics

**Key metrics per team:**
- 📊 **Total Hours** - Sum of all team members' time
- 💰 **Billable Hours** - Team's contribution to revenue
- 👥 **Active Members** - Who logged time in period
- 📈 **Trend** - Compared to previous period

**Visualizations:**
- Hours by day (team's workload over time)
- Member distribution (who's doing what)
- Project breakdown (what team is working on)
- Billable percentage

---

## Team Comparisons

### Comparing Multiple Teams

1. Go to **Dashboard**
2. Click "Compare Teams" toggle
3. Select 2-5 teams
4. Charts show side-by-side comparison

<!-- TODO: Add screenshot of team comparison view -->

**Comparison Metrics:**

| Team | Total Hours | Billable % | Avg Hours/Person | Top Project |
|------|-------------|------------|------------------|-------------|
| Engineering | 1,240h | 85% | 41h/person | PROJ-A |
| Design | 520h | 65% | 26h/person | PROJ-B |
| QA | 380h | 70% | 19h/person | PROJ-A |

**Insights:**
- 🟢 Which team is most productive?
- 🟡 Which team has best billable percentage?
- 🔴 Which team is overworked (high hours/person)?

---

## Team Workload Balancing

### Identifying Imbalances

**Warning signs:**
- 🔴 One team has 2x hours of another (capacity issue)
- 🟡 Team has <50% billable hours (non-billable work?)
- 🟢 Team member avg differs wildly (10h vs 50h)

### Rebalancing Actions

1. **Identify overloaded team**
   - Review hours/person metric
   - Look for sustained high workload

2. **Check project assignments**
   - Are they working on too many projects?
   - Can work be redistributed?

3. **Review team composition**
   - Do they have enough members?
   - Are skills balanced?

4. **Action:**
   - Move projects to other teams
   - Add members to overloaded team
   - Reduce scope or prioritize

---

## Best Practices

### Team Structure

**✅ Good team sizes:**
- Small: 3-8 members (agile teams)
- Medium: 8-15 members (departments)
- Large: 15-30 members (divisions)

**❌ Avoid:**
- Teams of 1 person (defeats purpose)
- Teams >50 members (too broad, hard to analyze)

### Team Organization Patterns

**Pattern 1: Functional Teams**
```
🔧 Engineering Team
🎨 Design Team
🧪 QA Team
📱 Mobile Team
```
**Pros:** Clear specialization
**Cons:** Siloed, harder to track cross-functional projects

**Pattern 2: Product Teams**
```
🏠 Homepage Team
🛒 Checkout Team
📊 Analytics Team
🔐 Platform Team
```
**Pros:** Aligned with business outcomes
**Cons:** Members may work across multiple products

**Pattern 3: Client/Project Teams**
```
🏢 Client A Team
🏭 Client B Team
🔧 Internal Tools Team
```
**Pros:** Perfect for agencies, clear billing
**Cons:** Frequent team membership changes

**Recommendation:** Choose pattern that matches your organization structure

### Maintaining Teams

**Monthly review:**
- ✅ Are team memberships still accurate?
- ✅ Have people changed roles or left?
- ✅ Do new hires need team assignment?
- ✅ Should team structure change?

**Update process:**
1. Review team rosters
2. Add new members
3. Remove inactive users
4. Adjust team leads if needed

---

## Multi-Team Users

### Why Multiple Teams?

Users can belong to multiple teams:

**Example:**
```
Sarah Chen:
├─ Engineering Team (primary role)
├─ Mobile Team (specialty)
└─ Client A Team (project assignment)
```

**Benefits:**
- Flexible reporting (view Sarah in any team context)
- Reflects reality (people wear multiple hats)
- Cross-functional visibility

### How Multi-Team Worklogs are Counted

**Important:** When a multi-team user logs time, those hours appear in ALL their teams' metrics.

**Example:**
- Sarah logs 8 hours on Monday
- Sarah is in Engineering Team and Mobile Team
- **Result:** Both teams show those 8 hours

**Why?** Teams are filters, not buckets. One worklog can match multiple filters.

**Implication for totals:**
```
Engineering Team: 100 hours
Mobile Team: 80 hours
───────────────────────────────
Organization Total: ≠ 180 hours (there's overlap!)
```

To see true organization total, use "All Teams" filter.

---

## Teams vs. Roles

### What's the Difference?

| Teams | Roles |
|-------|-------|
| Grouping for reporting | Access control |
| User can have multiple | User has one role |
| No permission impact | Determines what user can do |
| Managed by Admins/Managers | Assigned by Admins only |
| Flexible membership | Rarely changes |

**Example:**
```
John Smith
├─ Role: MANAGER (determines permissions)
└─ Teams: Engineering, Leadership (for reporting)
```

---

## Common Team Scenarios

### Scenario 1: New Team Onboarding

**Situation:** Hired 10 new developers, need to create "New Hires Team" for training tracking.

**Steps:**
1. Create team: "New Hires Q1 2026"
2. Add all 10 users
3. Set hiring manager as Team Lead
4. Monitor worklogs:
   - Are they ramping up? (hours increasing)
   - Working on right projects? (onboarding tasks)
   - Billable percentage growing?

### Scenario 2: Project-Based Teams

**Situation:** Agency with multiple client projects, want team per client.

**Steps:**
1. Create team per client:
   - "Client A - Acme Corp"
   - "Client B - TechCo"
   - "Internal - Company Projects"
2. Assign developers to client teams
3. Use team filter for client-specific reporting
4. Generate invoices using team as filter

### Scenario 3: Distributed Teams

**Situation:** Company has US and EU offices, want to track by location.

**Steps:**
1. Create location teams:
   - "US Team (PST)"
   - "EU Team (CET)"
2. Assign based on location
3. Compare:
   - Are hours balanced?
   - Do timezones affect collaboration?
   - Different productivity patterns?

---

## Troubleshooting

### Team doesn't appear in filter dropdown

**Possible causes:**
1. No members in team
2. Team members have no worklogs in selected date range
3. Browser cache needs refresh

**Solution:** Add members and ensure they have worklogs

### User's worklogs not showing in team view

**Check:**
1. ✅ User is member of team (Settings → Teams → [Team] → Members)
2. ✅ Worklogs are in selected date range
3. ✅ User's JIRA email matches their dashboard account email

**Common issue:** JIRA email differs from Google login email
- **Solution:** Admin can add email aliases in user settings

### Can't edit team (buttons grayed out)

**Cause:** Insufficient permissions

**Required role:** ADMIN or MANAGER

**Solution:** Contact your administrator

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `T` then `N` | Create new team |
| `T` then `E` | Edit selected team |
| `T` then `M` | Add members to team |

---

## Next Steps

- **[Dashboard Guide](./dashboard.md)** - Use teams to filter dashboard metrics
- **[Billing System](./billing.md)** - Set team-specific billing rates
- **[User Management](../admin-guide/user-management.md)** - Manage user accounts and roles

---

*👥 Great teams ship great products. Track them effectively.*
