"""
Teams API router - team-level statistics and details.
"""
from datetime import date
from collections import defaultdict
from fastapi import APIRouter, Depends, Query, HTTPException

from ..models import (
    TeamDetailResponse, TeamHours, UserHours, EpicHours, DailyHours,
    AppConfig, Worklog
)
from ..config import get_config, get_teams_from_db, get_team_emails_from_db, get_users_from_db, get_complementary_instances_from_db
from ..cache import get_storage
from .dashboard import calculate_expected_hours, calculate_daily_trend, calculate_epic_hours

router = APIRouter(prefix="/api/teams", tags=["teams"])


@router.get("")
async def list_teams(config: AppConfig = Depends(get_config)):
    """List all configured teams."""
    # Get teams and users from database
    teams = await get_teams_from_db()
    users = await get_users_from_db()

    # Group users by team
    team_members = {}
    for user in users:
        team_name = user.get("team_name")
        if team_name:
            if team_name not in team_members:
                team_members[team_name] = []
            team_members[team_name].append({
                "email": user["email"],
                "full_name": f"{user['first_name']} {user['last_name']}"
            })

    return [
        {
            "name": team["name"],
            "member_count": len(team_members.get(team["name"], [])),
            "members": team_members.get(team["name"], [])
        }
        for team in teams
    ]


@router.get("/{team_name}", response_model=TeamDetailResponse)
async def get_team_detail(
    team_name: str,
    start_date: date = Query(..., description="Start date for the period"),
    end_date: date = Query(..., description="End date for the period"),
    jira_instance: str = Query(None, description="Filter by JIRA instance name"),
    config: AppConfig = Depends(get_config)
):
    """Get detailed statistics for a specific team."""
    # Get teams and users from database
    teams = await get_teams_from_db()
    users = await get_users_from_db()

    # Validate team exists
    team_data = None
    for t in teams:
        if t["name"].lower() == team_name.lower():
            team_data = t
            break

    if not team_data:
        raise HTTPException(status_code=404, detail=f"Team '{team_name}' not found")

    # Get team members from users
    team_members = [
        u for u in users
        if u.get("team_name", "").lower() == team_name.lower()
    ]
    team_emails = [m["email"] for m in team_members]

    storage = get_storage()

    # Read worklogs from local storage
    worklogs = await storage.get_worklogs_in_range(
        start_date, end_date,
        user_emails=team_emails,
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

    # Expected hours
    expected_hours = calculate_expected_hours(
        start_date,
        end_date,
        len(team_emails),
        config.settings.daily_working_hours
    )

    # Hours per member
    member_hours = calculate_member_hours_from_db(worklogs, team_members, team_data["name"])

    # Hours per epic
    epic_hours = calculate_epic_hours(worklogs)

    # Daily trend
    daily_trend = calculate_daily_trend(worklogs, start_date, end_date)

    return TeamDetailResponse(
        team_name=team_data["name"],
        total_hours=round(total_hours, 2),
        expected_hours=round(expected_hours, 2),
        members=member_hours,
        epics=epic_hours,
        daily_trend=daily_trend
    )


def calculate_member_hours_from_db(worklogs: list[Worklog], team_members: list[dict], team_name: str) -> list[UserHours]:
    """Calculate hours per team member (using database data)."""
    member_data = defaultdict(float)

    for wl in worklogs:
        member_data[wl.author_email.lower()] += wl.time_spent_seconds / 3600

    result = []
    for member in team_members:
        email = member["email"]
        full_name = f"{member['first_name']} {member['last_name']}"
        hours = member_data.get(email.lower(), 0)
        result.append(UserHours(
            email=email,
            full_name=full_name,
            total_hours=round(hours, 2),
            team_name=team_name
        ))

    # Sort by hours descending
    result.sort(key=lambda x: x.total_hours, reverse=True)
    return result
