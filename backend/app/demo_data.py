"""
Demo data generator for testing the dashboard without real JIRA credentials.
"""
import random
from datetime import datetime, date, timedelta
from typing import Optional

from .models import Worklog, Epic, AppConfig
from .config import DEMO_CONFIG


# Demo Epics
DEMO_EPICS = [
    Epic(key="PROJ-100", name="User Authentication", summary="Implement user authentication system", jira_instance="Demo Company"),
    Epic(key="PROJ-101", name="Dashboard Redesign", summary="Redesign the main dashboard", jira_instance="Demo Company"),
    Epic(key="PROJ-102", name="API v2", summary="Develop API version 2", jira_instance="Demo Company"),
    Epic(key="PROJ-103", name="Mobile App", summary="Build mobile application", jira_instance="Demo Company"),
    Epic(key="PROJ-104", name="Performance Optimization", summary="Optimize system performance", jira_instance="Demo Company"),
    Epic(key="PART-50", name="Integration Project", summary="Third party integration", jira_instance="Demo Partner"),
    Epic(key="PART-51", name="Data Migration", summary="Migrate legacy data", jira_instance="Demo Partner"),
]

# Issue templates for each epic
DEMO_ISSUES = {
    "PROJ-100": [("PROJ-110", "Login page"), ("PROJ-111", "Password reset"), ("PROJ-112", "OAuth integration")],
    "PROJ-101": [("PROJ-120", "New sidebar"), ("PROJ-121", "Widget system"), ("PROJ-122", "Theme support")],
    "PROJ-102": [("PROJ-130", "REST endpoints"), ("PROJ-131", "GraphQL support"), ("PROJ-132", "Documentation")],
    "PROJ-103": [("PROJ-140", "iOS app"), ("PROJ-141", "Android app"), ("PROJ-142", "Push notifications")],
    "PROJ-104": [("PROJ-150", "Database optimization"), ("PROJ-151", "Caching layer"), ("PROJ-152", "CDN setup")],
    "PART-50": [("PART-60", "API connector"), ("PART-61", "Webhook handler"), ("PART-62", "Error handling")],
    "PART-51": [("PART-70", "Data extraction"), ("PART-71", "Transform scripts"), ("PART-72", "Validation")],
}


def generate_demo_worklogs(
    start_date: date,
    end_date: date,
    user_emails: Optional[list[str]] = None,
    config: AppConfig = DEMO_CONFIG
) -> list[Worklog]:
    """Generate realistic demo worklog data."""
    random.seed(42)  # For reproducibility
    
    # Get instance names from config
    instance_names = [inst.name for inst in config.jira_instances]
    primary_instance = instance_names[0] if instance_names else "Demo Company"
    secondary_instance = instance_names[1] if len(instance_names) > 1 else "Demo Partner"
    
    # Build dynamic epics using config instance names
    demo_epics = [
        Epic(key="PROJ-100", name="User Authentication", summary="Implement user authentication system", jira_instance=primary_instance),
        Epic(key="PROJ-101", name="Dashboard Redesign", summary="Redesign the main dashboard", jira_instance=primary_instance),
        Epic(key="PROJ-102", name="API v2", summary="Develop API version 2", jira_instance=primary_instance),
        Epic(key="PROJ-103", name="Mobile App", summary="Build mobile application", jira_instance=primary_instance),
        Epic(key="PROJ-104", name="Performance Optimization", summary="Optimize system performance", jira_instance=primary_instance),
        Epic(key="PART-50", name="Integration Project", summary="Third party integration", jira_instance=secondary_instance),
        Epic(key="PART-51", name="Data Migration", summary="Migrate legacy data", jira_instance=secondary_instance),
    ]
    
    # Get all configured users if no filter specified
    if user_emails is None:
        user_emails = []
        for team in config.teams:
            for member in team.members:
                user_emails.append(member.email)
    
    # Build user name map
    user_names = {}
    for team in config.teams:
        for member in team.members:
            user_names[member.email] = member.full_name
    
    worklogs = []
    worklog_id = 1
    
    current_date = start_date
    while current_date <= end_date:
        # Skip weekends
        if current_date.weekday() < 5:  # Monday = 0, Friday = 4
            for email in user_emails:
                if email not in user_names:
                    continue
                    
                # Each user logs 2-5 worklogs per day
                num_entries = random.randint(2, 5)
                total_hours = 0
                
                for _ in range(num_entries):
                    # Random hours between 0.5 and 4
                    hours = random.choice([0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4])
                    
                    # Don't exceed 8 hours per day
                    if total_hours + hours > 8:
                        hours = 8 - total_hours
                        if hours <= 0:
                            continue
                    total_hours += hours
                    
                    # Pick a random epic and issue
                    epic = random.choice(demo_epics)
                    issues = DEMO_ISSUES.get(epic.key, [])
                    if issues:
                        issue_key, issue_summary = random.choice(issues)
                    else:
                        issue_key = f"{epic.key}-SUB1"
                        issue_summary = "General task"
                    
                    # Create worklog with random time during work hours
                    hour = random.randint(9, 17)
                    minute = random.choice([0, 15, 30, 45])
                    
                    worklog = Worklog(
                        id=f"demo_{worklog_id}",
                        issue_key=issue_key,
                        issue_summary=issue_summary,
                        author_email=email,
                        author_display_name=user_names[email],
                        time_spent_seconds=int(hours * 3600),
                        started=datetime(
                            current_date.year,
                            current_date.month,
                            current_date.day,
                            hour,
                            minute
                        ),
                        jira_instance=epic.jira_instance,
                        epic_key=epic.key,
                        epic_name=epic.name
                    )
                    worklogs.append(worklog)
                    worklog_id += 1
        
        current_date += timedelta(days=1)
    
    return worklogs


def get_demo_epics() -> list[Epic]:
    """Get demo epics."""
    return DEMO_EPICS.copy()


class DemoJiraService:
    """Demo service that returns generated data instead of calling JIRA."""
    
    def __init__(self, config: AppConfig = DEMO_CONFIG):
        self.config = config
    
    async def get_all_worklogs(
        self,
        start_date: date,
        end_date: date,
        user_emails: Optional[list[str]] = None
    ) -> list[Worklog]:
        """Get demo worklogs."""
        return generate_demo_worklogs(start_date, end_date, user_emails, self.config)
    
    async def get_all_epics(self) -> list[Epic]:
        """Get demo epics."""
        return get_demo_epics()
