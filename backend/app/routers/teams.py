"""
Teams API router - team-level statistics and details.
"""
from datetime import date
from collections import defaultdict
from fastapi import APIRouter, Depends, Query, HTTPException

from ..models import (
    TeamDetailResponse, TeamHours, UserHours, EpicHours, DailyHours,
    AppConfig, Worklog,
    MultiJiraOverviewResponse, InstanceOverview,
    ComplementaryComparison, DiscrepancyItem
)
from ..config import (
    get_config, get_teams_from_db, get_team_emails_from_db, get_users_from_db,
    get_complementary_instances_from_db, get_jira_instances_from_db
)
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


@router.get("/{team_name}/multi-jira-overview", response_model=MultiJiraOverviewResponse)
async def get_team_multi_jira_overview(
    team_name: str,
    start_date: date = Query(..., description="Start date for the period"),
    end_date: date = Query(..., description="End date for the period"),
    config: AppConfig = Depends(get_config)
):
    """Get multi-JIRA overview data filtered by team members."""
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

    # Get team members
    team_members = [
        u for u in users
        if u.get("team_name", "").lower() == team_name.lower()
    ]
    team_emails = [m["email"] for m in team_members]

    jira_instances = await get_jira_instances_from_db()

    # Calculate expected hours for team members
    expected_hours = calculate_expected_hours(
        start_date, end_date, len(team_emails), config.settings.daily_working_hours
    )

    storage = get_storage()
    instances_overview = []
    instance_worklogs = {}

    for inst in jira_instances:
        worklogs = await storage.get_worklogs_in_range(
            start_date, end_date,
            user_emails=team_emails,
            jira_instance=inst.name
        )
        instance_worklogs[inst.name] = worklogs

        total_seconds = sum(w.time_spent_seconds for w in worklogs)
        total_hours = total_seconds / 3600
        completion = (total_hours / expected_hours * 100) if expected_hours > 0 else 0

        initiatives = set()
        contributors = set()
        for w in worklogs:
            if w.parent_key:
                initiatives.add(w.parent_key)
            contributors.add(w.author_email)

        daily_trend = calculate_daily_trend(worklogs, start_date, end_date)

        instances_overview.append(InstanceOverview(
            instance_name=inst.name,
            total_hours=round(total_hours, 2),
            expected_hours=round(expected_hours, 2),
            completion_percentage=round(completion, 1),
            initiative_count=len(initiatives),
            contributor_count=len(contributors),
            daily_trend=daily_trend
        ))

    # Build complementary comparisons
    complementary_comparisons = []
    complementary_groups = await get_complementary_instances_from_db()

    for group_name, group_instances in complementary_groups.items():
        if len(group_instances) < 2:
            continue

        primary_name = group_instances[0]
        for secondary_name in group_instances[1:]:
            primary_wls = instance_worklogs.get(primary_name, [])
            secondary_wls = instance_worklogs.get(secondary_name, [])

            primary_total = sum(w.time_spent_seconds for w in primary_wls) / 3600
            secondary_total = sum(w.time_spent_seconds for w in secondary_wls) / 3600

            primary_by_init = defaultdict(lambda: {"hours": 0, "name": ""})
            for w in primary_wls:
                if w.parent_key:
                    primary_by_init[w.parent_key]["hours"] += w.time_spent_seconds / 3600
                    primary_by_init[w.parent_key]["name"] = w.parent_name or w.parent_key

            secondary_by_init = defaultdict(lambda: {"hours": 0, "name": ""})
            for w in secondary_wls:
                if w.parent_key:
                    secondary_by_init[w.parent_key]["hours"] += w.time_spent_seconds / 3600
                    secondary_by_init[w.parent_key]["name"] = w.parent_name or w.parent_key

            all_keys = set(primary_by_init.keys()) | set(secondary_by_init.keys())
            discrepancies = []

            for key in all_keys:
                p_hours = primary_by_init[key]["hours"] if key in primary_by_init else 0
                s_hours = secondary_by_init[key]["hours"] if key in secondary_by_init else 0
                delta = abs(p_hours - s_hours)
                max_hours = max(p_hours, s_hours)
                delta_pct = (delta / max_hours * 100) if max_hours > 0 else 0

                if delta > 1 or delta_pct > 10:
                    name = (primary_by_init.get(key, {}).get("name") or
                            secondary_by_init.get(key, {}).get("name") or key)
                    discrepancies.append(DiscrepancyItem(
                        initiative_key=key,
                        initiative_name=name,
                        primary_hours=round(p_hours, 2),
                        secondary_hours=round(s_hours, 2),
                        delta_hours=round(delta, 2),
                        delta_percentage=round(delta_pct, 1)
                    ))

            discrepancies.sort(key=lambda d: d.delta_hours, reverse=True)

            complementary_comparisons.append(ComplementaryComparison(
                group_name=group_name,
                primary_instance=primary_name,
                secondary_instance=secondary_name,
                primary_total_hours=round(primary_total, 2),
                secondary_total_hours=round(secondary_total, 2),
                discrepancies=discrepancies
            ))

    return MultiJiraOverviewResponse(
        instances=instances_overview,
        complementary_comparisons=complementary_comparisons,
        period_start=start_date,
        period_end=end_date
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
