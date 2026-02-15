"""
Factorial HR API router - configurazione, employee mappings, leaves sync.
Pattern: seguire settings.py per user operations, sync.py per sync logic.
"""
from datetime import date
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional

from ..models import (
    FactorialConfigCreate, FetchFactorialIdResponse,
    BulkFetchFactorialResult, BulkFetchFactorialResponse, FactorialLeave
)
from ..cache import get_storage
from ..factorial_client import FactorialClient
from ..auth.dependencies import get_current_user, require_admin, CurrentUser

router = APIRouter(prefix="/api/factorial", tags=["factorial"])


# ========== Configuration ==========

@router.get("/config")
async def get_factorial_config(current_user: CurrentUser = Depends(require_admin)):
    """Get Factorial configuration (masked API key) (ADMIN only)."""
    storage = get_storage()
    config = await storage.get_factorial_config(current_user.company_id)
    if not config:
        return {"configured": False}
    return {
        "configured": True,
        "is_active": config["is_active"],
        "api_key_preview": f"{config['api_key'][:8]}..." if len(config['api_key']) > 8 else "***"
    }


@router.post("/config")
async def set_factorial_config(
    config: FactorialConfigCreate,
    current_user: CurrentUser = Depends(require_admin)
):
    """Set/update Factorial configuration con test connessione (ADMIN only)."""
    storage = get_storage()
    try:
        client = FactorialClient(config.api_key)
        await client.test_connection()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid API key: {str(e)}")

    config_id = await storage.set_factorial_config(config.api_key, current_user.company_id)
    return {"success": True, "message": "Factorial configured", "config_id": config_id}


# ========== Employee Mapping (Singolo) ==========

@router.post("/users/{user_id}/fetch-employee-id", response_model=FetchFactorialIdResponse)
async def fetch_factorial_employee_id(
    user_id: int,
    current_user: CurrentUser = Depends(require_admin)
):
    """
    Fetch Factorial employee ID per singolo user (ADMIN only).
    Pattern: seguire settings.py:fetch_jira_account_id
    """
    storage = get_storage()

    user = await storage.get_user(user_id, current_user.company_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    config = await storage.get_factorial_config(current_user.company_id)
    if not config:
        raise HTTPException(status_code=400, detail="Factorial not configured")

    try:
        client = FactorialClient(config["api_key"])
        employee_id = await client.search_employee_by_email(user["email"])

        if not employee_id:
            raise HTTPException(status_code=404, detail=f"Employee not found for {user['email']}")

        await storage.set_user_factorial_account(user_id, employee_id, user["email"], current_user.company_id)

        return FetchFactorialIdResponse(
            factorial_employee_id=employee_id,
            factorial_email=user["email"]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.delete("/users/{user_id}/factorial-account")
async def delete_factorial_account(
    user_id: int,
    current_user: CurrentUser = Depends(require_admin)
):
    """Elimina mapping Factorial per user (ADMIN only)."""
    storage = get_storage()
    deleted = await storage.delete_user_factorial_account(user_id, current_user.company_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Mapping not found")
    return {"success": True}


# ========== Employee Mapping (Bulk) ==========

@router.post("/users/bulk-fetch-employees", response_model=BulkFetchFactorialResponse)
async def bulk_fetch_factorial_employees(current_user: CurrentUser = Depends(require_admin)):
    """
    Fetch employee IDs per tutti gli utenti (ADMIN only).
    Pattern: seguire settings.py:bulk_fetch_jira_accounts
    """
    storage = get_storage()

    config = await storage.get_factorial_config(current_user.company_id)
    if not config:
        raise HTTPException(status_code=400, detail="Factorial not configured")

    users = await storage.get_all_users(current_user.company_id)
    if not users:
        return BulkFetchFactorialResponse(
            results=[],
            summary={"total": 0, "success": 0, "failed": 0, "skipped": 0}
        )

    results = []
    success_count = 0
    failed_count = 0
    skipped_count = 0

    client = FactorialClient(config["api_key"])

    for user in users:
        # Skip se già mappato
        existing = await storage.get_user_factorial_account(user["id"], current_user.company_id)
        if existing:
            skipped_count += 1
            continue

        try:
            employee_id = await client.search_employee_by_email(user["email"])
            if employee_id:
                await storage.set_user_factorial_account(user["id"], employee_id, user["email"], current_user.company_id)
                results.append(BulkFetchFactorialResult(
                    user_email=user["email"],
                    user_name=f"{user['first_name']} {user['last_name']}",
                    success=True,
                    factorial_employee_id=employee_id
                ))
                success_count += 1
            else:
                results.append(BulkFetchFactorialResult(
                    user_email=user["email"],
                    user_name=f"{user['first_name']} {user['last_name']}",
                    success=False,
                    error="Employee not found"
                ))
                failed_count += 1
        except Exception as e:
            results.append(BulkFetchFactorialResult(
                user_email=user["email"],
                user_name=f"{user['first_name']} {user['last_name']}",
                success=False,
                error=str(e)
            ))
            failed_count += 1

    return BulkFetchFactorialResponse(
        results=results,
        summary={
            "total": success_count + failed_count + skipped_count,
            "success": success_count,
            "failed": failed_count,
            "skipped": skipped_count
        }
    )


# ========== Leaves Sync ==========

@router.post("/sync-leaves")
async def sync_factorial_leaves(
    start_date: date,
    end_date: date,
    current_user: CurrentUser = Depends(require_admin)
):
    """
    Sync leaves da Factorial per date range (ADMIN only).
    Pattern: seguire sync.py
    """
    storage = get_storage()

    config = await storage.get_factorial_config(current_user.company_id)
    if not config:
        raise HTTPException(status_code=400, detail="Factorial not configured")

    # Build user→employee mapping
    users = await storage.get_all_users(current_user.company_id)
    user_factorial_map = {}  # factorial_employee_id → user_id
    employee_ids = []

    for user in users:
        factorial_account = await storage.get_user_factorial_account(user["id"], current_user.company_id)
        if factorial_account:
            emp_id = factorial_account["factorial_employee_id"]
            user_factorial_map[emp_id] = user["id"]
            employee_ids.append(emp_id)

    if not employee_ids:
        return {"success": True, "message": "No users mapped", "synced": 0, "updated": 0}

    # Fetch leaves
    try:
        client = FactorialClient(config["api_key"])
        leaves = await client.get_leaves_in_range(start_date, end_date, employee_ids)

        # Upsert to DB
        inserted, updated = await storage.upsert_leaves(leaves, user_factorial_map, current_user.company_id)

        return {
            "success": True,
            "message": f"Synced {len(leaves)} leaves",
            "synced": inserted,
            "updated": updated,
            "total": len(leaves)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")


@router.get("/leaves", response_model=list[FactorialLeave])
async def get_factorial_leaves(
    start_date: date,
    end_date: date,
    user_id: Optional[int] = None,
    status: Optional[str] = None,
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get leaves da storage locale (scoped to company)."""
    storage = get_storage()
    leaves = await storage.get_leaves_in_range(current_user.company_id, start_date, end_date, user_id, status)

    return [
        FactorialLeave(
            id=l["id"],
            factorial_leave_id=l["factorial_leave_id"],
            user_id=l["user_id"],
            user_email=l["user_email"],
            user_full_name=l["user_full_name"],
            factorial_employee_id=l["factorial_employee_id"],
            leave_type_id=l["leave_type_id"],
            leave_type_name=l["leave_type_name"],
            start_date=date.fromisoformat(l["start_date"]),
            finish_date=date.fromisoformat(l["finish_date"]),
            half_day=l["half_day"],
            status=l["status"],
            description=l["description"],
            created_at=l["created_at"]
        )
        for l in leaves
    ]
