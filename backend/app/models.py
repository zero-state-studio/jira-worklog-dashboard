"""
Pydantic models for the JIRA Worklog Dashboard.
"""
from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, Field


# ============ Configuration Models ============

class JiraInstanceConfig(BaseModel):
    """Configuration for a single JIRA instance."""
    name: str
    url: str
    email: str
    api_token: str
    tempo_api_token: Optional[str] = None  # Tempo Timesheets API token (if Tempo is used)


class TeamMemberConfig(BaseModel):
    """Configuration for a team member."""
    email: str
    first_name: str
    last_name: str
    
    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"


class TeamConfig(BaseModel):
    """Configuration for a team."""
    name: str
    members: list[TeamMemberConfig]


class SettingsConfig(BaseModel):
    """Application settings."""
    daily_working_hours: int = 8
    timezone: str = "Europe/Rome"
    cache_ttl_seconds: int = 900
    demo_mode: bool = False
    # List of JIRA instance names that log the same work (complementary)
    # When set, "Tutti" view uses only the first instance (to avoid double-counting)
    # Empty list (default) means all instances are distinct (different work)
    complementary_instances: list[str] = Field(default_factory=list)


class AppConfig(BaseModel):
    """Complete application configuration."""
    jira_instances: list[JiraInstanceConfig]
    teams: list[TeamConfig]
    settings: SettingsConfig


# ============ JIRA Data Models ============

class Worklog(BaseModel):
    """A single worklog entry from JIRA."""
    id: str
    issue_key: str
    issue_summary: str
    author_email: str
    author_display_name: str
    time_spent_seconds: int
    started: datetime
    jira_instance: str
    # Parent diretto dell'issue (Epic, Story, Task, o Project come fallback)
    parent_key: Optional[str] = None
    parent_name: Optional[str] = None
    parent_type: Optional[str] = None  # "Epic", "Story", "Task", "Sub-task", "Project"
    # Epic (se trovata nella gerarchia)
    epic_key: Optional[str] = None
    epic_name: Optional[str] = None
    
    @property
    def hours(self) -> float:
        return self.time_spent_seconds / 3600


class Epic(BaseModel):
    """An Epic from JIRA."""
    key: str
    name: str
    summary: str
    jira_instance: str
    total_time_seconds: int = 0
    contributors: list[str] = Field(default_factory=list)
    
    @property
    def hours(self) -> float:
        return self.total_time_seconds / 3600


class Issue(BaseModel):
    """A JIRA issue (simplified)."""
    key: str
    summary: str
    epic_key: Optional[str] = None
    jira_instance: str


# ============ Settings Models (Database) ============

class UserJiraAccount(BaseModel):
    """JIRA account mapping for a user."""
    jira_instance: str
    account_id: str


class TeamBase(BaseModel):
    """Base model for team data."""
    name: str


class TeamCreate(TeamBase):
    """Model for creating a new team."""
    pass


class TeamUpdate(BaseModel):
    """Model for updating a team."""
    name: Optional[str] = None


class TeamInDB(TeamBase):
    """Team model with database fields."""
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    member_count: int = 0


class UserBase(BaseModel):
    """Base model for user data."""
    email: str
    first_name: str
    last_name: str


class UserCreate(UserBase):
    """Model for creating a new user."""
    team_id: Optional[int] = None


class UserUpdate(BaseModel):
    """Model for updating a user."""
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    team_id: Optional[int] = None


class UserInDB(UserBase):
    """User model with database fields."""
    id: int
    team_id: Optional[int] = None
    team_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    jira_accounts: list[UserJiraAccount] = Field(default_factory=list)

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"


class TeamWithMembers(TeamInDB):
    """Team model with member list."""
    members: list[UserInDB] = Field(default_factory=list)


class FetchAccountIdRequest(BaseModel):
    """Request to fetch JIRA accountId."""
    jira_instance: str


class FetchAccountIdResponse(BaseModel):
    """Response from fetch JIRA accountId."""
    jira_instance: str
    account_id: str
    email: str


class ImportConfigResponse(BaseModel):
    """Response from import config operation."""
    teams_created: int
    users_created: int
    jira_instances_created: int = 0


class BulkUserCreateRequest(BaseModel):
    """Request for bulk user creation."""
    emails: list[str]
    team_id: Optional[int] = None


class BulkUserCreateResult(BaseModel):
    """Result for a single user in bulk creation."""
    email: str
    success: bool
    error: Optional[str] = None
    user_id: Optional[int] = None


class BulkUserCreateResponse(BaseModel):
    """Response from bulk user creation."""
    total: int
    created: int
    failed: int
    results: list[BulkUserCreateResult]


# ============ API Response Models ============

class DailyHours(BaseModel):
    """Hours logged on a specific day."""
    date: date
    hours: float


class TeamHours(BaseModel):
    """Hours logged by a team."""
    team_name: str
    total_hours: float
    member_count: int


class UserHours(BaseModel):
    """Hours logged by a user."""
    email: str
    full_name: str
    total_hours: float
    team_name: str


class EpicHours(BaseModel):
    """Hours logged on a parent initiative (Epic, Project, etc.)."""
    epic_key: str  # Actually parent_key (kept for backward compatibility)
    epic_name: str  # Actually parent_name (kept for backward compatibility)
    total_hours: float
    contributor_count: int
    jira_instance: str
    parent_type: Optional[str] = None  # "Epic", "Project", "Story", etc.


class DashboardResponse(BaseModel):
    """Response for the main dashboard."""
    total_hours: float
    expected_hours: float
    completion_percentage: float
    teams: list[TeamHours]
    daily_trend: list[DailyHours]
    top_epics: list[EpicHours]
    period_start: date
    period_end: date


class TeamDetailResponse(BaseModel):
    """Response for team detail view."""
    team_name: str
    total_hours: float
    expected_hours: float
    members: list[UserHours]
    epics: list[EpicHours]
    daily_trend: list[DailyHours]


class UserDetailResponse(BaseModel):
    """Response for user detail view."""
    email: str
    full_name: str
    team_name: str
    total_hours: float
    expected_hours: float
    epics: list[EpicHours]
    daily_trend: list[DailyHours]
    worklogs: list[Worklog]


class EpicListResponse(BaseModel):
    """Response for epic list view."""
    epics: list[EpicHours]
    total_hours: float


class EpicDetailResponse(BaseModel):
    """Response for epic detail view."""
    epic_key: str
    epic_name: str
    jira_instance: str
    total_hours: float
    contributors: list[UserHours]
    daily_trend: list[DailyHours]
    worklogs: list[Worklog]


# ============ Multi-JIRA Overview Models ============

class InstanceOverview(BaseModel):
    """Overview metrics for a single JIRA instance."""
    instance_name: str
    total_hours: float
    expected_hours: float
    completion_percentage: float
    initiative_count: int
    contributor_count: int
    daily_trend: list[DailyHours]


class DiscrepancyItem(BaseModel):
    """A discrepancy between complementary JIRA instances for an initiative."""
    initiative_key: str
    initiative_name: str
    primary_hours: float
    secondary_hours: float
    delta_hours: float
    delta_percentage: float


class ComplementaryComparison(BaseModel):
    """Comparison between complementary JIRA instances."""
    group_name: str
    primary_instance: str
    secondary_instance: str
    primary_total_hours: float
    secondary_total_hours: float
    discrepancies: list[DiscrepancyItem]


class MultiJiraOverviewResponse(BaseModel):
    """Response for the multi-JIRA overview page."""
    instances: list[InstanceOverview]
    complementary_comparisons: list[ComplementaryComparison]
    period_start: date
    period_end: date
