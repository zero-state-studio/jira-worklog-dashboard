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
from ..auth.dependencies import get_current_user, CurrentUser
from .dashboard import calculate_expected_hours, calculate_daily_trend, calculate_daily_trend_by_instance, calculate_epic_hours

router = APIRouter(prefix="/api/users", tags=["users"])


def enrich_worklogs_with_user_data(worklogs: list[Worklog], users: list[dict]) -> list[Worklog]:
    """Enrich worklogs with resolved author names and user IDs from database."""
    # Build email -> (name, user_id) lookup
    email_to_data = {}
    for u in users:
        email_lower = u["email"].lower()
        email_to_data[email_lower] = {
            "name": f"{u['first_name']} {u['last_name']}",
            "user_id": u["id"]
        }

    enriched = []
    for wl in worklogs:
        email_lower = wl.author_email.lower()
        user_data = email_to_data.get(email_lower)

        resolved_name = user_data["name"] if user_data else (wl.author_display_name or wl.author_email)
        user_id = user_data["user_id"] if user_data else None

        enriched.append(Worklog(
            id=wl.id,
            issue_key=wl.issue_key,
            issue_summary=wl.issue_summary,
            author_email=wl.author_email,
            author_user_id=user_id,
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
async def list_users(
    start_date: date = Query(None, description="Start date for the period"),
    end_date: date = Query(None, description="End date for the period"),
    jira_instance: str = Query(None, description="Filter by JIRA instance name"),
    current_user: CurrentUser = Depends(get_current_user),
    config: AppConfig = Depends(get_config)
):
    """List all configured users with optional worklog statistics for a period (scoped to company)."""
    users = await get_users_from_db(current_user.company_id)

    # If no date range, return basic user list
    if not start_date or not end_date:
        return [
            {
                "id": u["id"],
                "email": u["email"],
                "full_name": f"{u['first_name']} {u['last_name']}",
                "team_name": u.get("team_name")
            }
            for u in users
        ]

    storage = get_storage()
    all_emails = [u["email"] for u in users]

    # Fetch all worklogs for the period (scoped to company)
    worklogs = await storage.get_worklogs_in_range(
        start_date, end_date,
        user_emails=all_emails,
        jira_instance=jira_instance,
        company_id=current_user.company_id
    )

    # Preserve all worklogs for instance breakdown
    all_worklogs = worklogs

    # Filter out complementary (secondary) instances to avoid double-counting in Totals
    if not jira_instance:
        complementary_groups = await get_complementary_instances_from_db(current_user.company_id)
        secondary_instances = set()
        for group_name, instances in complementary_groups.items():
            if len(instances) >= 2:
                secondary_instances.update(instances[1:])
        if secondary_instances:
            worklogs = [w for w in worklogs if w.jira_instance not in secondary_instances]

    # Build per-user stats
    user_hours = defaultdict(float)
    user_instance_hours = defaultdict(lambda: defaultdict(float))
    user_worklog_count = defaultdict(int)
    user_initiatives = defaultdict(set)

    # Calculate Totals from FILTERED worklogs (deduplicated)
    for wl in worklogs:
        email_lower = wl.author_email.lower()
        hours = wl.time_spent_seconds / 3600
        user_hours[email_lower] += hours
        user_worklog_count[email_lower] += 1
        if wl.parent_key:
            user_initiatives[email_lower].add(wl.parent_key)

    # Calculate Instance Breakdown from ALL worklogs (complete view)
    for wl in all_worklogs:
        email_lower = wl.author_email.lower()
        hours = wl.time_spent_seconds / 3600
        user_instance_hours[email_lower][wl.jira_instance] += hours
        user_worklog_count[email_lower] += 1
        if wl.parent_key:
            user_initiatives[email_lower].add(wl.parent_key)

    # Expected hours per user (excluding holidays, scoped to company)
    holiday_dates = await storage.get_active_holiday_dates(
        start_date.isoformat(), end_date.isoformat(), current_user.company_id
    )
    expected_hours_per_user = calculate_expected_hours(
        start_date, end_date, 1, config.settings.daily_working_hours, holiday_dates
    )

    result = []
    for u in users:
        email_lower = u["email"].lower()
        total_hours = round(user_hours.get(email_lower, 0), 2)
        completion = round((total_hours / expected_hours_per_user * 100), 1) if expected_hours_per_user > 0 else 0
        
        # Round instance hours
        instance_hours = {k: round(v, 2) for k, v in user_instance_hours.get(email_lower, {}).items()}

        result.append({
            "id": u["id"],
            "email": u["email"],
            "full_name": f"{u['first_name']} {u['last_name']}",
            "team_name": u.get("team_name"),
            "total_hours": total_hours,
            "hours_by_instance": instance_hours,
            "expected_hours": round(expected_hours_per_user, 2),
            "completion_percentage": completion,
            "worklog_count": user_worklog_count.get(email_lower, 0),
            "initiative_count": len(user_initiatives.get(email_lower, set())),
        })

    # Sort by total_hours descending
    result.sort(key=lambda x: x["total_hours"], reverse=True)
    return result


@router.get("/{user_id}", response_model=UserDetailResponse)
async def get_user_detail(
    user_id: int,
    start_date: date = Query(..., description="Start date for the period"),
    end_date: date = Query(..., description="End date for the period"),
    jira_instance: str = Query(None, description="Filter by JIRA instance name"),
    current_user: CurrentUser = Depends(get_current_user),
    config: AppConfig = Depends(get_config)
):
    """Get detailed statistics for a specific user (scoped to company)."""
    # Get users from database (scoped to company)
    users = await get_users_from_db(current_user.company_id)

    # Find user by ID (ensures company isolation)
    user_data = None
    for u in users:
        if u["id"] == user_id:
            user_data = u
            break

    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")

    email = user_data["email"]
    full_name = f"{user_data['first_name']} {user_data['last_name']}"
    team_name = user_data.get("team_name")
    user_internal_id = user_id  # Use the parameter directly (database ID)

    storage = get_storage()

    # Read worklogs from local storage (scoped to company)
    worklogs = await storage.get_worklogs_in_range(
        start_date, end_date,
        user_emails=[email],
        jira_instance=jira_instance,
        company_id=current_user.company_id
    )

    # Separate all worklogs (for calendar/trend per instance) from filtered (for totals)
    all_worklogs = worklogs

    if not jira_instance:
        complementary_groups = await get_complementary_instances_from_db(current_user.company_id)
        secondary_instances = set()
        for group_name, instances in complementary_groups.items():
            if len(instances) >= 2:
                secondary_instances.update(instances[1:])
        if secondary_instances:
            filtered_worklogs = [w for w in all_worklogs if w.jira_instance not in secondary_instances]
        else:
            filtered_worklogs = all_worklogs
    else:
        filtered_worklogs = all_worklogs

    # Calculate total hours (filtered to avoid double-counting)
    total_seconds = sum(w.time_spent_seconds for w in filtered_worklogs)
    total_hours = total_seconds / 3600

    # Expected hours for single user (excluding holidays, scoped to company)
    holiday_dates = await storage.get_active_holiday_dates(
        start_date.isoformat(), end_date.isoformat(), current_user.company_id
    )
    expected_hours = calculate_expected_hours(
        start_date,
        end_date,
        1,
        config.settings.daily_working_hours,
        holiday_dates
    )

    # Hours per epic (filtered)
    epic_hours = calculate_epic_hours(filtered_worklogs)

    # Daily trend (filtered, for correct totals)
    daily_trend = calculate_daily_trend(filtered_worklogs, start_date, end_date)

    # Daily trend by instance (all worklogs, for multi-line chart)
    daily_trend_by_instance = calculate_daily_trend_by_instance(all_worklogs, start_date, end_date)

    # Enrich all worklogs with resolved author names and user IDs (for calendar)
    enriched_worklogs = enrich_worklogs_with_user_data(all_worklogs, users)

    # Sort worklogs by date (newest first)
    sorted_worklogs = sorted(enriched_worklogs, key=lambda w: w.started, reverse=True)

    return UserDetailResponse(
        email=email,
        user_id=user_internal_id,
        full_name=full_name,
        team_name=team_name or "Unknown",
        total_hours=round(total_hours, 2),
        expected_hours=round(expected_hours, 2),
        epics=epic_hours,
        daily_trend=daily_trend,
        daily_trend_by_instance=daily_trend_by_instance,
        worklogs=sorted_worklogs
    )
