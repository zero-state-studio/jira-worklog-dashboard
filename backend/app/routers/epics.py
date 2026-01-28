"""
Epics API router - epic-level statistics and contributors.
"""
from datetime import date
from collections import defaultdict
from fastapi import APIRouter, Depends, Query, HTTPException

from ..models import (
    EpicListResponse, EpicDetailResponse, EpicHours, UserHours,
    DailyHours, Worklog, AppConfig
)
from ..config import get_config, get_users_from_db, get_complementary_instances_from_db
from ..cache import get_storage
from .dashboard import calculate_daily_trend, calculate_epic_hours

router = APIRouter(prefix="/api/epics", tags=["epics"])


@router.get("", response_model=EpicListResponse)
async def list_epics(
    start_date: date = Query(..., description="Start date for the period"),
    end_date: date = Query(..., description="End date for the period"),
    jira_instance: str = Query(None, description="Filter by JIRA instance name"),
    config: AppConfig = Depends(get_config)
):
    """List all epics with hours in the given period."""
    storage = get_storage()

    # Get all configured user emails from database
    users = await get_users_from_db()
    all_emails = [u["email"] for u in users]

    # Read worklogs from local storage
    worklogs = await storage.get_worklogs_in_range(
        start_date, end_date,
        user_emails=all_emails,
        jira_instance=jira_instance
    )

    # Handle complementary instances when no specific instance filter
    if not jira_instance:
        # Build set of secondary instances to exclude (from database)
        complementary_groups = await get_complementary_instances_from_db()
        secondary_instances = set()
        for group_name, instances in complementary_groups.items():
            if len(instances) >= 2:
                # First instance is primary, rest are secondary
                secondary_instances.update(instances[1:])

        # Filter out worklogs from secondary instances
        if secondary_instances:
            worklogs = [w for w in worklogs if w.jira_instance not in secondary_instances]

    # Calculate epic hours
    epic_hours = calculate_epic_hours(worklogs)

    # Total hours across all epics
    total_hours = sum(e.total_hours for e in epic_hours)

    return EpicListResponse(
        epics=epic_hours,
        total_hours=round(total_hours, 2)
    )


@router.get("/{epic_key}", response_model=EpicDetailResponse)
async def get_epic_detail(
    epic_key: str,
    start_date: date = Query(..., description="Start date for the period"),
    end_date: date = Query(..., description="End date for the period"),
    config: AppConfig = Depends(get_config)
):
    """Get detailed statistics for a specific epic."""
    storage = get_storage()

    # Get all configured user emails from database
    users = await get_users_from_db()
    all_emails = [u["email"] for u in users]

    # Read worklogs from local storage
    all_worklogs = await storage.get_worklogs_in_range(
        start_date, end_date,
        user_emails=all_emails
    )

    # Filter to this initiative (using parent_key, with fallback to epic_key for backwards compatibility)
    initiative_worklogs = [
        w for w in all_worklogs
        if w.parent_key == epic_key or w.epic_key == epic_key
    ]

    # Handle empty worklogs - return empty response instead of 404
    if not initiative_worklogs:
        return EpicDetailResponse(
            epic_key=epic_key,
            epic_name="Iniziativa sconosciuta",
            jira_instance="unknown",
            total_hours=0,
            contributors=[],
            daily_trend=calculate_daily_trend([], start_date, end_date),
            worklogs=[]
        )

    # Get initiative info from first worklog (prefer parent_key data)
    first_wl = initiative_worklogs[0]
    if first_wl.parent_key == epic_key:
        epic_name = first_wl.parent_name or "Unknown"
    else:
        epic_name = first_wl.epic_name or "Unknown"
    jira_instance = first_wl.jira_instance

    # Calculate total hours
    total_seconds = sum(w.time_spent_seconds for w in initiative_worklogs)
    total_hours = total_seconds / 3600

    # Hours per contributor
    contributors = await calculate_contributors_from_db(initiative_worklogs, users)

    # Daily trend
    daily_trend = calculate_daily_trend(initiative_worklogs, start_date, end_date)

    # Enrich worklogs with resolved author names from database
    enriched_worklogs = enrich_worklogs_with_names(initiative_worklogs, users)

    # Sort worklogs by date (newest first)
    sorted_worklogs = sorted(enriched_worklogs, key=lambda w: w.started, reverse=True)

    return EpicDetailResponse(
        epic_key=epic_key,
        epic_name=epic_name,
        jira_instance=jira_instance,
        total_hours=round(total_hours, 2),
        contributors=contributors,
        daily_trend=daily_trend,
        worklogs=sorted_worklogs
    )


def enrich_worklogs_with_names(worklogs: list[Worklog], users: list[dict]) -> list[Worklog]:
    """Enrich worklogs with resolved author names from database."""
    # Build email -> name lookup
    email_to_name = {}
    for u in users:
        email_lower = u["email"].lower()
        email_to_name[email_lower] = f"{u['first_name']} {u['last_name']}"

    enriched = []
    for wl in worklogs:
        # Create a new worklog with resolved name
        email_lower = wl.author_email.lower()
        resolved_name = email_to_name.get(email_lower, wl.author_display_name or wl.author_email)

        # Create enriched worklog with resolved name
        enriched.append(Worklog(
            id=wl.id,
            issue_key=wl.issue_key,
            issue_summary=wl.issue_summary,
            author_email=wl.author_email,
            author_display_name=resolved_name,  # Use resolved name
            time_spent_seconds=wl.time_spent_seconds,
            started=wl.started,
            jira_instance=wl.jira_instance,
            parent_key=wl.parent_key,
            parent_name=wl.parent_name,
            parent_type=wl.parent_type,
            epic_key=wl.epic_key,
            epic_name=wl.epic_name
        ))

    return enriched


async def calculate_contributors_from_db(worklogs: list[Worklog], users: list[dict]) -> list[UserHours]:
    """Calculate hours per contributor for an epic (using database data)."""
    # Build lookup maps from users
    email_to_name = {}
    email_to_team = {}
    for u in users:
        email_lower = u["email"].lower()
        email_to_name[email_lower] = f"{u['first_name']} {u['last_name']}"
        email_to_team[email_lower] = u.get("team_name")

    contributor_data = defaultdict(lambda: {"hours": 0, "name": "Unknown"})

    for wl in worklogs:
        email = wl.author_email.lower()
        contributor_data[email]["hours"] += wl.time_spent_seconds / 3600

        # Get display name from database or worklog
        if email in email_to_name:
            contributor_data[email]["name"] = email_to_name[email]
        else:
            contributor_data[email]["name"] = wl.author_display_name

    result = []
    for email, data in contributor_data.items():
        team_name = email_to_team.get(email, "External")
        result.append(UserHours(
            email=email,
            full_name=data["name"],
            total_hours=round(data["hours"], 2),
            team_name=team_name or "External"
        ))

    # Sort by hours descending
    result.sort(key=lambda x: x.total_hours, reverse=True)
    return result
