# Billing System

Automate your billing with intelligent rate cascades and flexible rate structures.

---

## Overview

The **Billing System** automatically assigns hourly rates to worklogs based on a 6-level **rate cascade**. This eliminates manual rate lookups and ensures accurate, consistent billing every time.

**Key Features:**
- 💰 6-level rate cascade (Package → Issue → Epic → Project → Client → Default)
- 🧾 Automatic billable hour calculation
- 📊 Billing preview before invoice generation
- 🎯 Flexible rate structures per client/project
- 📈 Billing analytics and reporting

<!-- TODO: Add screenshot of billing dashboard -->

---

## Understanding the Rate Cascade

### What is a Rate Cascade?

A **rate cascade** is a priority system for assigning hourly rates. When a worklog is logged, the system checks rates in order until it finds a match:

```
1️⃣ Package Rate     (highest priority)
          ↓ (if not set)
2️⃣ Issue Rate
          ↓ (if not set)
3️⃣ Epic Rate
          ↓ (if not set)
4️⃣ Project Rate
          ↓ (if not set)
5️⃣ Client Rate
          ↓ (if not set)
6️⃣ Default Rate     (lowest priority, fallback)
```

**First match wins!** As soon as a rate is found at any level, that rate is used.

---

## The 6 Cascade Levels

### Level 1: Package Rate (Highest Priority)

**What it is:** Rate assigned to a specific "package" (collection of issues)

**When to use:**
- Fixed-scope projects with pre-agreed pricing
- Cross-instance issue tracking (e.g., "Q1 2026 Deliverables Package")
- Bundle pricing (e.g., "Bronze Support Package")

**Example:**
```
Package: "Enterprise Integration - Phase 1"
Issues: PROJ-101, PROJ-102, PROJ-103, CLIENT-45
Rate: $175/hr
```

Any worklog on those issues gets $175/hr, regardless of other rates.

**How to create:** Settings → Billing → Packages → Create Package

---

### Level 2: Issue Rate

**What it is:** Rate assigned to a single JIRA issue

**When to use:**
- One-off projects with unique pricing
- Emergency work at premium rates
- Discounted rates for specific issues

**Example:**
```
Issue: PROJ-456 - Urgent Production Bug Fix
Rate: $250/hr (emergency rate)
```

**How to set:** Edit issue in Settings → Billing → Issue Rates

---

### Level 3: Epic Rate

**What it is:** Rate for all issues within an epic

**When to use:**
- Project phases with different rates (e.g., "Design Phase" vs. "Implementation Phase")
- Feature-based pricing
- Long-running initiatives

**Example:**
```
Epic: AUTH-100 - OAuth Integration
Rate: $150/hr
All issues in AUTH-100 inherit this rate
```

**How to set:** Settings → Billing → Epic Rates

---

### Level 4: Project Rate

**What it is:** Rate for all issues in a JIRA project

**When to use:**
- Client projects with consistent pricing
- Department-specific rates (e.g., "Engineering" vs. "Consulting")
- Default rate for large initiatives

**Example:**
```
Project: CLIENT-A
Rate: $140/hr
All issues in CLIENT-A project get $140/hr
```

**How to set:** Settings → Billing → Project Rates

---

### Level 5: Client Rate

**What it is:** Rate for all work across all projects for a client

**When to use:**
- Master service agreements (MSAs)
- Standard client rates across engagements
- Agency retainers

**Example:**
```
Client: Acme Corporation
Rate: $125/hr
All Acme projects use this rate (unless overridden)
```

**How to set:** Settings → Billing → Clients → Edit Client

---

### Level 6: Default Rate (Fallback)

**What it is:** Catch-all rate when nothing else matches

**When to use:**
- Safety net for unassigned work
- Internal time tracking (set to $0)
- Standard consulting rate

**Example:**
```
Default Rate: $100/hr
Used when no other rate is configured
```

**How to set:** Settings → Billing → Default Rate

---

## Rate Cascade Examples

### Example 1: Simple Client Billing

**Setup:**
- Client: TechCo
- Client Rate: $130/hr
- Default Rate: $100/hr

**Worklog:** Developer logs 4 hours on `TECH-123`

**Cascade check:**
1. Package? ❌ No package includes TECH-123
2. Issue rate? ❌ TECH-123 has no specific rate
3. Epic rate? ❌ TECH-123 not in an epic (or epic has no rate)
4. Project rate? ❌ TECH project has no rate
5. Client rate? ✅ **TechCo → $130/hr**

**Result:** 4 hours × $130/hr = **$520**

---

### Example 2: Premium Issue Override

**Setup:**
- Client: TechCo → $130/hr
- Issue: TECH-999 → $200/hr (emergency)
- Default: $100/hr

**Worklog:** Developer logs 3 hours on `TECH-999`

**Cascade check:**
1. Package? ❌ No
2. Issue rate? ✅ **TECH-999 → $200/hr**

**Result:** 3 hours × $200/hr = **$600**

**Why?** Issue rate (Level 2) overrides Client rate (Level 5)

---

### Example 3: Package Priority

**Setup:**
- Package: "Q1 Deliverables" → $175/hr (includes PROJ-101)
- Epic: AUTH-10 → $150/hr (PROJ-101 is in this epic)
- Client: BigCorp → $140/hr
- Default: $100/hr

**Worklog:** Developer logs 8 hours on `PROJ-101`

**Cascade check:**
1. Package? ✅ **"Q1 Deliverables" → $175/hr**

**Result:** 8 hours × $175/hr = **$1,400**

**Why?** Package (Level 1) beats everything else, even if Epic and Client rates exist

---

### Example 4: No Rates Configured

**Setup:**
- Default: $0 (internal work)

**Worklog:** Developer logs 5 hours on `INTERNAL-456`

**Cascade check:**
1. Package? ❌ No
2. Issue rate? ❌ No
3. Epic rate? ❌ No
4. Project rate? ❌ No
5. Client rate? ❌ No
6. Default? ✅ **$0/hr**

**Result:** 5 hours × $0/hr = **$0** (non-billable)

---

## Setting Up Your Billing Structure

### Step 1: Define Your Clients

1. Go to **Settings → Billing → Clients**
2. Click **"Add Client"**
3. Fill in details:

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| **Client Name** | ✅ Yes | Company name | "Acme Corporation" |
| **Default Rate** | ✅ Yes | Standard hourly rate | $125.00 |
| **Currency** | ✅ Yes | USD, EUR, GBP, etc. | USD |
| **Contact Email** | ❌ No | For invoices | billing@acme.com |
| **Billing Address** | ❌ No | Invoice recipient | "123 Main St..." |

4. Click **"Save Client"**

<!-- TODO: Add screenshot of client creation form -->

---

### Step 2: Link JIRA Projects to Clients

1. Go to **Settings → Billing → Project Mapping**
2. For each JIRA project, assign a client:

```
JIRA Project         → Client
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACME-MAIN           → Acme Corporation
ACME-SUPPORT        → Acme Corporation
INTERNAL            → (Internal - Non-billable)
CLIENT-B            → TechCo Inc.
```

3. **Result:** All worklogs in `ACME-MAIN` automatically use Acme's rate

---

### Step 3: Configure Project-Specific Rates (Optional)

If different projects have different rates:

1. Go to **Settings → Billing → Project Rates**
2. Click **"Add Project Rate"**
3. Select project and enter rate
4. This overrides client rate for this project only

**Example:**
```
Client: Acme Corporation → $125/hr (standard)
Project: ACME-PREMIUM → $150/hr (premium support)

Result:
- ACME-MAIN worklogs → $125/hr
- ACME-PREMIUM worklogs → $150/hr ✨
```

---

### Step 4: Set Default Rate (Safety Net)

1. Go to **Settings → Billing → Default Rate**
2. Enter fallback rate
3. **Recommendation:** Set to your standard hourly rate or $0 (for internal-only tracking)

---

## Billing Preview

Before generating an invoice, preview billing calculations:

<!-- TODO: Add screenshot of billing preview -->

### How to Access

1. Go to **Billing → Preview**
2. Select:
   - Client
   - Date range
   - (Optional) Specific project/team
3. Click **"Generate Preview"**

### What You'll See

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BILLING PREVIEW
Acme Corporation | January 2026
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Summary:
─────────────────────────────────────────────────
Total Hours:         128.5 hrs
Billable Hours:      115.0 hrs (89%)
Non-Billable Hours:  13.5 hrs
Total Amount:        $14,375.00

Breakdown by Rate:
─────────────────────────────────────────────────
$125/hr (Standard)    100.0 hrs   $12,500.00
$150/hr (Premium)      10.0 hrs    $1,500.00
$200/hr (Emergency)     5.0 hrs    $1,000.00
$0/hr (Non-billable)   13.5 hrs        $0.00

By Team Member:
─────────────────────────────────────────────────
John Doe      45.0 hrs    $5,625.00
Sarah Chen    38.5 hrs    $4,812.50
Mike Johnson  42.0 hrs    $5,250.00

By Project:
─────────────────────────────────────────────────
ACME-MAIN     85.0 hrs    $10,625.00
ACME-SUPPORT  30.0 hrs     $3,750.00
ACME-INTERNAL 13.5 hrs         $0.00

Actions:
[Download CSV] [Generate Invoice] [Adjust Rates]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Verifying Preview

**Check these:**
- ✅ Total hours match expected workload
- ✅ Billable percentage is reasonable (target: 70-80%)
- ✅ Rates applied correctly (spot-check a few worklogs)
- ✅ No unexpected $0 rates (unless internal work)

**If something looks wrong:**
1. Click "Adjust Rates" to modify
2. Or go to Settings → Billing to fix rate configuration
3. Regenerate preview

---

## Non-Billable Work

### Marking Worklogs as Non-Billable

**Automatically non-billable:**
- ✅ Worklogs with $0 rate
- ✅ Issues in "Internal" projects
- ✅ Worklogs manually marked non-billable

**Manually mark as non-billable:**
1. Go to Worklogs view
2. Check worklogs to mark
3. Click "Mark as Non-Billable"
4. They'll have $0 rate and won't appear on invoices

### Common Non-Billable Scenarios

**Internal projects:**
```
Project: INTERNAL
Rate: $0
Purpose: Team training, company meetings, non-client work
```

**Administrative time:**
```
Issue: ADMIN-123 - Timesheet Prep
Rate: $0
Purpose: Internal overhead
```

**Pro-bono work:**
```
Client: Nonprofit XYZ
Rate: $0
Purpose: Free consulting
```

---

## Advanced Billing Features

### Rate Adjustments

**Apply one-time adjustments:**
1. Generate billing preview
2. Click "Adjust Rates"
3. Select worklogs to adjust
4. Enter adjustment:
   - Percentage (e.g., +10% premium, -15% discount)
   - Fixed amount (e.g., +$500 bonus)
5. Adjustment reflected in invoice

**Use cases:**
- Client discount (holiday special)
- Rush job premium
- Rounding to nice numbers

### Retainer Billing

For clients on monthly retainers:

1. Create client with retainer amount
2. Track hours against retainer
3. Preview shows:
   - Hours used
   - Hours remaining
   - Overage (if exceeded)

```
Client: RetainerCorp
Retainer: 100 hours @ $125/hr = $12,500/month

January Usage:
- Hours logged: 95.0 hrs
- Remaining: 5.0 hrs
- Amount: $11,875 (within retainer)

February Usage:
- Hours logged: 115.0 hrs
- Overage: 15.0 hrs × $125 = $1,875 (additional invoice)
```

### Multi-Currency Support

Bill clients in their preferred currency:

1. Set client currency in client settings
2. Rates automatically converted using exchange rates
3. Invoices generated in client's currency

**Supported currencies:** USD, EUR, GBP, CAD, AUD, JPY, and more

---

## Billing Reports

### Monthly Billing Report

1. Go to **Billing → Reports**
2. Select month
3. View organization-wide billing metrics:

```
January 2026 Billing Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Revenue:      $127,500
Billable Hours:     1,020 hrs
Avg Rate:           $125/hr
Billable %:         78%

Top Clients:
1. Acme Corp        $42,000
2. TechCo Inc       $31,500
3. BigCorp LLC      $28,000

Top Projects:
1. ACME-MAIN        $38,000
2. TECH-PLATFORM    $25,000
3. BIG-MIGRATION    $22,500
```

### Export Reports

- **CSV:** For accounting software import
- **Excel:** For analysis and forecasting
- **PDF:** For executive summaries

---

## Best Practices

### ✅ Do's

**✅ Set up clients first**
- Before logging any time, configure clients and rates
- Ensures accurate billing from day one

**✅ Use meaningful rate levels**
- Don't over-complicate with too many rates
- Most agencies need Client + Project rates only

**✅ Review billing preview monthly**
- Catch errors before invoicing
- Verify rates applied correctly

**✅ Document rate changes**
- Keep notes on why rates change
- Useful for client negotiations

### ❌ Don'ts

**❌ Don't forget default rate**
- Without it, unconfigured work gets $0
- Always set a reasonable fallback

**❌ Don't mix currencies carelessly**
- Use one currency per client
- Mixing USD and EUR in same invoice is confusing

**❌ Don't ignore non-billable %**
- If >30% non-billable, investigate why
- May indicate inefficiency or scope creep

---

## Troubleshooting

### Worklog showing wrong rate

**Check cascade:**
1. View worklog details
2. See which cascade level matched
3. Verify that level's rate is correct

**Common issue:** Higher-priority level has outdated rate

**Solution:** Update rate at the matching level

### "No rate configured" warning

**Cause:** Worklog doesn't match any cascade level

**Solution:**
1. Identify the client/project
2. Set a rate at Client or Project level
3. Regenerate billing preview

### Invoice total doesn't match preview

**Possible causes:**
1. Worklogs added after preview generated
2. Rates changed between preview and invoice
3. Manual adjustments applied

**Solution:** Regenerate preview and compare

---

## Next Steps

- **[Invoice Generation](./invoices.md)** - Create professional invoices from billing data
- **[Settings](./settings.md)** - Configure advanced billing options

---

*💰 Smart billing starts with smart rate structures. Set it up once, invoice effortlessly.*
