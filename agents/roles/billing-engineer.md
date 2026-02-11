# Billing Engineer

## Role Overview
Responsible for billing calculation engine, invoice generation, rate cascade system, worklog classification, client/project management, and Excel export functionality.

---

## Primary Responsibilities

### Billing Calculation Engine
- Implement complex rate cascade logic (6-level priority)
- Calculate billable hours per project/client
- Handle rate overrides at multiple levels
- Support time-based rate changes
- Worklog classification (billable/non-billable)

### Invoice Management
- Generate billing previews for date ranges
- Create invoices from previews
- Line item generation with calculated rates
- Invoice status tracking (draft, sent, paid)
- Excel export with formatting

### Client & Project Management
- CRUD operations for billing clients
- CRUD operations for billing projects
- Map JIRA epics/components to billing projects
- Rate management (user-specific, issue type-specific)

### Complex Business Logic
- Multi-currency support (future)
- Discount/adjustment handling
- Tax calculation (future)
- Budget tracking integration (future)

---

## Files/Folders Ownership

### Core Billing Logic
- `backend/app/billing.py`
  - Billing calculation engine
  - Rate cascade resolution
  - Expected hours calculation
  - Invoice generation logic

### API Router
- `backend/app/routers/billing.py` (23 endpoints)

  **Clients (4 endpoints):**
  - GET `/api/billing/clients` - List clients
  - POST `/api/billing/clients` - Create client
  - PUT `/api/billing/clients/{id}` - Update client
  - DELETE `/api/billing/clients/{id}` - Delete client

  **Projects (6 endpoints):**
  - GET `/api/billing/projects` - List projects
  - POST `/api/billing/projects` - Create project
  - PUT `/api/billing/projects/{id}` - Update project
  - DELETE `/api/billing/projects/{id}` - Delete project
  - POST `/api/billing/projects/{id}/mappings` - Add JIRA mapping
  - DELETE `/api/billing/mappings/{id}` - Delete mapping

  **Rates (3 endpoints):**
  - GET `/api/billing/rates` - List rates
  - POST `/api/billing/rates` - Create rate
  - DELETE `/api/billing/rates/{id}` - Delete rate

  **Classification (3 endpoints):**
  - GET `/api/billing/classifications` - List classifications
  - POST `/api/billing/classifications` - Classify worklog
  - POST `/api/billing/classifications/bulk` - Bulk classify

  **Invoicing (7 endpoints):**
  - GET `/api/billing/preview` - Generate preview
  - POST `/api/billing/invoices` - Create invoice
  - GET `/api/billing/invoices` - List invoices
  - GET `/api/billing/invoices/{id}` - Invoice detail
  - PUT `/api/billing/invoices/{id}` - Update invoice
  - DELETE `/api/billing/invoices/{id}` - Delete invoice
  - POST `/api/billing/invoices/{id}/export` - Export to Excel

### Frontend Components
- `frontend/src/pages/Billing.jsx` (54KB - complex UI)
  - Billing preview interface
  - Worklog classification UI
  - Invoice creation wizard
  - Invoice list and detail views

- `frontend/src/components/settings/PackageTemplatesSection.jsx`
  - Package template management UI

---

## Billing Architecture

### Rate Cascade System

**Resolution Order (Highest to Lowest Priority):**

```
1. Worklog-Level Override
   ↓ (if not set)
2. User + Project Rate
   ↓ (if not set)
3. Issue Type + Project Rate
   ↓ (if not set)
4. Project Default Rate
   ↓ (if not set)
5. Client Default Rate
   ↓ (if not set)
6. Fallback: €0 (non-billable)
```

### Database Schema

**billing_clients:**
```sql
CREATE TABLE billing_clients (
    id INTEGER PRIMARY KEY,
    company_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    default_hourly_rate REAL,
    created_at TIMESTAMP,
    UNIQUE(company_id, name)
);
```

**billing_projects:**
```sql
CREATE TABLE billing_projects (
    id INTEGER PRIMARY KEY,
    company_id INTEGER NOT NULL,  -- Inherited from client
    client_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    default_hourly_rate REAL,
    created_at TIMESTAMP,
    FOREIGN KEY(client_id) REFERENCES billing_clients(id)
);
```

**billing_project_mappings:**
```sql
CREATE TABLE billing_project_mappings (
    id INTEGER PRIMARY KEY,
    billing_project_id INTEGER NOT NULL,
    jira_instance TEXT NOT NULL,
    epic_key TEXT,              -- Map by epic
    component TEXT,             -- OR map by component
    created_at TIMESTAMP,
    FOREIGN KEY(billing_project_id) REFERENCES billing_projects(id)
);
```

**billing_rates:**
```sql
CREATE TABLE billing_rates (
    id INTEGER PRIMARY KEY,
    billing_project_id INTEGER NOT NULL,
    user_email TEXT,            -- User-specific rate (optional)
    issue_type TEXT,            -- Issue type-specific rate (optional)
    hourly_rate REAL NOT NULL,
    valid_from DATE,
    valid_to DATE,
    created_at TIMESTAMP,
    FOREIGN KEY(billing_project_id) REFERENCES billing_projects(id)
);
```

**billing_worklog_classifications:**
```sql
CREATE TABLE billing_worklog_classifications (
    id INTEGER PRIMARY KEY,
    worklog_id TEXT NOT NULL UNIQUE,
    company_id INTEGER NOT NULL,
    is_billable BOOLEAN DEFAULT 1,
    override_hourly_rate REAL,  -- Worklog-level override
    notes TEXT,
    created_at TIMESTAMP
);
```

**invoices:**
```sql
CREATE TABLE invoices (
    id INTEGER PRIMARY KEY,
    company_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,
    invoice_number TEXT NOT NULL,
    status TEXT DEFAULT 'draft',  -- draft, sent, paid, cancelled
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_hours REAL,
    total_amount REAL,
    created_at TIMESTAMP,
    UNIQUE(company_id, invoice_number)
);
```

**invoice_line_items:**
```sql
CREATE TABLE invoice_line_items (
    id INTEGER PRIMARY KEY,
    invoice_id INTEGER NOT NULL,
    billing_project_id INTEGER NOT NULL,
    user_email TEXT,
    hours REAL NOT NULL,
    hourly_rate REAL NOT NULL,
    amount REAL NOT NULL,
    created_at TIMESTAMP,
    FOREIGN KEY(invoice_id) REFERENCES invoices(id)
);
```

---

## Dependencies

### ⬇️ Depends On

**Database-Engineer:**
- Complex queries for billing calculations
- Aggregate functions for hours/amounts
- Join queries across billing tables

**Security-Engineer:**
- Manager/Admin role enforcement (billing is sensitive)
- Multi-tenant isolation for billing data

**Integration-Engineer:**
- Worklog data from JIRA/Tempo sync
- Issue metadata for classification

### ⬆️ Provides To

**Frontend-Engineer:**
- Billing preview data for UI
- Invoice data for display/export
- Client/project lists for dropdowns

**Backend-Core-Engineer:**
- Billing-related analytics endpoints
- May share aggregation patterns

---

## Required Skills

### Core Technologies
- **Python**: Complex business logic, calculations
- **openpyxl**: Excel file generation and formatting
- **Decimal**: Precise financial calculations (avoid float errors)
- **SQL**: Complex joins and aggregations

### Business Logic
- Financial calculations
- Rate management
- Invoice generation
- Multi-level cascading logic

### Data Modeling
- Relational database design for billing
- Normalization vs denormalization trade-offs
- Audit trail implementation

---

## Development Workflow

### Implementing Rate Cascade

```python
# In billing.py
from decimal import Decimal

async def calculate_hourly_rate(
    worklog: dict,
    billing_project_id: int,
    worklog_date: date,
    storage: WorklogStorage
) -> Decimal:
    """
    Calculate hourly rate for worklog using cascade.
    Returns rate as Decimal for precision.
    """

    # 1. Check worklog-level override
    classification = await storage.get_worklog_classification(
        worklog['id']
    )
    if classification and classification.override_hourly_rate:
        return Decimal(str(classification.override_hourly_rate))

    # 2. Check user + project rate
    rate = await storage.get_billing_rate(
        billing_project_id=billing_project_id,
        user_email=worklog['author_email'],
        valid_date=worklog_date
    )
    if rate:
        return Decimal(str(rate.hourly_rate))

    # 3. Check issue type + project rate
    rate = await storage.get_billing_rate(
        billing_project_id=billing_project_id,
        issue_type=worklog['issue_type'],
        valid_date=worklog_date
    )
    if rate:
        return Decimal(str(rate.hourly_rate))

    # 4. Check project default rate
    project = await storage.get_billing_project(billing_project_id)
    if project.default_hourly_rate:
        return Decimal(str(project.default_hourly_rate))

    # 5. Check client default rate
    client = await storage.get_billing_client(project.client_id)
    if client.default_hourly_rate:
        return Decimal(str(client.default_hourly_rate))

    # 6. Fallback: non-billable
    return Decimal('0.00')
```

### Generating Billing Preview

```python
async def generate_billing_preview(
    start_date: date,
    end_date: date,
    client_id: int,
    company_id: int,
    storage: WorklogStorage
) -> dict:
    """Generate billing preview for date range and client"""

    # Get all billing projects for client
    projects = await storage.get_billing_projects_by_client(
        client_id, company_id
    )

    # Get worklogs for date range
    worklogs = await storage.get_worklogs_in_range(
        start_date, end_date, company_id=company_id
    )

    # Filter worklogs by project mappings
    preview_items = []
    total_hours = Decimal('0.00')
    total_amount = Decimal('0.00')

    for project in projects:
        # Get mappings for this project
        mappings = await storage.get_project_mappings(project.id)

        # Filter worklogs matching mappings
        project_worklogs = []
        for worklog in worklogs:
            for mapping in mappings:
                if (mapping.epic_key and worklog['epic_key'] == mapping.epic_key) or \
                   (mapping.component and worklog['component'] == mapping.component):
                    project_worklogs.append(worklog)
                    break

        # Calculate hours and amounts per user
        user_hours = {}
        for worklog in project_worklogs:
            # Check if billable
            classification = await storage.get_worklog_classification(
                worklog['id']
            )
            if classification and not classification.is_billable:
                continue  # Skip non-billable

            # Calculate rate
            rate = await calculate_hourly_rate(
                worklog, project.id,
                worklog['started'].date(),
                storage
            )

            hours = Decimal(str(worklog['time_spent_seconds'])) / 3600

            user_email = worklog['author_email']
            if user_email not in user_hours:
                user_hours[user_email] = {
                    'hours': Decimal('0.00'),
                    'amount': Decimal('0.00'),
                    'rate': rate
                }

            user_hours[user_email]['hours'] += hours
            user_hours[user_email]['amount'] += hours * rate

        # Add project to preview
        project_hours = sum(u['hours'] for u in user_hours.values())
        project_amount = sum(u['amount'] for u in user_hours.values())

        preview_items.append({
            'project_id': project.id,
            'project_name': project.name,
            'users': user_hours,
            'total_hours': float(project_hours),
            'total_amount': float(project_amount)
        })

        total_hours += project_hours
        total_amount += project_amount

    return {
        'client_id': client_id,
        'start_date': str(start_date),
        'end_date': str(end_date),
        'projects': preview_items,
        'total_hours': float(total_hours),
        'total_amount': float(total_amount)
    }
```

### Creating Invoice from Preview

```python
async def create_invoice_from_preview(
    preview: dict,
    invoice_number: str,
    company_id: int,
    storage: WorklogStorage
) -> dict:
    """Create invoice record from billing preview"""

    # Create invoice master record
    invoice_id = await storage.create_invoice({
        'company_id': company_id,
        'client_id': preview['client_id'],
        'invoice_number': invoice_number,
        'status': 'draft',
        'start_date': preview['start_date'],
        'end_date': preview['end_date'],
        'total_hours': preview['total_hours'],
        'total_amount': preview['total_amount'],
        'created_at': datetime.utcnow()
    })

    # Create line items
    for project in preview['projects']:
        for user_email, user_data in project['users'].items():
            await storage.create_invoice_line_item({
                'invoice_id': invoice_id,
                'billing_project_id': project['project_id'],
                'user_email': user_email,
                'hours': user_data['hours'],
                'hourly_rate': user_data['rate'],
                'amount': user_data['amount'],
                'created_at': datetime.utcnow()
            })

    # Return created invoice
    return await storage.get_invoice(invoice_id, company_id)
```

### Excel Export

```python
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill
from openpyxl.utils import get_column_letter

async def export_invoice_to_excel(
    invoice_id: int,
    company_id: int,
    storage: WorklogStorage
) -> bytes:
    """Export invoice to formatted Excel file"""

    # Get invoice with line items
    invoice = await storage.get_invoice_with_items(invoice_id, company_id)
    client = await storage.get_billing_client(invoice['client_id'])

    # Create workbook
    wb = Workbook()
    ws = wb.active
    ws.title = "Invoice"

    # Header styling
    header_font = Font(bold=True, size=14)
    header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")

    # Invoice header
    ws['A1'] = f"Invoice #{invoice['invoice_number']}"
    ws['A1'].font = Font(bold=True, size=16)

    ws['A2'] = f"Client: {client['name']}"
    ws['A3'] = f"Period: {invoice['start_date']} to {invoice['end_date']}"
    ws['A4'] = f"Status: {invoice['status'].upper()}"

    # Line items header (row 6)
    headers = ['Project', 'User', 'Hours', 'Rate', 'Amount']
    for col_idx, header in enumerate(headers, start=1):
        cell = ws.cell(row=6, column=col_idx)
        cell.value = header
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal='center')

    # Line items
    row = 7
    for item in invoice['line_items']:
        project = await storage.get_billing_project(item['billing_project_id'])

        ws.cell(row=row, column=1, value=project['name'])
        ws.cell(row=row, column=2, value=item['user_email'])
        ws.cell(row=row, column=3, value=round(item['hours'], 2))
        ws.cell(row=row, column=4, value=f"€{item['hourly_rate']:.2f}")
        ws.cell(row=row, column=5, value=f"€{item['amount']:.2f}")

        row += 1

    # Total row
    ws.cell(row=row+1, column=2, value="TOTAL")
    ws.cell(row=row+1, column=2).font = Font(bold=True)
    ws.cell(row=row+1, column=3, value=round(invoice['total_hours'], 2))
    ws.cell(row=row+1, column=3).font = Font(bold=True)
    ws.cell(row=row+1, column=5, value=f"€{invoice['total_amount']:.2f}")
    ws.cell(row=row+1, column=5).font = Font(bold=True)

    # Auto-size columns
    for col in range(1, 6):
        ws.column_dimensions[get_column_letter(col)].width = 20

    # Save to bytes
    from io import BytesIO
    output = BytesIO()
    wb.save(output)
    output.seek(0)

    return output.getvalue()
```

---

## Common Patterns

### Worklog Classification Pattern

```python
@router.post("/api/billing/classifications")
async def classify_worklog(
    worklog_id: str,
    is_billable: bool = True,
    override_rate: float = None,
    notes: str = None,
    manager: CurrentUser = Depends(require_manager)
):
    """Classify worklog as billable/non-billable with optional rate override"""

    storage = get_storage()

    # Verify worklog exists and belongs to company
    worklog = await storage.get_worklog_by_id(
        worklog_id, manager.company_id
    )
    if not worklog:
        raise HTTPException(404, "Worklog not found")

    # Upsert classification
    classification = await storage.upsert_worklog_classification({
        'worklog_id': worklog_id,
        'company_id': manager.company_id,
        'is_billable': is_billable,
        'override_hourly_rate': override_rate,
        'notes': notes,
        'created_at': datetime.utcnow()
    })

    return classification
```

### Rate Management Pattern

```python
@router.post("/api/billing/rates")
async def create_billing_rate(
    billing_project_id: int,
    hourly_rate: float,
    user_email: str = None,
    issue_type: str = None,
    valid_from: date = None,
    valid_to: date = None,
    admin: CurrentUser = Depends(require_admin)
):
    """Create billing rate override"""

    if not user_email and not issue_type:
        raise HTTPException(
            400,
            "Must specify either user_email or issue_type"
        )

    if user_email and issue_type:
        raise HTTPException(
            400,
            "Cannot specify both user_email and issue_type"
        )

    storage = get_storage()

    # Verify project exists and belongs to company
    project = await storage.get_billing_project(
        billing_project_id, admin.company_id
    )
    if not project:
        raise HTTPException(404, "Billing project not found")

    # Create rate
    rate = await storage.create_billing_rate({
        'billing_project_id': billing_project_id,
        'user_email': user_email,
        'issue_type': issue_type,
        'hourly_rate': hourly_rate,
        'valid_from': valid_from,
        'valid_to': valid_to,
        'created_at': datetime.utcnow()
    })

    return rate
```

---

## Best Practices

### Financial Calculations
- **Use Decimal, not float**: Avoid floating-point precision errors
  ```python
  from decimal import Decimal
  total = Decimal('10.5') * Decimal('25.00')  # Exact: 262.50
  # NOT: 10.5 * 25.0  # May have precision errors
  ```

- **Round at display time**: Keep full precision internally
  ```python
  # Calculate with full precision
  amount = hours * rate  # Decimal

  # Round when displaying
  return {"amount": float(round(amount, 2))}
  ```

- **Use currency-safe comparisons**
  ```python
  if abs(calculated_total - expected_total) < Decimal('0.01'):
      # Amounts match (within 1 cent)
  ```

### Rate Management
- **Time-based rates**: Check valid_from and valid_to dates
- **Rate priority**: Document cascade in code comments
- **Audit changes**: Log all rate modifications
- **Prevent overlaps**: Validate rate date ranges

### Invoice Generation
- **Atomic operations**: Create invoice + line items in transaction
- **Invoice numbers**: Auto-generate or validate uniqueness
- **Status workflow**: draft → sent → paid (one-way)
- **Audit trail**: Track status changes with timestamps

---

## Testing Billing Logic

### Unit Tests for Rate Cascade

```python
@pytest.mark.asyncio
async def test_rate_cascade_worklog_override():
    """Worklog override should take precedence"""

    # Setup: Create worklog with override
    await storage.upsert_worklog_classification({
        'worklog_id': 'WL-123',
        'override_hourly_rate': 150.0
    })

    # Calculate rate
    rate = await calculate_hourly_rate(
        worklog={'id': 'WL-123', 'author_email': 'user@test.com'},
        billing_project_id=1,
        worklog_date=date.today(),
        storage=storage
    )

    # Verify override used
    assert rate == Decimal('150.0')

@pytest.mark.asyncio
async def test_rate_cascade_project_default():
    """Project default should be used if no overrides"""

    # Setup: Project with default rate, no overrides
    project = await storage.create_billing_project({
        'name': 'Test Project',
        'client_id': 1,
        'default_hourly_rate': 75.0
    })

    # Calculate rate
    rate = await calculate_hourly_rate(
        worklog={'id': 'WL-456', 'author_email': 'user@test.com'},
        billing_project_id=project['id'],
        worklog_date=date.today(),
        storage=storage
    )

    # Verify project default used
    assert rate == Decimal('75.0')
```

### Integration Tests for Invoice Generation

```python
@pytest.mark.asyncio
async def test_invoice_generation_end_to_end():
    """Test complete invoice generation workflow"""

    # Setup: Create client, project, worklogs
    client = await storage.create_billing_client({
        'name': 'Test Client',
        'default_hourly_rate': 50.0,
        'company_id': 1
    })

    project = await storage.create_billing_project({
        'name': 'Test Project',
        'client_id': client['id'],
        'company_id': 1
    })

    # Create worklogs
    await storage.upsert_worklogs([
        {
            'id': 'WL-1',
            'author_email': 'user@test.com',
            'time_spent_seconds': 7200,  # 2 hours
            'started': datetime(2024, 1, 15, 9, 0),
            'company_id': 1
        }
    ])

    # Generate preview
    preview = await generate_billing_preview(
        start_date=date(2024, 1, 1),
        end_date=date(2024, 1, 31),
        client_id=client['id'],
        company_id=1,
        storage=storage
    )

    # Verify preview
    assert preview['total_hours'] == 2.0
    assert preview['total_amount'] == 100.0  # 2 hours * €50

    # Create invoice
    invoice = await create_invoice_from_preview(
        preview=preview,
        invoice_number='INV-2024-001',
        company_id=1,
        storage=storage
    )

    # Verify invoice
    assert invoice['status'] == 'draft'
    assert invoice['total_hours'] == 2.0
    assert invoice['total_amount'] == 100.0
```

---

## Troubleshooting

### Common Issues

**Issue: Rate calculation returns 0 for all worklogs**
- Check project mappings exist
- Verify worklogs match mapping criteria (epic_key or component)
- Ensure at least one rate is configured in cascade

**Issue: Billing preview shows incorrect hours**
- Check worklog classification (is_billable flag)
- Verify date range includes worklogs
- Check project mappings are correct

**Issue: Invoice export fails**
- Check openpyxl is installed
- Verify invoice has line items
- Check file permissions for temporary directory

**Issue: Duplicate invoice numbers**
- Implement invoice number validation
- Use auto-increment or date-based generation
- Add unique constraint on (company_id, invoice_number)

---

## Communication Protocol

### When to Notify Other Agents

**Database-Engineer:**
- Complex query performance issues
- New indexes needed for billing queries
- Migration for billing schema changes

**Frontend-Engineer:**
- Billing API changes affecting UI
- New fields available in preview/invoice
- Excel export format updates

**Backend-Core-Engineer:**
- Shared aggregation logic patterns
- Billing-related analytics endpoints

**Tech-Lead:**
- Major billing logic changes
- Rate cascade modifications
- Invoice workflow changes

---

## Resources

### Documentation
- openpyxl docs: https://openpyxl.readthedocs.io/
- Decimal module: https://docs.python.org/3/library/decimal.html
- Project overview: `/docs/project-overview.md`

### Internal References
- Billing engine: `/backend/app/billing.py`
- Billing router: `/backend/app/routers/billing.py`
- Billing UI: `/frontend/src/pages/Billing.jsx`

---

## Quick Reference Commands

```bash
# Test billing calculations
cd backend
pytest tests/test_billing.py -v

# Generate invoice manually (Python shell)
python
>>> from app.billing import generate_billing_preview
>>> preview = await generate_billing_preview(...)

# Export invoice to Excel (test)
python
>>> from app.billing import export_invoice_to_excel
>>> excel_data = await export_invoice_to_excel(invoice_id=1, company_id=1)
>>> with open('test_invoice.xlsx', 'wb') as f:
...     f.write(excel_data)
```
