"""
Billing API router - clients, projects, rates, invoices, and preview.
"""
import json
from datetime import date
from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.responses import StreamingResponse

from ..models import (
    BillingClientCreate, BillingClientUpdate,
    BillingProjectCreate, BillingProjectUpdate,
    BillingProjectMappingCreate,
    BillingRateCreate,
    BillingClassificationCreate, BillingClassificationBulk,
    BillingPreviewResponse,
    InvoiceCreate, InvoiceListResponse,
)
from ..cache import get_storage
from ..billing import compute_billing_preview, generate_invoice_excel
from ..auth.dependencies import get_current_user, require_admin, CurrentUser

router = APIRouter(prefix="/api/billing", tags=["billing"])


# ============ Clients ============

@router.get("/clients")
async def list_clients(current_user: CurrentUser = Depends(get_current_user)):
    """List all billing clients (scoped to company)."""
    storage = get_storage()
    clients = await storage.get_all_billing_clients(current_user.company_id)
    return clients


@router.post("/clients")
async def create_client(
    data: BillingClientCreate,
    current_user: CurrentUser = Depends(require_admin)
):
    """Create a new billing client (ADMIN only)."""
    storage = get_storage()
    try:
        client_id = await storage.create_billing_client(
            name=data.name,
            billing_currency=data.billing_currency,
            default_hourly_rate=data.default_hourly_rate,
            jira_instance_id=data.jira_instance_id,
            company_id=current_user.company_id
        )
    except Exception as e:
        if "UNIQUE" in str(e):
            raise HTTPException(status_code=409, detail="Client name already exists")
        raise
    return await storage.get_billing_client(client_id, current_user.company_id)


@router.put("/clients/{client_id}")
async def update_client(
    client_id: int,
    data: BillingClientUpdate,
    current_user: CurrentUser = Depends(require_admin)
):
    """Update a billing client (ADMIN only)."""
    storage = get_storage()
    updates = data.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updated = await storage.update_billing_client(client_id, current_user.company_id, **updates)
    if not updated:
        raise HTTPException(status_code=404, detail="Client not found")
    return await storage.get_billing_client(client_id, current_user.company_id)


@router.delete("/clients/{client_id}")
async def delete_client(
    client_id: int,
    current_user: CurrentUser = Depends(require_admin)
):
    """Delete a billing client and all related data (ADMIN only)."""
    storage = get_storage()
    deleted = await storage.delete_billing_client(client_id, current_user.company_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"status": "ok"}


# ============ Projects ============

@router.get("/projects")
async def list_projects(
    client_id: int = Query(None),
    current_user: CurrentUser = Depends(get_current_user)
):
    """List billing projects, optionally filtered by client (scoped to company)."""
    storage = get_storage()
    if client_id:
        return await storage.get_billing_projects_by_client(client_id, current_user.company_id)
    return await storage.get_all_billing_projects(current_user.company_id)


@router.post("/projects")
async def create_project(
    data: BillingProjectCreate,
    current_user: CurrentUser = Depends(require_admin)
):
    """Create a new billing project (ADMIN only)."""
    storage = get_storage()
    # Verify client exists
    client = await storage.get_billing_client(data.client_id, current_user.company_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    project_id = await storage.create_billing_project(
        client_id=data.client_id,
        name=data.name,
        default_hourly_rate=data.default_hourly_rate,
        company_id=current_user.company_id
    )
    return await storage.get_billing_project(project_id, current_user.company_id)


@router.put("/projects/{project_id}")
async def update_project(
    project_id: int,
    data: BillingProjectUpdate,
    current_user: CurrentUser = Depends(require_admin)
):
    """Update a billing project (ADMIN only)."""
    storage = get_storage()
    updates = data.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updated = await storage.update_billing_project(project_id, current_user.company_id, **updates)
    if not updated:
        raise HTTPException(status_code=404, detail="Project not found")
    return await storage.get_billing_project(project_id, current_user.company_id)


@router.delete("/projects/{project_id}")
async def delete_project(
    project_id: int,
    current_user: CurrentUser = Depends(require_admin)
):
    """Delete a billing project (ADMIN only)."""
    storage = get_storage()
    deleted = await storage.delete_billing_project(project_id, current_user.company_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"status": "ok"}


# ============ Project Mappings ============

@router.post("/projects/{project_id}/mappings")
async def add_mapping(
    project_id: int,
    data: BillingProjectMappingCreate,
    current_user: CurrentUser = Depends(require_admin)
):
    """Add a JIRA project mapping to a billing project (ADMIN only)."""
    storage = get_storage()
    project = await storage.get_billing_project(project_id, current_user.company_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        mapping_id = await storage.add_billing_project_mapping(
            billing_project_id=project_id,
            jira_instance=data.jira_instance,
            jira_project_key=data.jira_project_key,
            company_id=current_user.company_id
        )
    except Exception as e:
        if "UNIQUE" in str(e):
            raise HTTPException(status_code=409, detail="Mapping already exists")
        raise
    return {"id": mapping_id, "status": "ok"}


@router.delete("/projects/{project_id}/mappings/{mapping_id}")
async def remove_mapping(
    project_id: int,
    mapping_id: int,
    current_user: CurrentUser = Depends(require_admin)
):
    """Remove a JIRA project mapping (ADMIN only)."""
    storage = get_storage()
    deleted = await storage.delete_billing_project_mapping(mapping_id, current_user.company_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Mapping not found")
    return {"status": "ok"}


# ============ Rates ============

@router.get("/rates")
async def list_rates(
    billing_project_id: int = Query(...),
    current_user: CurrentUser = Depends(get_current_user)
):
    """List billing rates for a project (scoped to company)."""
    storage = get_storage()
    return await storage.get_billing_rates(billing_project_id, current_user.company_id)


@router.post("/rates")
async def create_rate(
    data: BillingRateCreate,
    current_user: CurrentUser = Depends(require_admin)
):
    """Create a billing rate override (ADMIN only)."""
    storage = get_storage()
    rate_id = await storage.create_billing_rate(
        billing_project_id=data.billing_project_id,
        hourly_rate=data.hourly_rate,
        user_email=data.user_email,
        issue_type=data.issue_type,
        valid_from=data.valid_from.isoformat() if data.valid_from else None,
        valid_to=data.valid_to.isoformat() if data.valid_to else None,
        company_id=current_user.company_id
    )
    return {"id": rate_id, "status": "ok"}


@router.delete("/rates/{rate_id}")
async def delete_rate(
    rate_id: int,
    current_user: CurrentUser = Depends(require_admin)
):
    """Delete a billing rate (ADMIN only)."""
    storage = get_storage()
    deleted = await storage.delete_billing_rate(rate_id, current_user.company_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Rate not found")
    return {"status": "ok"}


# ============ Classifications ============

@router.post("/classifications")
async def classify_worklog(
    data: BillingClassificationCreate,
    current_user: CurrentUser = Depends(require_admin)
):
    """Classify a worklog as billable/non-billable (ADMIN only)."""
    storage = get_storage()
    await storage.set_worklog_classification(
        worklog_id=data.worklog_id,
        is_billable=data.is_billable,
        override_hourly_rate=data.override_hourly_rate,
        note=data.note,
        company_id=current_user.company_id
    )
    return {"status": "ok"}


@router.post("/classifications/bulk")
async def bulk_classify_worklogs(
    data: BillingClassificationBulk,
    current_user: CurrentUser = Depends(require_admin)
):
    """Bulk classify worklogs as billable/non-billable (ADMIN only)."""
    storage = get_storage()
    for wid in data.worklog_ids:
        await storage.set_worklog_classification(
            worklog_id=wid,
            is_billable=data.is_billable,
            note=data.note,
            company_id=current_user.company_id
        )
    return {"status": "ok", "count": len(data.worklog_ids)}


# ============ Preview ============

@router.get("/preview", response_model=BillingPreviewResponse)
async def billing_preview(
    client_id: int = Query(...),
    period_start: date = Query(...),
    period_end: date = Query(...),
    group_by: str = Query("project"),
    billing_project_id: int = Query(None),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get a live billing preview for a client in a period (scoped to company)."""
    try:
        return await compute_billing_preview(
            client_id=client_id,
            period_start=period_start,
            period_end=period_end,
            group_by=group_by,
            billing_project_id=billing_project_id,
            company_id=current_user.company_id
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ============ Invoices ============

@router.post("/invoices")
async def create_invoice(
    data: InvoiceCreate,
    current_user: CurrentUser = Depends(require_admin)
):
    """Create an invoice from billing preview (snapshot) (ADMIN only)."""
    storage = get_storage()

    # Compute preview to get line items
    try:
        preview = await compute_billing_preview(
            client_id=data.client_id,
            period_start=data.period_start,
            period_end=data.period_end,
            group_by=data.group_by,
            billing_project_id=data.billing_project_id,
            company_id=current_user.company_id
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    total_amount = round(preview.subtotal_amount + data.taxes_amount, 2)

    # Create invoice
    invoice_id = await storage.create_invoice(
        client_id=data.client_id,
        billing_project_id=data.billing_project_id,
        period_start=data.period_start.isoformat(),
        period_end=data.period_end.isoformat(),
        currency=preview.currency,
        subtotal_amount=preview.subtotal_amount,
        taxes_amount=data.taxes_amount,
        total_amount=total_amount,
        group_by=data.group_by,
        notes=data.notes,
        company_id=current_user.company_id
    )

    # Snapshot line items
    for idx, li in enumerate(preview.line_items):
        await storage.add_invoice_line_item(
            invoice_id=invoice_id,
            line_type="work",
            description=li.description,
            quantity_hours=li.quantity_hours,
            hourly_rate=li.hourly_rate,
            amount=li.amount,
            metadata_json=json.dumps(li.metadata) if li.metadata else None,
            sort_order=idx,
            company_id=current_user.company_id
        )

    return await storage.get_invoice(invoice_id, current_user.company_id)


@router.get("/invoices", response_model=InvoiceListResponse)
async def list_invoices(
    client_id: int = Query(None),
    status: str = Query(None),
    current_user: CurrentUser = Depends(get_current_user)
):
    """List invoices with optional filters (scoped to company)."""
    storage = get_storage()
    invoices = await storage.get_invoices(
        client_id=client_id,
        status=status,
        company_id=current_user.company_id
    )
    return InvoiceListResponse(invoices=invoices, total_count=len(invoices))


@router.get("/invoices/{invoice_id}")
async def get_invoice(
    invoice_id: int,
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get invoice detail with line items (scoped to company)."""
    storage = get_storage()
    invoice = await storage.get_invoice(invoice_id, current_user.company_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


@router.post("/invoices/{invoice_id}/issue")
async def issue_invoice(
    invoice_id: int,
    current_user: CurrentUser = Depends(require_admin)
):
    """Issue (finalize) a draft invoice (ADMIN only)."""
    storage = get_storage()
    invoice = await storage.get_invoice(invoice_id, current_user.company_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if invoice["status"] != "DRAFT":
        raise HTTPException(status_code=400, detail=f"Cannot issue invoice with status {invoice['status']}")
    await storage.update_invoice_status(invoice_id, "ISSUED", current_user.company_id)
    return await storage.get_invoice(invoice_id, current_user.company_id)


@router.post("/invoices/{invoice_id}/void")
async def void_invoice(
    invoice_id: int,
    current_user: CurrentUser = Depends(require_admin)
):
    """Void an issued invoice (ADMIN only)."""
    storage = get_storage()
    invoice = await storage.get_invoice(invoice_id, current_user.company_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if invoice["status"] not in ("DRAFT", "ISSUED"):
        raise HTTPException(status_code=400, detail=f"Cannot void invoice with status {invoice['status']}")
    await storage.update_invoice_status(invoice_id, "VOID", current_user.company_id)
    return await storage.get_invoice(invoice_id, current_user.company_id)


@router.delete("/invoices/{invoice_id}")
async def delete_invoice(
    invoice_id: int,
    current_user: CurrentUser = Depends(require_admin)
):
    """Delete a draft invoice (ADMIN only)."""
    storage = get_storage()
    deleted = await storage.delete_invoice(invoice_id, current_user.company_id)
    if not deleted:
        raise HTTPException(status_code=400, detail="Invoice not found or not in DRAFT status")
    return {"status": "ok"}


@router.get("/invoices/{invoice_id}/export.xlsx")
async def export_invoice_excel(
    invoice_id: int,
    current_user: CurrentUser = Depends(get_current_user)
):
    """Export an invoice as an Excel file (scoped to company)."""
    storage = get_storage()
    invoice = await storage.get_invoice(invoice_id, current_user.company_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    buffer = await generate_invoice_excel(invoice)
    filename = f"fattura_{invoice_id}_{invoice['client_name'].replace(' ', '_')}.xlsx"

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
