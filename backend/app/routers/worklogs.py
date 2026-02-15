"""
Worklogs router - List and filter worklogs

Created to support the Worklogs page that was using mock data.
This endpoint provides access to all worklogs with filtering capabilities.
"""

from fastapi import APIRouter, Depends, Query
from typing import Optional
from datetime import date

from app.auth.dependencies import get_current_user, CurrentUser
from app.cache import get_storage

router = APIRouter(prefix="/api", tags=["worklogs"])


@router.get("/worklogs")
async def list_worklogs(
    start_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    author: Optional[str] = Query(None, description="Filter by author email"),
    jira_instance: Optional[str] = Query(None, description="Filter by JIRA instance"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=500, description="Page size (max 500)"),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    List all worklogs with filtering and pagination.

    **Security:** Filtered by company_id from JWT token.

    **Query Params:**
    - start_date (required): Start date filter (YYYY-MM-DD)
    - end_date (required): End date filter (YYYY-MM-DD)
    - author (optional): Filter by author email
    - jira_instance (optional): Filter by JIRA instance name
    - page (optional): Page number (default: 1)
    - page_size (optional): Results per page (default: 50, max: 500)

    **Returns:**
    ```json
    {
        "worklogs": [...],
        "total": 1234,
        "page": 1,
        "page_size": 50,
        "total_pages": 25
    }
    ```
    """
    storage = get_storage()

    # Fetch worklogs with filters
    user_emails = [author] if author else None

    all_worklogs = await storage.get_worklogs_in_range(
        start_date=start_date,
        end_date=end_date,
        user_emails=user_emails,
        jira_instance=jira_instance,
        company_id=current_user.company_id
    )

    # Pagination
    total = len(all_worklogs)
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    paginated_worklogs = all_worklogs[start_idx:end_idx]

    # Convert to dict format
    worklogs_data = [
        {
            "id": w.id,
            "issue_key": w.issue_key,
            "summary": w.issue_summary or "",
            "author": w.author_display_name or w.author_email,
            "author_email": w.author_email,
            "duration": w.time_spent_seconds,
            "date": w.started.split("T")[0] if isinstance(w.started, str) and "T" in w.started else (w.started.isoformat().split("T")[0] if hasattr(w.started, 'isoformat') else str(w.started)),
            "project": w.epic_key or w.issue_key.split("-")[0] if w.issue_key else "",
            "epic_key": w.epic_key,
            "epic_name": w.epic_name,
            "rate": None,  # Rate would need to come from billing system
            "jira_instance": w.jira_instance,
        }
        for w in paginated_worklogs
    ]

    return {
        "worklogs": worklogs_data,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size
    }
