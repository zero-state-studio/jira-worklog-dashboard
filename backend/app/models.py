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


# ============ Holiday Models ============

class HolidayCreate(BaseModel):
    """Model for creating a custom holiday."""
    name: str
    holiday_date: date
    country: str = "IT"

class HolidayUpdate(BaseModel):
    """Model for updating a holiday."""
    name: Optional[str] = None
    is_active: Optional[bool] = None

class HolidayInDB(BaseModel):
    """Holiday model with database fields."""
    id: int
    name: str
    holiday_date: str
    holiday_type: str
    month: Optional[int] = None
    day: Optional[int] = None
    country: str = "IT"
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ============ API Response Models ============

class DailyHours(BaseModel):
    """Hours logged on a specific day."""
    date: date
    hours: float


class TeamHours(BaseModel):
    """Hours logged by a team."""
    team_name: str
    total_hours: float
    expected_hours: float
    member_count: int
    name: str = ""  # Alias for team_name, for frontend compatibility
    hours_by_instance: dict[str, float] = Field(default_factory=dict)  # Hours per JIRA instance


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
    daily_trend_by_instance: dict[str, list[DailyHours]] = Field(default_factory=dict)
    worklogs: list[Worklog]


class EpicListResponse(BaseModel):
    """Response for epic list view."""
    epics: list[EpicHours]
    total_hours: float


class IssueListItem(BaseModel):
    """An individual issue with aggregated worklog hours."""
    issue_key: str
    issue_summary: str
    jira_instance: str
    total_hours: float
    contributor_count: int
    parent_key: Optional[str] = None
    parent_name: Optional[str] = None
    parent_type: Optional[str] = None


class IssueListResponse(BaseModel):
    """Response for issue list view."""
    issues: list[IssueListItem]
    total_hours: float
    total_count: int


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
    members: list[UserHours] = Field(default_factory=list)


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


# ============ Package Templates ============

class PackageTemplateCreate(BaseModel):
    """Request to create a package template."""
    name: str
    description: Optional[str] = None
    elements: list[str]
    default_project_key: Optional[str] = None
    parent_issue_type: str = "Task"
    child_issue_type: str = "Sub-task"
    instance_ids: list[int] = Field(default_factory=list)


class PackageTemplateUpdate(BaseModel):
    """Request to update a package template."""
    name: Optional[str] = None
    description: Optional[str] = None
    elements: Optional[list[str]] = None
    default_project_key: Optional[str] = None
    parent_issue_type: Optional[str] = None
    child_issue_type: Optional[str] = None
    instance_ids: Optional[list[int]] = None


class PackageInstanceConfig(BaseModel):
    """Configuration for a single instance in package creation."""
    instance_name: str
    project_key: str


class PackageCreateRequest(BaseModel):
    """Request to create a package of issues on JIRA."""
    template_id: Optional[int] = None
    instance_configs: list[PackageInstanceConfig]
    parent_summary: str
    parent_description: Optional[str] = None
    parent_issue_type: str = "Task"
    child_issue_type: str = "Sub-task"
    selected_elements: list[str]


class PackageCreateResult(BaseModel):
    """Result of package creation on a single JIRA instance."""
    jira_instance: str
    parent_key: str
    children: list[dict]
    auto_created: bool = False


class PackageCreateResponse(BaseModel):
    """Response for package creation."""
    success: bool
    results: list[PackageCreateResult]
    errors: list[str] = []
    linked_issues: list[dict] = []


# ============ Billing Models ============

class BillingClientCreate(BaseModel):
    """Request to create a billing client."""
    name: str
    billing_currency: str = "EUR"
    default_hourly_rate: Optional[float] = None


class BillingClientUpdate(BaseModel):
    """Request to update a billing client."""
    name: Optional[str] = None
    billing_currency: Optional[str] = None
    default_hourly_rate: Optional[float] = None


class BillingClientInDB(BaseModel):
    """Billing client with database fields."""
    id: int
    name: str
    billing_currency: str = "EUR"
    default_hourly_rate: Optional[float] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class BillingProjectCreate(BaseModel):
    """Request to create a billing project."""
    client_id: int
    name: str
    default_hourly_rate: Optional[float] = None


class BillingProjectUpdate(BaseModel):
    """Request to update a billing project."""
    name: Optional[str] = None
    default_hourly_rate: Optional[float] = None


class BillingProjectInDB(BaseModel):
    """Billing project with database fields."""
    id: int
    client_id: int
    name: str
    default_hourly_rate: Optional[float] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    mappings: list[dict] = Field(default_factory=list)


class BillingProjectMappingCreate(BaseModel):
    """Request to map a JIRA project to a billing project."""
    jira_instance: str
    jira_project_key: str


class BillingProjectMappingInDB(BaseModel):
    """Billing project mapping with database fields."""
    id: int
    billing_project_id: int
    jira_instance: str
    jira_project_key: str
    created_at: Optional[str] = None


class BillingRateCreate(BaseModel):
    """Request to create a billing rate override."""
    billing_project_id: int
    user_email: Optional[str] = None
    issue_type: Optional[str] = None
    hourly_rate: float
    valid_from: Optional[date] = None
    valid_to: Optional[date] = None


class BillingRateInDB(BaseModel):
    """Billing rate with database fields."""
    id: int
    billing_project_id: int
    user_email: Optional[str] = None
    issue_type: Optional[str] = None
    hourly_rate: float
    valid_from: Optional[str] = None
    valid_to: Optional[str] = None
    created_at: Optional[str] = None


class BillingClassificationCreate(BaseModel):
    """Request to classify a worklog as billable/non-billable."""
    worklog_id: str
    is_billable: bool
    override_hourly_rate: Optional[float] = None
    note: Optional[str] = None


class BillingClassificationBulk(BaseModel):
    """Request to bulk classify worklogs."""
    worklog_ids: list[str]
    is_billable: bool
    note: Optional[str] = None


class BillingClassificationInDB(BaseModel):
    """Billing worklog classification with database fields."""
    id: int
    worklog_id: str
    is_billable: bool
    override_hourly_rate: Optional[float] = None
    note: Optional[str] = None
    classified_by: Optional[str] = None
    classified_at: Optional[str] = None


class BillingPreviewLineItem(BaseModel):
    """A line item in the billing preview."""
    description: str
    quantity_hours: float
    hourly_rate: float
    amount: float
    group_key: Optional[str] = None
    metadata: Optional[dict] = None


class BillingPreviewResponse(BaseModel):
    """Response for billing preview."""
    client_id: int
    client_name: str
    billing_project_id: Optional[int] = None
    billing_project_name: Optional[str] = None
    period_start: date
    period_end: date
    currency: str
    group_by: str
    line_items: list[BillingPreviewLineItem]
    subtotal_amount: float
    billable_hours: float
    non_billable_hours: float


class InvoiceCreate(BaseModel):
    """Request to create an invoice from preview."""
    client_id: int
    billing_project_id: Optional[int] = None
    period_start: date
    period_end: date
    group_by: str = "project"
    taxes_amount: float = 0
    notes: Optional[str] = None


class InvoiceLineItemInDB(BaseModel):
    """Invoice line item with database fields."""
    id: int
    invoice_id: int
    line_type: str
    description: str
    quantity_hours: float
    hourly_rate: float
    amount: float
    metadata_json: Optional[str] = None
    sort_order: int = 0


class InvoiceInDB(BaseModel):
    """Invoice with database fields."""
    id: int
    client_id: int
    client_name: Optional[str] = None
    billing_project_id: Optional[int] = None
    billing_project_name: Optional[str] = None
    period_start: str
    period_end: str
    status: str = "DRAFT"
    currency: str = "EUR"
    subtotal_amount: float = 0
    taxes_amount: float = 0
    total_amount: float = 0
    group_by: str = "project"
    notes: Optional[str] = None
    created_by: Optional[str] = None
    created_at: Optional[str] = None
    issued_at: Optional[str] = None
    line_items: list[InvoiceLineItemInDB] = Field(default_factory=list)


class InvoiceListResponse(BaseModel):
    """Response for invoice list."""
    invoices: list[InvoiceInDB]
    total_count: int
