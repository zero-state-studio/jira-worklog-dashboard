"""
Users API router - individual user statistics and worklogs.
"""
from datetime import date
from collections import defaultdict
from fastapi import APIRouter, Depends, Query, HTTPException

from ..models import (
    UserDetailResponse, UserHours, EpicHours, DailyHours, Worklog,
    AppConfig
)
from ..config import get_config, get_users_from_db, get_complementary_instances_from_db
from ..cache import get_storage
from .dashboard import calculate_expected_hours, calculate_daily_trend, calculate_epic_hours

router = APIRouter(prefix="/api/users", tags=["users"])


def enrich_worklogs_with_names(worklogs: list[Worklog], users: list[dict]) -> list[Worklog]:
    """Enrich worklogs with resolved author names from database."""
    # Build email -> name lookup
    email_to_name = {}
    for u in users:
        email_lower = u["email"].lower()
        email_to_name[email_lower] = f"{u['first_name']} {u['last_name']}"

    enriched = []
    for wl in worklogs:
        email_lower = wl.author_email.lower()
        resolved_name = email_to_name.get(email_lower, wl.author_display_name or wl.author_email)

        enriched.append(Worklog(
            id=wl.id,
            issue_key=wl.issue_key,
            issue_summary=wl.issue_summary,
            author_email=wl.author_email,
            author_display_name=resolved_name,
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


@router.get("")
async def list_users(config: AppConfig = Depends(get_config)):
    """List all configured users."""
    users = await get_users_from_db()
    return [
        {
            "email": u["email"],
            "full_name": f"{u['first_name']} {u['last_name']}",
            "team_name": u.get("team_name")
        }
        for u in users
    ]


@router.get("/{email}", response_model=UserDetailResponse)
async def get_user_detail(
    email: str,
    start_date: date = Query(..., description="Start date for the period"),
    end_date: date = Query(..., description="End date for the period"),
    jira_instance: str = Query(None, description="Filter by JIRA instance name"),
    config: AppConfig = Depends(get_config)
):
    """Get detailed statistics for a specific user."""
    # Get users from database
    users = await get_users_from_db()

    # Find user by email
    user_data = None
    for u in users:
        if u["email"].lower() == email.lower():
            user_data = u
            break

    if not user_data:
        raise HTTPException(status_code=404, detail=f"User '{email}' not found")

    full_name = f"{user_data['first_name']} {user_data['last_name']}"
    team_name = user_data.get("team_name")

    storage = get_storage()

    # Read worklogs from local storage
    worklogs = await storage.get_worklogs_in_range(
        start_date, end_date,
        user_emails=[email],
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

    # Calculate total hours
    total_seconds = sum(w.time_spent_seconds for w in worklogs)
    total_hours = total_seconds / 3600

    # Expected hours for single user
    expected_hours = calculate_expected_hours(
        start_date,
        end_date,
        1,
        config.settings.daily_working_hours
    )

    # Hours per epic
    epic_hours = calculate_epic_hours(worklogs)

    # Daily trend
    daily_trend = calculate_daily_trend(worklogs, start_date, end_date)

    # Enrich worklogs with resolved author names
    enriched_worklogs = enrich_worklogs_with_names(worklogs, users)

    # Sort worklogs by date (newest first)
    sorted_worklogs = sorted(enriched_worklogs, key=lambda w: w.started, reverse=True)

    return UserDetailResponse(
        email=email,
        full_name=full_name,
        team_name=team_name or "Unknown",
        total_hours=round(total_hours, 2),
        expected_hours=round(expected_hours, 2),
        epics=epic_hours,
        daily_trend=daily_trend,
        worklogs=sorted_worklogs
    )
