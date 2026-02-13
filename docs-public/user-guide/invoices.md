# Invoice Generation

Create professional PDF invoices from your worklog data in minutes.

---

## Overview

The **Invoice Generator** transforms your worklog data into polished, client-ready invoices with automatic rate calculations, detailed breakdowns, and professional formatting.

**Key Features:**
- 🧾 Professional PDF generation
- 💰 Automatic rate calculations via cascade
- 📊 Detailed worklog itemization
- 🎨 Customizable branding (logo, colors)
- 💱 Multi-currency support
- 📧 Ready to send (email or download)

<!-- TODO: Add screenshot of invoice example -->

---

## Creating Your First Invoice

### Prerequisites

✅ **Worklogs synced** - Run a sync to ensure data is current

✅ **Client configured** - Client must exist in Settings → Billing → Clients

✅ **Rates set up** - At least a default rate configured

### Step-by-Step

1. **Navigate to Billing**
   - Click **💰 Billing** in main navigation
   - Select **"Generate Invoice"** tab

2. **Select Invoice Parameters**

<!-- TODO: Add screenshot of invoice generation form -->

| Field | Required | Description |
|-------|----------|-------------|
| **Client** | ✅ Yes | Which client to invoice |
| **Date Range** | ✅ Yes | Period to include (e.g., "January 2026") |
| **JIRA Instance** | ❌ No | Filter to specific instance (or "All") |
| **Project** | ❌ No | Filter to specific project |
| **Team** | ❌ No | Filter to specific team's worklogs |

3. **Review Billing Preview**
   - System shows summary:
     - Total hours
     - Billable hours
     - Total amount
   - Verify numbers look correct

4. **Customize Invoice (Optional)**
   - Add invoice notes
   - Adjust individual line items
   - Apply discounts or fees

5. **Generate PDF**
   - Click **"Generate Invoice"**
   - PDF created in ~5 seconds
   - Preview or download

---

## Invoice Anatomy

<!-- TODO: Add annotated screenshot of invoice layout -->

### Header Section

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Your Company Logo]

INVOICE #2026-001
Date: February 1, 2026
Due Date: March 3, 2026 (Net 30)

From:                          Bill To:
Your Company Name              Acme Corporation
123 Your Street               456 Client Street
Your City, State ZIP           Client City, State ZIP
Tax ID: XX-XXXXXXX             billing@acme.com
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Invoice Details

```
Billing Period: January 1 - 31, 2026
Project: Acme Main Platform (ACME-MAIN)
Payment Terms: Net 30
```

### Line Items Table

```
┌──────────────────────────────────────────────────────────────────┐
│ Date    | Description              | Hours | Rate    | Amount    │
├──────────────────────────────────────────────────────────────────┤
│ Jan 3   | ACME-101: User Auth      | 6.5   | $125.00 | $812.50   │
│ Jan 3   | ACME-102: API Integration| 4.0   | $125.00 | $500.00   │
│ Jan 4   | ACME-103: Database Opt.  | 5.5   | $125.00 | $687.50   │
│ ...     | ...                      | ...   | ...     | ...       │
└──────────────────────────────────────────────────────────────────┘
```

**Columns:**
- **Date** - When work was performed
- **Description** - Issue key + summary (truncated if long)
- **Hours** - Time logged (decimal format)
- **Rate** - Hourly rate applied
- **Amount** - Hours × Rate

### Summary Section

```
                                   Subtotal:    $14,375.00
                          Discount (10%):     -$1,437.50
                                        ─────────────────
                                    Total:    $12,937.50
                                        ═════════════════

Total Hours: 115.0
Billable Hours: 115.0 (100%)
```

### Footer

```
Payment Instructions:
Bank: Your Bank Name
Account: *****1234
Wire/ACH: Provide routing number

Notes:
Thank you for your business! Payment due within 30 days.

Questions? Contact billing@yourcompany.com
```

---

## Customizing Invoices

### Branding

**Add Your Logo:**
1. Go to **Settings → Company → Branding**
2. Upload logo image (PNG, JPG, SVG)
3. Recommended size: 300x100px
4. Logo appears on all invoices

**Company Information:**
- Company name
- Address
- Tax ID / VAT number
- Contact email and phone

**Colors (Advanced):**
- Primary color (header background)
- Accent color (borders, highlights)
- Font selection

### Invoice Settings

**Invoice Number Format:**
```
Pattern: {YYYY}-{NNN}
Example: 2026-001, 2026-002, ...

Or: {CLIENT}-{YYYY}-{NNN}
Example: ACME-2026-001
```

**Payment Terms:**
- Net 15, Net 30, Net 45, Net 60
- Due on Receipt
- Custom (e.g., "2% 10, Net 30")

**Currency:**
- Default: USD
- Per-client override available
- Automatically formats currency symbols

---

## Invoice Adjustments

### Discounts

**Apply percentage discount:**
1. In billing preview, click "Add Discount"
2. Enter percentage (e.g., 10%)
3. Reason (e.g., "Loyalty discount")
4. Discount applied to subtotal

**Apply fixed discount:**
1. Click "Add Discount"
2. Select "Fixed Amount"
3. Enter dollar amount
4. Applied before total

**Example:**
```
Subtotal:     $14,375.00
Discount (10% - Early Payment):  -$1,437.50
───────────────────────────────────────────
Total:        $12,937.50
```

### Additional Fees

**Add fees:**
- Rush job premium (+$500)
- Travel expenses (+$250)
- Software licenses (+$100)

**How to add:**
1. Click "Add Line Item"
2. Enter description and amount
3. Appears as separate line on invoice

### Manual Rate Overrides

**Override individual worklogs:**
1. In preview, expand worklog list
2. Find worklog to adjust
3. Click "Edit Rate"
4. Enter new rate
5. **Note:** Override persists only for this invoice

**Use case:** Negotiated rate adjustment for specific work

---

## Invoice Statuses

Track invoice lifecycle:

```
📝 Draft      → Not sent yet, can edit freely
📧 Sent       → Sent to client, awaiting payment
💰 Paid       → Client paid, archived
❌ Cancelled  → Voided, not valid
⏰ Overdue    → Past due date, needs follow-up
```

**Status transitions:**
```
Draft → Sent (when emailed)
Sent → Paid (when payment received)
Any → Cancelled (if voided)
```

---

## Sending Invoices

### Method 1: Email Directly

1. Generate invoice PDF
2. Click "Send via Email"
3. Enter recipient email(s)
4. Customize email message
5. Click "Send"

**Email template:**
```
Subject: Invoice #2026-001 from Your Company

Dear [Client Name],

Please find attached invoice #2026-001 for services
rendered during January 2026.

Amount Due: $12,937.50
Due Date: March 3, 2026

Payment instructions are included in the attached PDF.

Thank you for your business!

Best regards,
Your Company
```

### Method 2: Download PDF

1. Generate invoice
2. Click "Download PDF"
3. Save to your computer
4. Attach to email manually or upload to accounting system

**Use case:** Company policy requires sending from specific email system

### Method 3: Print

1. Generate invoice
2. Click "Print"
3. Browser print dialog opens
4. Print physical copy for mailing or filing

---

## Invoice Management

### Viewing Past Invoices

1. Go to **Billing → Invoices**
2. See list of all invoices

<!-- TODO: Add screenshot of invoice list -->

**Columns:**
- Invoice # (clickable to view)
- Client
- Date
- Amount
- Status
- Actions (View, Download, Email, Mark Paid)

**Filters:**
- By client
- By status
- By date range

### Marking Invoice as Paid

1. Find invoice in list
2. Click **"Mark as Paid"**
3. Enter payment details:
   - Payment date
   - Payment method (Check, Wire, ACH, Card)
   - Transaction ID (optional)
4. Status changes to 💰 Paid

### Editing Draft Invoices

**Before sending:**
1. Find draft invoice
2. Click "Edit"
3. Modify line items, dates, amounts
4. Save changes

**⚠️ Cannot edit after sending!** Create a credit memo instead (see below)

### Voiding Invoices

**If invoice sent in error:**
1. Find invoice
2. Click ⋯ menu → "Void Invoice"
3. Enter reason
4. Status changes to ❌ Cancelled

**Note:** Original invoice retained for audit trail

---

## Credit Memos

### When to Use

- ✅ Overbilled client (need to refund)
- ✅ Work not completed as invoiced
- ✅ Client dispute resolution
- ✅ Discounts applied after invoice sent

### Creating a Credit Memo

1. Go to invoice to credit
2. Click "Create Credit Memo"
3. Enter:
   - Amount to credit
   - Reason
   - Line items (optional)
4. Credit memo generated as negative invoice

**Example:**
```
Original Invoice #2026-005: $10,000
Credit Memo #2026-005-CM: -$1,500
Net Amount Due: $8,500
```

---

## Recurring Invoices

### Setting Up (Coming Soon)

**For clients on retainers or subscriptions:**
1. Create invoice template
2. Set frequency (monthly, quarterly)
3. Set start and end dates
4. Invoices auto-generate on schedule

**Example:**
```
Client: Acme Corp
Template: "Monthly Retainer - 100 hours @ $125/hr"
Frequency: 1st of each month
Amount: $12,500
```

**Status:** Feature planned for Q2 2026

---

## Invoice Analytics

### Revenue Dashboard

View organization-wide invoicing metrics:

```
January 2026 Revenue
━━━━━━━━━━━━━━━━━━━━━━━━
Total Invoiced:   $127,500
Paid:             $98,000 (77%)
Pending:          $29,500 (23%)
Overdue:          $0

Average Invoice:  $12,750
# of Invoices:    10
Top Client:       Acme Corp ($42,000)
```

### Accounts Receivable

Track unpaid invoices:

```
Outstanding Invoices
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Invoice #    | Client      | Amount    | Days Overdue
─────────────────────────────────────────────────────
2026-007     | TechCo      | $15,000   | 5 days
2026-009     | BigCorp     | $8,500    | Due today
2026-010     | StartupXYZ  | $6,000    | Due in 15 days
```

**Actions:**
- Send payment reminders
- Apply late fees (if configured)
- Escalate overdue invoices

---

## Best Practices

### ✅ Do's

**✅ Sync before invoicing**
- Always run fresh sync before generating invoices
- Ensures all billable hours captured

**✅ Review billing preview**
- Don't skip preview step
- Verify rates, hours, line items

**✅ Send invoices promptly**
- Bill at end of month (or next business day)
- Faster invoicing = faster payment

**✅ Use consistent numbering**
- Sequential invoice numbers (no gaps)
- Makes tracking easier

**✅ Include payment instructions**
- Bank details in invoice footer
- Multiple payment options (ACH, Wire, Check)

### ❌ Don'ts

**❌ Don't invoice incomplete months**
- Wait until all time logged
- Sync on 1st-2nd of month for previous month

**❌ Don't forget invoice attachments**
- If client requests detailed breakdowns, include them
- Export worklog CSV as attachment

**❌ Don't mix multiple clients in one invoice**
- One invoice per client per period
- Exception: Consolidated billing (advanced)

---

## Troubleshooting

### Invoice shows $0 total

**Cause:** No billable worklogs in selected range

**Check:**
1. ✅ Worklogs exist for client/date range
2. ✅ Worklogs are marked billable
3. ✅ Rates are configured (not $0)

### Wrong client name on invoice

**Cause:** Client information outdated

**Solution:**
1. Go to Settings → Billing → Clients
2. Edit client details
3. Regenerate invoice

### PDF won't generate

**Possible causes:**
1. Too many line items (>1000)
2. Browser issue (try different browser)
3. Server timeout

**Solution:**
- Reduce date range
- Filter to specific project
- Contact administrator

### Invoice numbers skipped

**Cause:** Draft invoices deleted

**Explanation:** Invoice numbers assigned when created (even drafts). Deleting drafts creates gaps.

**Solution:** Gaps are normal and acceptable for audit trails

---

## Compliance & Tax

### Tax Handling

**Sales Tax / VAT:**
- Configured per client (Settings → Clients → Tax Rate)
- Automatically calculated and added to invoice
- Separate line item on invoice

**Tax ID Display:**
- Your company's tax ID on invoice header
- Required in many jurisdictions
- Set in Settings → Company → Tax Information

### Record Retention

**Recommendation:** Keep invoice records for 7 years minimum

**What to retain:**
- Generated PDF invoices
- Billing preview reports
- Payment confirmations
- Credit memos

**How:** Download invoices monthly, store in secure backup

---

## Next Steps

- **[Settings](./settings.md)** - Configure invoice templates and branding
- **[Billing System](./billing.md)** - Set up rate cascades for accurate billing

---

*🧾 Professional invoices build client trust. Generate them effortlessly.*
