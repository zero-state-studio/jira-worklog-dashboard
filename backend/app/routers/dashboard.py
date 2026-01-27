"""
Dashboard API router - global statistics and overview.
"""
from datetime import date, timedelta
from collections import defaultdict
from fastapi import APIRouter, Depends, Query

from ..models import (
    DashboardResponse, TeamHours, DailyHours, EpicHours,
    AppConfig, Worklog
)
from ..config import get_config, get_users_from_db
from ..cache import get_storage

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardResponse)
async def get_dashboard(
    start_date: date = Query(..., description="Start date for the period"),
    end_date: date = Query(..., description="End date for the period"),
    jira_instance: str = Query(None, description="Filter by JIRA instance name"),
    config: AppConfig = Depends(get_config)
):
    """Get global dashboard statistics from local storage."""
    storage = get_storage()

    # Get all users from database (with fallback to config.yaml)
    users = await get_users_from_db()
    all_emails = [u["email"] for u in users]

    # Build email -> team mapping for quick lookup
    email_to_team = {u["email"].lower(): u.get("team_name") for u in users}

    # Read worklogs from local storage
    worklogs = await storage.get_worklogs_in_range(
        start_date,
        end_date,
        user_emails=all_emails,
        jira_instance=jira_instance
    )

    # Handle complementary instances when no specific instance filter
    if not jira_instance:
        complementary = config.settings.complementary_instances
        if complementary and len(complementary) >= 2:
            primary_instance = complementary[0]
            worklogs = [w for w in worklogs if w.jira_instance == primary_instance]

    # Calculate total hours
    total_seconds = sum(w.time_spent_seconds for w in worklogs)
    total_hours = total_seconds / 3600

    # Calculate expected hours (working days only)
    expected_hours = calculate_expected_hours(
        start_date,
        end_date,
        len(all_emails),
        config.settings.daily_working_hours
    )

    # Hours per team
    team_hours = calculate_team_hours(worklogs, email_to_team)

    # Daily trend
    daily_trend = calculate_daily_trend(worklogs, start_date, end_date)

    # Top epics
    top_epics = calculate_epic_hours(worklogs)[:10]

    # Completion percentage
    completion = (total_hours / expected_hours * 100) if expected_hours > 0 else 0

    return DashboardResponse(
        total_hours=round(total_hours, 2),
        expected_hours=round(expected_hours, 2),
        completion_percentage=round(completion, 1),
        teams=team_hours,
        daily_trend=daily_trend,
        top_epics=top_epics,
        period_start=start_date,
        period_end=end_date
    )



def calculate_expected_hours(
    start_date: date, 
    end_date: date, 
    num_users: int,
    daily_hours: int
) -> float:
    """Calculate expected working hours for the period."""
    working_days = 0
    current = start_date
    while current <= end_date:
        if current.weekday() < 5:  # Monday-Friday
            working_days += 1
        current += timedelta(days=1)
    
    return working_days * num_users * daily_hours


def calculate_team_hours(worklogs: list[Worklog], email_to_team: dict[str, str]) -> list[TeamHours]:
    """Calculate hours per team."""
    team_data = defaultdict(lambda: {"hours": 0, "members": set()})

    for wl in worklogs:
        team_name = email_to_team.get(wl.author_email.lower())
        if team_name:
            team_data[team_name]["hours"] += wl.time_spent_seconds / 3600
            team_data[team_name]["members"].add(wl.author_email)

    result = []
    for team_name, data in sorted(team_data.items()):
        result.append(TeamHours(
            team_name=team_name,
            total_hours=round(data["hours"], 2),
            member_count=len(data["members"])
        ))

    return result


def calculate_daily_trend(
    worklogs: list[Worklog], 
    start_date: date, 
    end_date: date
) -> list[DailyHours]:
    """Calculate hours per day."""
    daily = defaultdict(float)
    
    for wl in worklogs:
        day = wl.started.date()
        daily[day] += wl.time_spent_seconds / 3600
    
    # Fill in missing days with 0
    result = []
    current = start_date
    while current <= end_date:
        result.append(DailyHours(
            date=current,
            hours=round(daily.get(current, 0), 2)
        ))
        current += timedelta(days=1)
    
    return result


def calculate_epic_hours(worklogs: list[Worklog]) -> list[EpicHours]:
    """Calculate hours per epic."""
    epic_data = defaultdict(lambda: {
        "name": "Unknown", 
        "hours": 0, 
        "contributors": set(),
        "instance": ""
    })
    
    for wl in worklogs:
        if wl.epic_key:
            epic_data[wl.epic_key]["name"] = wl.epic_name or "Unknown"
            epic_data[wl.epic_key]["hours"] += wl.time_spent_seconds / 3600
            epic_data[wl.epic_key]["contributors"].add(wl.author_email)
            epic_data[wl.epic_key]["instance"] = wl.jira_instance
    
    result = []
    for epic_key, data in epic_data.items():
        result.append(EpicHours(
            epic_key=epic_key,
            epic_name=data["name"],
            total_hours=round(data["hours"], 2),
            contributor_count=len(data["contributors"]),
            jira_instance=data["instance"]
        ))
    
    # Sort by hours descending
    result.sort(key=lambda x: x.total_hours, reverse=True)
    return result
