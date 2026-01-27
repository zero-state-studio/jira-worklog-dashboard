"""
Issues API router - issue detail view and per-issue sync.
"""
from datetime import date, timedelta
from collections import defaultdict
from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from typing import Optional

from ..models import AppConfig, Worklog, DailyHours
from ..config import get_config, get_users_from_db
from ..cache import get_storage

router = APIRouter(prefix="/api/issues", tags=["issues"])


class UserHours(BaseModel):
    """Hours worked by a user on this issue."""
    email: str
    display_name: str
    total_hours: float


class IssueDetailResponse(BaseModel):
    """Response for issue detail view."""
    issue_key: str
    issue_summary: str
    jira_instance: str
    parent_key: Optional[str] = None
    parent_name: Optional[str] = None
    parent_type: Optional[str] = None
    epic_key: Optional[str] = None
    epic_name: Optional[str] = None
    total_hours: float
    contributors: list[UserHours]
    daily_trend: list[DailyHours]
    worklogs: list[Worklog]


class IssueSyncResponse(BaseModel):
    """Response for issue sync operation."""
    success: bool
    issue_key: str
    worklogs_synced: int
    worklogs_updated: int
    message: str


@router.get("/{issue_key}", response_model=IssueDetailResponse)
async def get_issue_detail(
    issue_key: str,
    start_date: date = Query(None, description="Start date filter"),
    end_date: date = Query(None, description="End date filter"),
    config: AppConfig = Depends(get_config)
):
    """Get issue details with all worklogs."""
    storage = get_storage()

    # Default to last 90 days if no dates specified
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=90)

    # Get all worklogs for this issue
    all_worklogs = await storage.get_worklogs_in_range(start_date, end_date)
    issue_worklogs = [w for w in all_worklogs if w.issue_key == issue_key]

    if not issue_worklogs:
        raise HTTPException(status_code=404, detail=f"No worklogs found for issue {issue_key}")

    # Get issue metadata from first worklog
    first_wl = issue_worklogs[0]
    issue_summary = first_wl.issue_summary
    jira_instance = first_wl.jira_instance
    parent_key = first_wl.parent_key
    parent_name = first_wl.parent_name
    parent_type = first_wl.parent_type
    epic_key = first_wl.epic_key
    epic_name = first_wl.epic_name

    # Calculate total hours
    total_seconds = sum(w.time_spent_seconds for w in issue_worklogs)
    total_hours = total_seconds / 3600

    # Group by contributor
    contributor_hours = defaultdict(lambda: {"display_name": "", "seconds": 0})
    for wl in issue_worklogs:
        contributor_hours[wl.author_email]["display_name"] = wl.author_display_name
        contributor_hours[wl.author_email]["seconds"] += wl.time_spent_seconds

    contributors = [
        UserHours(
            email=email,
            display_name=data["display_name"],
            total_hours=data["seconds"] / 3600
        )
        for email, data in sorted(
            contributor_hours.items(),
            key=lambda x: x[1]["seconds"],
            reverse=True
        )
    ]

    # Calculate daily trend
    daily_seconds = defaultdict(int)
    for wl in issue_worklogs:
        day = wl.started.date().isoformat()
        daily_seconds[day] += wl.time_spent_seconds

    daily_trend = [
        DailyHours(date=d, hours=s / 3600)
        for d, s in sorted(daily_seconds.items())
    ]

    # Sort worklogs by date (most recent first)
    sorted_worklogs = sorted(issue_worklogs, key=lambda w: w.started, reverse=True)

    return IssueDetailResponse(
        issue_key=issue_key,
        issue_summary=issue_summary,
        jira_instance=jira_instance,
        parent_key=parent_key,
        parent_name=parent_name,
        parent_type=parent_type,
        epic_key=epic_key,
        epic_name=epic_name,
        total_hours=total_hours,
        contributors=contributors,
        daily_trend=daily_trend,
        worklogs=sorted_worklogs
    )


@router.post("/{issue_key}/sync", response_model=IssueSyncResponse)
async def sync_issue_worklogs(
    issue_key: str,
    config: AppConfig = Depends(get_config)
):
    """
    Fetch and sync worklogs for a specific issue from JIRA.
    Updates all related worklogs in the database.
    """
    storage = get_storage()

    # Find which JIRA instance this issue belongs to
    # First check existing worklogs
    all_worklogs = await storage.get_worklogs_in_range(
        date.today() - timedelta(days=365),
        date.today()
    )

    existing = [w for w in all_worklogs if w.issue_key == issue_key]

    if existing:
        jira_instance_name = existing[0].jira_instance
    else:
        # Try to determine from issue key prefix (e.g., SYSMMFG-123 -> SYSMMFG)
        # Use first configured instance as fallback
        jira_instance_name = config.jira_instances[0].name if config.jira_instances else None

    if not jira_instance_name:
        raise HTTPException(status_code=400, detail="Cannot determine JIRA instance for issue")

    # Get the instance config
    inst_config = None
    for inst in config.jira_instances:
        if inst.name == jira_instance_name:
            inst_config = inst
            break

    if not inst_config:
        raise HTTPException(status_code=400, detail=f"JIRA instance {jira_instance_name} not found in config")

    # Get users mapping for email resolution
    users = await get_users_from_db()
    account_id_to_email = {}
    for user in users:
        email = user["email"]
        for jira_account in user.get("jira_accounts", []):
            account_id = jira_account.get("account_id")
            instance = jira_account.get("jira_instance")
            if account_id and instance == jira_instance_name:
                account_id_to_email[account_id] = email

    # Fetch worklogs for this issue from JIRA
    from ..jira_client import JiraClient
    jira_client = JiraClient(inst_config)

    try:
        raw_worklogs = await jira_client.get_worklogs_for_issue(issue_key)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch worklogs from JIRA: {str(e)}")

    if not raw_worklogs:
        return IssueSyncResponse(
            success=True,
            issue_key=issue_key,
            worklogs_synced=0,
            worklogs_updated=0,
            message="No worklogs found for this issue in JIRA"
        )

    # Get issue details for parent/epic info
    issue_details = await jira_client.get_issues_by_ids([issue_key])
    details = issue_details.get(issue_key, {})

    # Convert to Worklog objects
    from datetime import datetime
    worklogs_to_save = []

    for wl in raw_worklogs:
        try:
            # Parse worklog data
            author = wl.get("author", {})
            author_account_id = author.get("accountId", "")
            author_email = account_id_to_email.get(author_account_id, author.get("emailAddress", ""))

            # Skip if we don't know this user
            if not author_email:
                continue

            # Parse started date
            started_str = wl.get("started", "")
            if started_str:
                started = datetime.fromisoformat(started_str.replace("Z", "+00:00"))
            else:
                continue

            worklog = Worklog(
                id=f"{jira_instance_name}_{wl.get('id', '')}",
                issue_key=issue_key,
                issue_summary=details.get("summary", ""),
                author_email=author_email,
                author_display_name=author.get("displayName", ""),
                time_spent_seconds=wl.get("timeSpentSeconds", 0),
                started=started,
                jira_instance=jira_instance_name,
                parent_key=details.get("parent_key"),
                parent_name=details.get("parent_name"),
                parent_type=details.get("parent_type"),
                epic_key=details.get("epic_key"),
                epic_name=details.get("epic_name")
            )
            worklogs_to_save.append(worklog)
        except Exception as e:
            print(f"Error processing worklog: {e}")
            continue

    # Save to database
    inserted, updated = await storage.upsert_worklogs(worklogs_to_save)

    return IssueSyncResponse(
        success=True,
        issue_key=issue_key,
        worklogs_synced=inserted,
        worklogs_updated=updated,
        message=f"Synced {inserted} new, {updated} updated worklogs for {issue_key}"
    )
