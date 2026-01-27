"""
Configuration loader for the JIRA Worklog Dashboard.
Loads and validates the YAML configuration file.
"""
import os
from pathlib import Path
from functools import lru_cache
import yaml

from .models import AppConfig, JiraInstanceConfig, TeamConfig, TeamMemberConfig, SettingsConfig


def find_config_file() -> Path:
    """Find the configuration file in common locations."""
    # Check for environment variable first
    if env_path := os.getenv("JIRA_DASHBOARD_CONFIG"):
        return Path(env_path)
    
    # Check common locations
    locations = [
        Path("config.yaml"),
        Path("config.yml"),
        Path(__file__).parent.parent / "config.yaml",
        Path(__file__).parent.parent / "config.yml",
        Path.home() / ".jira-worklog-dashboard" / "config.yaml",
    ]
    
    for loc in locations:
        if loc.exists():
            return loc
    
    raise FileNotFoundError(
        "Configuration file not found. Please create config.yaml "
        "or set JIRA_DASHBOARD_CONFIG environment variable."
    )


def load_config_from_file(path: Path) -> AppConfig:
    """Load configuration from a YAML file."""
    with open(path, "r") as f:
        raw_config = yaml.safe_load(f)
    
    # Parse JIRA instances
    jira_instances = [
        JiraInstanceConfig(**inst) 
        for inst in raw_config.get("jira_instances", [])
    ]
    
    # Parse teams
    teams = []
    for team_data in raw_config.get("teams", []):
        members = [
            TeamMemberConfig(**member) 
            for member in team_data.get("members", [])
        ]
        teams.append(TeamConfig(name=team_data["name"], members=members))
    
    # Parse settings
    settings_data = raw_config.get("settings", {})
    settings = SettingsConfig(**settings_data)
    
    return AppConfig(
        jira_instances=jira_instances,
        teams=teams,
        settings=settings
    )


@lru_cache()
def get_config() -> AppConfig:
    """Get the application configuration (cached)."""
    config_path = find_config_file()
    return load_config_from_file(config_path)


def get_user_team(email: str, config: AppConfig) -> str | None:
    """Find which team a user belongs to."""
    for team in config.teams:
        for member in team.members:
            if member.email.lower() == email.lower():
                return team.name
    return None


def get_user_by_email(email: str, config: AppConfig) -> TeamMemberConfig | None:
    """Get user configuration by email."""
    for team in config.teams:
        for member in team.members:
            if member.email.lower() == email.lower():
                return member
    return None


def get_all_team_emails(team_name: str, config: AppConfig) -> list[str]:
    """Get all email addresses for a team."""
    for team in config.teams:
        if team.name.lower() == team_name.lower():
            return [member.email.lower() for member in team.members]
    return []


def get_all_configured_emails(config: AppConfig) -> set[str]:
    """Get all configured user emails."""
    emails = set()
    for team in config.teams:
        for member in team.members:
            emails.add(member.email.lower())
    return emails


# ============ Database-based configuration functions ============
# These functions read from SQLite database with fallback to config.yaml

async def get_teams_from_db():
    """
    Get teams from database. Falls back to config.yaml if DB is empty.
    Returns list of dicts with: id, name, member_count, members (list of user dicts)
    """
    from .cache import get_storage
    storage = get_storage()
    await storage.initialize()

    teams = await storage.get_all_teams()

    # If database has teams, use them
    if teams:
        result = []
        for team in teams:
            members = await storage.get_users_by_team(team["id"])
            result.append({
                "id": team["id"],
                "name": team["name"],
                "member_count": len(members),
                "members": members
            })
        return result

    # Fallback to config.yaml
    try:
        config = get_config()
        return [
            {
                "id": idx,
                "name": team.name,
                "member_count": len(team.members),
                "members": [
                    {
                        "id": midx,
                        "email": m.email,
                        "first_name": m.first_name,
                        "last_name": m.last_name,
                        "team_id": idx,
                        "team_name": team.name,
                        "jira_accounts": []
                    }
                    for midx, m in enumerate(team.members, 1)
                ]
            }
            for idx, team in enumerate(config.teams, 1)
        ]
    except FileNotFoundError:
        return []


async def get_users_from_db():
    """
    Get all users from database. Falls back to config.yaml if DB is empty.
    Returns list of user dicts with: id, email, first_name, last_name, team_id, team_name, jira_accounts
    """
    from .cache import get_storage
    storage = get_storage()
    await storage.initialize()

    users = await storage.get_all_users()

    # If database has users, use them
    if users:
        return users

    # Fallback to config.yaml
    try:
        config = get_config()
        result = []
        user_id = 1
        for team_idx, team in enumerate(config.teams, 1):
            for member in team.members:
                result.append({
                    "id": user_id,
                    "email": member.email,
                    "first_name": member.first_name,
                    "last_name": member.last_name,
                    "team_id": team_idx,
                    "team_name": team.name,
                    "jira_accounts": []
                })
                user_id += 1
        return result
    except FileNotFoundError:
        return []


async def get_all_emails_from_db() -> list[str]:
    """
    Get all user emails from database. Falls back to config.yaml if DB is empty.
    """
    users = await get_users_from_db()
    return [u["email"].lower() for u in users]


async def get_team_emails_from_db(team_name: str) -> list[str]:
    """
    Get all emails for a specific team from database.
    """
    teams = await get_teams_from_db()
    for team in teams:
        if team["name"].lower() == team_name.lower():
            return [m["email"].lower() for m in team["members"]]
    return []


async def get_user_team_from_db(email: str) -> str | None:
    """
    Find which team a user belongs to (from database).
    """
    users = await get_users_from_db()
    for user in users:
        if user["email"].lower() == email.lower():
            return user.get("team_name")
    return None


async def get_user_by_email_from_db(email: str) -> dict | None:
    """
    Get user by email from database.
    """
    users = await get_users_from_db()
    for user in users:
        if user["email"].lower() == email.lower():
            return user
    return None


# Demo mode configuration - used when demo_mode is True
DEMO_CONFIG = AppConfig(
    jira_instances=[
        JiraInstanceConfig(
            name="Demo Company",
            url="https://demo.atlassian.net",
            email="demo@example.com",
            api_token="demo-token"
        ),
        JiraInstanceConfig(
            name="Demo Partner",
            url="https://demo-partner.atlassian.net",
            email="demo@example.com",
            api_token="demo-token"
        )
    ],
    teams=[
        TeamConfig(
            name="Frontend Team",
            members=[
                TeamMemberConfig(email="mario.rossi@demo.com", first_name="Mario", last_name="Rossi"),
                TeamMemberConfig(email="giulia.bianchi@demo.com", first_name="Giulia", last_name="Bianchi"),
            ]
        ),
        TeamConfig(
            name="Backend Team",
            members=[
                TeamMemberConfig(email="luca.verdi@demo.com", first_name="Luca", last_name="Verdi"),
                TeamMemberConfig(email="anna.neri@demo.com", first_name="Anna", last_name="Neri"),
            ]
        ),
        TeamConfig(
            name="DevOps Team",
            members=[
                TeamMemberConfig(email="paolo.gialli@demo.com", first_name="Paolo", last_name="Gialli"),
            ]
        )
    ],
    settings=SettingsConfig(
        daily_working_hours=8,
        timezone="Europe/Rome",
        cache_ttl_seconds=900,
        demo_mode=True
    )
)
