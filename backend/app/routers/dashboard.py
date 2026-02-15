"""
Dashboard API router - global statistics and overview.
"""
from datetime import date, timedelta
from collections import defaultdict
from fastapi import APIRouter, Depends, Query

from ..models import (
    DashboardResponse, TeamHours, DailyHours, EpicHours,
    AppConfig, Worklog,
    MultiJiraOverviewResponse, InstanceOverview,
    ComplementaryComparison, DiscrepancyItem
)
from ..config import (
    get_config, get_users_from_db, get_complementary_instances_from_db,
    get_jira_instances_from_db
)
from ..cache import get_storage
from ..auth.dependencies import get_current_user, CurrentUser
from ..matching_algorithms import get_algorithm, apply_generic_issues

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardResponse)
async def get_dashboard(
    start_date: date = Query(..., description="Start date for the period"),
    end_date: date = Query(..., description="End date for the period"),
    jira_instance: str = Query(None, description="Filter by JIRA instance name"),
    current_user: CurrentUser = Depends(get_current_user),
    config: AppConfig = Depends(get_config)
):
    """Get global dashboard statistics from local storage (scoped to company)."""
    storage = get_storage()

    # Get all users from database (scoped to company)
    users = await get_users_from_db(current_user.company_id)
    all_emails = [u["email"] for u in users]

    # Build email -> team mapping for quick lookup
    email_to_team = {u["email"].lower(): u.get("team_name") for u in users}

    # Read worklogs from local storage (scoped to company)
    print(f"🔍 DASHBOARD QUERY: start={start_date}, end={end_date}, company_id={current_user.company_id}, instance={jira_instance}")
    print(f"🔍 Searching for emails: {all_emails}")
    worklogs = await storage.get_worklogs_in_range(
        start_date,
        end_date,
        user_emails=all_emails,
        jira_instance=jira_instance,
        company_id=current_user.company_id
    )
    print(f"🔍 WORKLOGS FOUND: {len(worklogs)} worklogs")

    # Preserve ALL worklogs for per-instance breakdown (before filtering)
    all_worklogs = worklogs

    # Handle complementary instances when no specific instance filter
    if not jira_instance:
        # Build set of secondary instances to exclude (from database, scoped to company)
        complementary_groups = await get_complementary_instances_from_db(current_user.company_id)
        secondary_instances = set()
        for group_name, instances in complementary_groups.items():
            if len(instances) >= 2:
                # First instance is primary, rest are secondary
                secondary_instances.update(instances[1:])

        # Filter out worklogs from secondary instances (for totals only)
        if secondary_instances:
            worklogs = [w for w in worklogs if w.jira_instance not in secondary_instances]

    # Calculate total hours
    total_seconds = sum(w.time_spent_seconds for w in worklogs)
    total_hours = total_seconds / 3600

    # Calculate expected hours (working days only, excluding holidays, scoped to company)
    holiday_dates = await storage.get_active_holiday_dates(
        start_date.isoformat(), end_date.isoformat(), current_user.company_id
    )
    expected_hours = calculate_expected_hours(
        start_date,
        end_date,
        len(all_emails),
        config.settings.daily_working_hours,
        holiday_dates
    )

    # Hours per team (with total member count from configuration)
    team_hours = calculate_team_hours(
        worklogs, email_to_team, users,
        start_date=start_date,
        end_date=end_date,
        daily_working_hours=config.settings.daily_working_hours,
        holiday_dates=holiday_dates,
        all_worklogs=all_worklogs  # Pass all worklogs for per-instance breakdown
    )

    # Top epics
    top_epics = calculate_epic_hours(worklogs)[:10]

    # Top projects (for "By Project" chart)
    top_projects = calculate_project_hours(worklogs)[:10]

    # Completion percentage
    completion = (total_hours / expected_hours * 100) if expected_hours > 0 else 0

    # Calculate active users (unique authors with worklogs in period)
    active_users = len(set(w.author_email.lower() for w in worklogs))

    return DashboardResponse(
        total_hours=round(total_hours, 2),
        expected_hours=round(expected_hours, 2),
        completion_percentage=round(completion, 1),
        daily_working_hours=config.settings.daily_working_hours,
        teams=team_hours,
        top_epics=top_epics,
        top_projects=top_projects,
        period_start=start_date,
        period_end=end_date,
        worklog_count=len(worklogs),
        active_users=active_users
    )



def calculate_expected_hours(
    start_date: date,
    end_date: date,
    num_users: int,
    daily_hours: int,
    holiday_dates: set[str] = None
) -> float:
    """Calculate expected working hours for the period, excluding holidays."""
    if holiday_dates is None:
        holiday_dates = set()

    working_days = 0
    current = start_date
    while current <= end_date:
        if current.weekday() < 5 and current.isoformat() not in holiday_dates:
            working_days += 1
        current += timedelta(days=1)

    return working_days * num_users * daily_hours


def calculate_team_hours(
    worklogs: list[Worklog],
    email_to_team: dict[str, str],
    users: list[dict],
    start_date: date = None,
    end_date: date = None,
    daily_working_hours: int = 8,
    holiday_dates: set[str] = None,
    all_worklogs: list[Worklog] = None
) -> list[TeamHours]:
    """Calculate hours per team. Member count shows ALL team members, not just those who logged hours."""
    # First, calculate total members per team from all users
    team_member_count = defaultdict(int)
    for user in users:
        team_name = user.get("team_name")
        if team_name:
            team_member_count[team_name] += 1

    # Then calculate hours from worklogs (filtered for totals)
    team_hours = defaultdict(float)
    teams_with_worklogs = set()

    for wl in worklogs:
        team_name = email_to_team.get(wl.author_email.lower())
        if team_name:
            team_hours[team_name] += wl.time_spent_seconds / 3600
            teams_with_worklogs.add(team_name)

    # Calculate hours per instance (from ALL worklogs, including secondary instances)
    team_instance_hours: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    source_worklogs = all_worklogs if all_worklogs else worklogs
    for wl in source_worklogs:
        team_name = email_to_team.get(wl.author_email.lower())
        if team_name and wl.jira_instance:
            team_instance_hours[team_name][wl.jira_instance] += wl.time_spent_seconds / 3600

    # Calculate expected hours per team (based on member count)
    working_days = 0
    if start_date and end_date:
        current = start_date
        while current <= end_date:
            if current.weekday() < 5 and (not holiday_dates or current.isoformat() not in holiday_dates):
                working_days += 1
            current += timedelta(days=1)

    # Build result: include all teams that have members or worklogs
    all_teams = set(team_member_count.keys()) | teams_with_worklogs

    result = []
    for team_name in sorted(all_teams):
        member_count = team_member_count.get(team_name, 0)
        expected = working_days * member_count * daily_working_hours
        instance_hours = {k: round(v, 2) for k, v in team_instance_hours.get(team_name, {}).items()}

        result.append(TeamHours(
            team_name=team_name,
            name=team_name,  # Alias for frontend compatibility
            total_hours=round(team_hours.get(team_name, 0), 2),
            expected_hours=round(expected, 2),
            member_count=member_count,
            hours_by_instance=instance_hours
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


def calculate_daily_trend_by_instance(
    worklogs: list[Worklog],
    start_date: date,
    end_date: date
) -> dict[str, list[DailyHours]]:
    """Calculate hours per day grouped by JIRA instance."""
    # Group by instance then by day
    instance_daily: dict[str, dict] = defaultdict(lambda: defaultdict(float))

    for wl in worklogs:
        instance = wl.jira_instance or "Unknown"
        day = wl.started.date()
        instance_daily[instance][day] += wl.time_spent_seconds / 3600

    # Build result with all days filled in
    result = {}
    for instance, daily in instance_daily.items():
        days = []
        current = start_date
        while current <= end_date:
            days.append(DailyHours(
                date=current,
                hours=round(daily.get(current, 0), 2)
            ))
            current += timedelta(days=1)
        result[instance] = days

    return result


def calculate_epic_hours(worklogs: list[Worklog]) -> list[EpicHours]:
    """Calculate hours per parent initiative (Epic, Project, etc.)."""
    initiative_data = defaultdict(lambda: {
        "name": "Unknown",
        "type": None,
        "hours": 0,
        "contributors": set(),
        "instance": ""
    })

    for wl in worklogs:
        # Use parent_key/parent_name/parent_type instead of epic_key/epic_name
        if wl.parent_key:
            initiative_data[wl.parent_key]["name"] = wl.parent_name or "Unknown"
            initiative_data[wl.parent_key]["type"] = wl.parent_type
            initiative_data[wl.parent_key]["hours"] += wl.time_spent_seconds / 3600
            initiative_data[wl.parent_key]["contributors"].add(wl.author_email)
            initiative_data[wl.parent_key]["instance"] = wl.jira_instance

    result = []
    for parent_key, data in initiative_data.items():
        result.append(EpicHours(
            epic_key=parent_key,  # Using epic_key field for backward compatibility
            epic_name=data["name"],  # Using epic_name field for backward compatibility
            total_hours=round(data["hours"], 2),
            contributor_count=len(data["contributors"]),
            jira_instance=data["instance"],
            parent_type=data["type"]
        ))

    # Sort by hours descending
    result.sort(key=lambda x: x.total_hours, reverse=True)
    return result


def calculate_project_hours(worklogs: list[Worklog]) -> list[EpicHours]:
    """Calculate hours per JIRA project (extracted from issue_key)."""
    project_data = defaultdict(lambda: {
        "hours": 0,
        "contributors": set(),
        "instance": ""
    })

    for wl in worklogs:
        # Extract project key from issue_key (e.g., "DLREQ-1464" -> "DLREQ")
        project_key = wl.issue_key.split('-')[0] if '-' in wl.issue_key else wl.issue_key
        project_data[project_key]["hours"] += wl.time_spent_seconds / 3600
        project_data[project_key]["contributors"].add(wl.author_email)
        project_data[project_key]["instance"] = wl.jira_instance

    result = []
    for project_key, data in project_data.items():
        result.append(EpicHours(
            epic_key=project_key,
            epic_name=project_key,  # Use project key as name (clean, readable)
            total_hours=round(data["hours"], 2),
            contributor_count=len(data["contributors"]),
            jira_instance=data["instance"],
            parent_type="Project"
        ))

    # Sort by hours descending
    result.sort(key=lambda x: x.total_hours, reverse=True)
    return result


def calculate_discrepancies_legacy(primary_wls: list[Worklog], secondary_wls: list[Worklog]) -> list[DiscrepancyItem]:
    """
    Legacy discrepancy calculation - direct parent_key comparison.
    Used when no matching algorithms are enabled.
    """
    # Build per-initiative hours for both
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

    # Find discrepancies
    all_keys = set(primary_by_init.keys()) | set(secondary_by_init.keys())
    discrepancies = []

    for key in all_keys:
        p_hours = primary_by_init[key]["hours"] if key in primary_by_init else 0
        s_hours = secondary_by_init[key]["hours"] if key in secondary_by_init else 0
        delta = abs(p_hours - s_hours)
        max_hours = max(p_hours, s_hours)
        delta_pct = (delta / max_hours * 100) if max_hours > 0 else 0

        # Only report significant discrepancies (>1h or >10%)
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

    return discrepancies


@router.get("/multi-jira-overview", response_model=MultiJiraOverviewResponse)
async def get_multi_jira_overview(
    start_date: date = Query(..., description="Start date for the period"),
    end_date: date = Query(..., description="End date for the period"),
    current_user: CurrentUser = Depends(get_current_user),
    config: AppConfig = Depends(get_config)
):
    """Get overview data for all JIRA instances with complementary comparisons (scoped to company)."""
    storage = get_storage()

    users = await get_users_from_db(current_user.company_id)
    all_emails = [u["email"] for u in users]
    jira_instances = await get_jira_instances_from_db(current_user.company_id)

    # Calculate expected hours (shared across all instances, excluding holidays, scoped to company)
    holiday_dates = await storage.get_active_holiday_dates(
        start_date.isoformat(), end_date.isoformat(), current_user.company_id
    )
    expected_hours = calculate_expected_hours(
        start_date, end_date, len(all_emails), config.settings.daily_working_hours,
        holiday_dates
    )

    # Gather per-instance data
    instances_overview = []
    instance_worklogs = {}  # Store worklogs per instance for complementary comparison

    for inst in jira_instances:
        worklogs = await storage.get_worklogs_in_range(
            start_date, end_date,
            user_emails=all_emails,
            jira_instance=inst.name,
            company_id=current_user.company_id
        )
        instance_worklogs[inst.name] = worklogs

        total_seconds = sum(w.time_spent_seconds for w in worklogs)
        total_hours = total_seconds / 3600
        completion = (total_hours / expected_hours * 100) if expected_hours > 0 else 0

        # Count unique initiatives and contributors
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
    complementary_groups = await get_complementary_instances_from_db(current_user.company_id)

    # Check if matching algorithms are enabled
    matching_algorithms = await storage.get_matching_algorithms(current_user.company_id)
    enabled_algorithms = [algo for algo in matching_algorithms if algo['enabled']]

    # Get JIRA exclusions (expected discrepancies like leaves, training)
    jira_exclusions = await storage.get_jira_exclusions(current_user.company_id)
    exclusion_keys = [exc['exclusion_key'] for exc in jira_exclusions if exc['exclusion_type'] == 'parent_key']

    for group_name, group_instances in complementary_groups.items():
        if len(group_instances) < 2:
            continue

        primary_name = group_instances[0]
        # Compare primary with each secondary
        for secondary_name in group_instances[1:]:
            primary_wls = instance_worklogs.get(primary_name, [])
            secondary_wls = instance_worklogs.get(secondary_name, [])

            primary_total = sum(w.time_spent_seconds for w in primary_wls) / 3600
            secondary_total = sum(w.time_spent_seconds for w in secondary_wls) / 3600

            discrepancies = []

            # Use matching algorithms if enabled
            if enabled_algorithms:
                # Sort by priority (lower = higher priority)
                enabled_algorithms.sort(key=lambda a: a['priority'])

                # Use the highest priority algorithm
                algo_config = enabled_algorithms[0]
                algorithm = get_algorithm(algo_config['algorithm_type'])

                if algorithm:
                    # Get generic issues BEFORE matching to exclude them from parent linking
                    generic_issues = await storage.get_generic_issues(current_user.company_id)
                    generic_issue_codes = [gi['issue_code'] for gi in generic_issues] if generic_issues else []

                    # Get matched groups from algorithm
                    import json
                    config = json.loads(algo_config['config']) if isinstance(algo_config['config'], str) else algo_config['config']
                    matched_groups = algorithm.find_groups(
                        primary_wls, secondary_wls, config, exclusion_keys, generic_issue_codes
                    )

                    # Apply generic issues matching (container issues by issue_type)
                    if generic_issues:
                        user_to_team = {u["email"].lower(): u.get("team_id") for u in users}
                        matched_groups = apply_generic_issues(
                            matched_groups, generic_issues, primary_wls, secondary_wls, user_to_team
                        )

                    # For each matched group, check if hours align
                    for linking_key, group in matched_groups.items():
                        delta = abs(group.delta)
                        max_hours = max(group.primary_hours, group.secondary_hours)
                        delta_pct = (delta / max_hours * 100) if max_hours > 0 else 0

                        # Report all discrepancies (>1h or >10%), including excluded ones
                        if delta > 1 or delta_pct > 10:
                            discrepancies.append(DiscrepancyItem(
                                initiative_key=linking_key,
                                initiative_name=linking_key,
                                primary_hours=round(group.primary_hours, 2),
                                secondary_hours=round(group.secondary_hours, 2),
                                delta_hours=round(delta, 2),
                                delta_percentage=round(delta_pct, 1),
                                is_excluded=group.is_excluded
                            ))
                else:
                    # Fallback to old logic if algorithm not found
                    discrepancies = calculate_discrepancies_legacy(primary_wls, secondary_wls)
            else:
                # No algorithms enabled - use legacy direct parent_key comparison
                discrepancies = calculate_discrepancies_legacy(primary_wls, secondary_wls)

            # Sort by delta descending
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
