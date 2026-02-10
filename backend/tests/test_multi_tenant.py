"""
Multi-tenant isolation and security tests.

Tests verify that:
1. Company 1 cannot see Company 2's data
2. JIRA credentials are filtered by company
3. Worklogs are isolated per company
4. Cross-company access returns 404 (not 403)
5. Authentication and authorization work correctly
"""
import pytest
from datetime import date, datetime, timedelta
from app.models import Worklog


def make_auth_header(token: str) -> dict:
    """Create Authorization header with token."""
    return {"Authorization": f"Bearer {token}"}


# ========== Authentication Tests ==========

@pytest.mark.asyncio
async def test_auth_no_token_returns_401(client):
    """Test that accessing protected endpoint without token returns 401."""
    response = await client.get("/api/settings/teams")
    assert response.status_code == 401
    assert "Not authenticated" in response.json()["detail"]


@pytest.mark.asyncio
async def test_auth_invalid_token_returns_401(client):
    """Test that invalid token returns 401."""
    response = await client.get(
        "/api/settings/teams",
        headers={"Authorization": "Bearer invalid_token_here"}
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_auth_valid_token_returns_200(client, company1_admin_token):
    """Test that valid token allows access."""
    response = await client.get(
        "/api/settings/teams",
        headers=make_auth_header(company1_admin_token)
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_auth_user_cannot_create_team(client, company1_user_token):
    """Test that USER role cannot perform ADMIN-only operations."""
    response = await client.post(
        "/api/settings/teams",
        headers=make_auth_header(company1_user_token),
        json={"name": "Test Team"}
    )
    assert response.status_code == 403
    assert "Insufficient permissions" in response.json()["detail"]


@pytest.mark.asyncio
async def test_auth_admin_can_create_team(client, setup_companies, company1_admin_token):
    """Test that ADMIN role can perform ADMIN-only operations."""
    response = await client.post(
        "/api/settings/teams",
        headers=make_auth_header(company1_admin_token),
        json={"name": "Engineering"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Engineering"
    assert data["company_id"] == setup_companies["company1_id"]


# ========== Team Isolation Tests ==========

@pytest.mark.asyncio
async def test_team_isolation_create_and_list(client, setup_companies, company1_admin_token, company2_admin_token):
    """Test that teams are isolated per company."""
    # Company 1 creates team
    response1 = await client.post(
        "/api/settings/teams",
        headers=make_auth_header(company1_admin_token),
        json={"name": "Engineering"}
    )
    assert response1.status_code == 200
    team1_id = response1.json()["id"]

    # Company 2 creates team with same name
    response2 = await client.post(
        "/api/settings/teams",
        headers=make_auth_header(company2_admin_token),
        json={"name": "Engineering"}
    )
    assert response2.status_code == 200
    team2_id = response2.json()["id"]

    # IDs should be different
    assert team1_id != team2_id

    # Company 1 lists teams - should only see their own
    response1 = await client.get(
        "/api/settings/teams",
        headers=make_auth_header(company1_admin_token)
    )
    assert response1.status_code == 200
    teams1 = response1.json()
    assert len(teams1) == 1
    assert teams1[0]["id"] == team1_id
    assert teams1[0]["name"] == "Engineering"

    # Company 2 lists teams - should only see their own
    response2 = await client.get(
        "/api/settings/teams",
        headers=make_auth_header(company2_admin_token)
    )
    assert response2.status_code == 200
    teams2 = response2.json()
    assert len(teams2) == 1
    assert teams2[0]["id"] == team2_id
    assert teams2[0]["name"] == "Engineering"


@pytest.mark.asyncio
async def test_team_cross_company_access_returns_404(client, setup_companies, company1_admin_token, company2_admin_token):
    """Test that accessing another company's team returns 404 (not 403)."""
    # Company 1 creates team
    response1 = await client.post(
        "/api/settings/teams",
        headers=make_auth_header(company1_admin_token),
        json={"name": "Engineering"}
    )
    assert response1.status_code == 200
    team1_id = response1.json()["id"]

    # Company 2 tries to access Company 1's team
    response2 = await client.get(
        f"/api/settings/teams/{team1_id}",
        headers=make_auth_header(company2_admin_token)
    )
    # Should return 404, NOT 403 (to avoid leaking existence)
    assert response2.status_code == 404
    assert "not found" in response2.json()["detail"].lower()


# ========== User Isolation Tests ==========

@pytest.mark.asyncio
async def test_user_isolation_create_and_list(client, setup_companies, company1_admin_token, company2_admin_token):
    """Test that users are isolated per company."""
    # Company 1 creates user
    response1 = await client.post(
        "/api/settings/users",
        headers=make_auth_header(company1_admin_token),
        json={
            "email": "john@company1.test",
            "first_name": "John",
            "last_name": "Doe"
        }
    )
    assert response1.status_code == 200
    user1_id = response1.json()["id"]

    # Company 2 creates user with same email
    response2 = await client.post(
        "/api/settings/users",
        headers=make_auth_header(company2_admin_token),
        json={
            "email": "john@company2.test",
            "first_name": "John",
            "last_name": "Smith"
        }
    )
    assert response2.status_code == 200
    user2_id = response2.json()["id"]

    # Company 1 lists users
    response1 = await client.get(
        "/api/settings/users",
        headers=make_auth_header(company1_admin_token)
    )
    assert response1.status_code == 200
    users1 = response1.json()
    assert len(users1) == 1
    assert users1[0]["email"] == "john@company1.test"

    # Company 2 lists users
    response2 = await client.get(
        "/api/settings/users",
        headers=make_auth_header(company2_admin_token)
    )
    assert response2.status_code == 200
    users2 = response2.json()
    assert len(users2) == 1
    assert users2[0]["email"] == "john@company2.test"


@pytest.mark.asyncio
async def test_user_cross_company_access_returns_404(client, setup_companies, company1_admin_token, company2_admin_token):
    """Test that accessing another company's user returns 404."""
    # Company 1 creates user
    response1 = await client.post(
        "/api/settings/users",
        headers=make_auth_header(company1_admin_token),
        json={
            "email": "john@company1.test",
            "first_name": "John",
            "last_name": "Doe"
        }
    )
    assert response1.status_code == 200
    user1_id = response1.json()["id"]

    # Company 2 tries to access Company 1's user
    response2 = await client.get(
        f"/api/settings/users/{user1_id}",
        headers=make_auth_header(company2_admin_token)
    )
    assert response2.status_code == 404


# ========== JIRA Instance Credential Leak Tests ==========

@pytest.mark.asyncio
async def test_jira_credential_isolation(client, setup_companies, company1_admin_token, company2_admin_token):
    """CRITICAL: Test that JIRA credentials are filtered by company."""
    # Company 1 creates JIRA instance with secret token
    response1 = await client.post(
        "/api/settings/jira-instances",
        headers=make_auth_header(company1_admin_token),
        json={
            "name": "Company1 JIRA",
            "url": "https://company1.atlassian.net",
            "email": "admin@company1.test",
            "api_token": "secret_token_company1_very_confidential",
            "tempo_api_token": None
        }
    )
    assert response1.status_code == 200
    instance1_id = response1.json()["id"]

    # Company 2 creates JIRA instance
    response2 = await client.post(
        "/api/settings/jira-instances",
        headers=make_auth_header(company2_admin_token),
        json={
            "name": "Company2 JIRA",
            "url": "https://company2.atlassian.net",
            "email": "admin@company2.test",
            "api_token": "secret_token_company2_also_confidential",
            "tempo_api_token": None
        }
    )
    assert response2.status_code == 200
    instance2_id = response2.json()["id"]

    # Company 1 lists instances - should ONLY see their own
    response1 = await client.get(
        "/api/settings/jira-instances",
        headers=make_auth_header(company1_admin_token)
    )
    assert response1.status_code == 200
    instances1 = response1.json()
    assert len(instances1) == 1
    assert instances1[0]["name"] == "Company1 JIRA"
    # Token should be masked
    assert "secret_token_company1" not in str(instances1[0])

    # Company 2 lists instances - should ONLY see their own
    response2 = await client.get(
        "/api/settings/jira-instances",
        headers=make_auth_header(company2_admin_token)
    )
    assert response2.status_code == 200
    instances2 = response2.json()
    assert len(instances2) == 1
    assert instances2[0]["name"] == "Company2 JIRA"
    # Should NOT see Company 1's credentials
    assert "company1" not in str(instances2[0]).lower()
    assert "secret_token_company1" not in str(instances2[0])


@pytest.mark.asyncio
async def test_jira_instance_cross_company_access_returns_404(client, setup_companies, company1_admin_token, company2_admin_token):
    """Test that accessing another company's JIRA instance returns 404."""
    # Company 1 creates instance
    response1 = await client.post(
        "/api/settings/jira-instances",
        headers=make_auth_header(company1_admin_token),
        json={
            "name": "Company1 JIRA",
            "url": "https://company1.atlassian.net",
            "email": "admin@company1.test",
            "api_token": "secret_token_1",
            "tempo_api_token": None
        }
    )
    assert response1.status_code == 200
    instance1_id = response1.json()["id"]

    # Company 2 tries to access Company 1's instance
    response2 = await client.get(
        f"/api/settings/jira-instances/{instance1_id}",
        headers=make_auth_header(company2_admin_token)
    )
    assert response2.status_code == 404


# ========== Worklog Isolation Tests ==========

@pytest.mark.asyncio
async def test_worklog_isolation(setup_companies):
    """CRITICAL: Test that worklogs are isolated per company."""
    storage = setup_companies["storage"]
    company1_id = setup_companies["company1_id"]
    company2_id = setup_companies["company2_id"]

    # Create worklogs for Company 1
    worklogs_c1 = [
        {
            "id": "wl1",
            "issue_key": "PROJ-1",
            "user_email": "user1@company1.test",
            "user_display_name": "User One",
            "started": datetime(2024, 1, 15, 9, 0, 0).isoformat(),
            "time_spent_seconds": 3600,
            "description": "Work on feature",
            "jira_instance": "Company1 JIRA"
        }
    ]
    await storage.upsert_worklogs(worklogs_c1, company1_id)

    # Create worklogs for Company 2
    worklogs_c2 = [
        {
            "id": "wl2",
            "issue_key": "TASK-1",
            "user_email": "user2@company2.test",
            "user_display_name": "User Two",
            "started": datetime(2024, 1, 15, 10, 0, 0).isoformat(),
            "time_spent_seconds": 7200,
            "description": "Different work",
            "jira_instance": "Company2 JIRA"
        }
    ]
    await storage.upsert_worklogs(worklogs_c2, company2_id)

    # Company 1 queries worklogs - should only see their own
    worklogs1 = await storage.get_worklogs_in_range(
        start_date=date(2024, 1, 1),
        end_date=date(2024, 1, 31),
        user_emails=None,
        jira_instance=None,
        company_id=company1_id
    )
    assert len(worklogs1) == 1
    assert worklogs1[0]["id"] == "wl1"
    assert worklogs1[0]["user_email"] == "user1@company1.test"

    # Company 2 queries same date range - should only see their own
    worklogs2 = await storage.get_worklogs_in_range(
        start_date=date(2024, 1, 1),
        end_date=date(2024, 1, 31),
        user_emails=None,
        jira_instance=None,
        company_id=company2_id
    )
    assert len(worklogs2) == 1
    assert worklogs2[0]["id"] == "wl2"
    assert worklogs2[0]["user_email"] == "user2@company2.test"

    # Verify Company 1 does NOT see Company 2's worklog
    assert "wl2" not in [w["id"] for w in worklogs1]
    # Verify Company 2 does NOT see Company 1's worklog
    assert "wl1" not in [w["id"] for w in worklogs2]


# ========== Billing Isolation Tests ==========

@pytest.mark.asyncio
async def test_billing_client_isolation(client, setup_companies, company1_admin_token, company2_admin_token):
    """Test that billing clients are isolated per company."""
    # Company 1 creates billing client
    response1 = await client.post(
        "/api/billing/clients",
        headers=make_auth_header(company1_admin_token),
        json={
            "name": "Acme Corp",
            "billing_currency": "USD",
            "default_hourly_rate": 150.0
        }
    )
    assert response1.status_code == 200
    client1_id = response1.json()["id"]

    # Company 2 creates billing client
    response2 = await client.post(
        "/api/billing/clients",
        headers=make_auth_header(company2_admin_token),
        json={
            "name": "Globex Inc",
            "billing_currency": "EUR",
            "default_hourly_rate": 120.0
        }
    )
    assert response2.status_code == 200
    client2_id = response2.json()["id"]

    # Company 1 lists clients
    response1 = await client.get(
        "/api/billing/clients",
        headers=make_auth_header(company1_admin_token)
    )
    assert response1.status_code == 200
    clients1 = response1.json()
    assert len(clients1) == 1
    assert clients1[0]["name"] == "Acme Corp"

    # Company 2 lists clients
    response2 = await client.get(
        "/api/billing/clients",
        headers=make_auth_header(company2_admin_token)
    )
    assert response2.status_code == 200
    clients2 = response2.json()
    assert len(clients2) == 1
    assert clients2[0]["name"] == "Globex Inc"


@pytest.mark.asyncio
async def test_billing_client_cross_company_access_returns_404(client, setup_companies, company1_admin_token, company2_admin_token):
    """Test that accessing another company's billing client returns 404."""
    # Company 1 creates client
    response1 = await client.post(
        "/api/billing/clients",
        headers=make_auth_header(company1_admin_token),
        json={
            "name": "Acme Corp",
            "billing_currency": "USD",
            "default_hourly_rate": 150.0
        }
    )
    assert response1.status_code == 200
    client1_id = response1.json()["id"]

    # Company 2 tries to access Company 1's client by updating it
    response2 = await client.put(
        f"/api/billing/clients/{client1_id}",
        headers=make_auth_header(company2_admin_token),
        json={"default_hourly_rate": 200.0}
    )
    assert response2.status_code == 404


# ========== Package Template Isolation Tests ==========

@pytest.mark.asyncio
async def test_package_template_isolation(client, setup_companies, company1_admin_token, company2_admin_token):
    """Test that package templates are isolated per company."""
    # Company 1 creates template
    response1 = await client.post(
        "/api/packages/templates",
        headers=make_auth_header(company1_admin_token),
        json={
            "name": "Standard Sprint Package",
            "description": "Our sprint package",
            "default_project_key": "PROJ",
            "parent_issue_type": "Epic",
            "child_issue_type": "Story",
            "elements": ["Backend", "Frontend", "Testing"]
        }
    )
    assert response1.status_code == 200
    template1_id = response1.json()["id"]

    # Company 2 creates template
    response2 = await client.post(
        "/api/packages/templates",
        headers=make_auth_header(company2_admin_token),
        json={
            "name": "Standard Sprint Package",
            "description": "Their sprint package",
            "default_project_key": "TASK",
            "parent_issue_type": "Initiative",
            "child_issue_type": "Task",
            "elements": ["Design", "Development"]
        }
    )
    assert response2.status_code == 200
    template2_id = response2.json()["id"]

    # Company 1 lists templates
    response1 = await client.get(
        "/api/packages/templates",
        headers=make_auth_header(company1_admin_token)
    )
    assert response1.status_code == 200
    templates1 = response1.json()["templates"]
    assert len(templates1) == 1
    assert templates1[0]["id"] == template1_id
    assert len(templates1[0]["elements"]) == 3

    # Company 2 lists templates
    response2 = await client.get(
        "/api/packages/templates",
        headers=make_auth_header(company2_admin_token)
    )
    assert response2.status_code == 200
    templates2 = response2.json()["templates"]
    assert len(templates2) == 1
    assert templates2[0]["id"] == template2_id
    assert len(templates2[0]["elements"]) == 2


# ========== Holiday Isolation Tests ==========

@pytest.mark.asyncio
async def test_holiday_isolation(client, setup_companies, company1_admin_token, company2_admin_token):
    """Test that holidays are isolated per company."""
    # Company 1 creates holiday
    response1 = await client.post(
        "/api/settings/holidays",
        headers=make_auth_header(company1_admin_token),
        json={
            "date": "2024-12-25",
            "description": "Christmas"
        }
    )
    assert response1.status_code == 200

    # Company 2 creates different holiday
    response2 = await client.post(
        "/api/settings/holidays",
        headers=make_auth_header(company2_admin_token),
        json={
            "date": "2024-07-04",
            "description": "Independence Day"
        }
    )
    assert response2.status_code == 200

    # Company 1 lists holidays
    response1 = await client.get(
        "/api/settings/holidays?year=2024",
        headers=make_auth_header(company1_admin_token)
    )
    assert response1.status_code == 200
    holidays1 = response1.json()
    assert len(holidays1) == 1
    assert holidays1[0]["date"] == "2024-12-25"

    # Company 2 lists holidays
    response2 = await client.get(
        "/api/settings/holidays?year=2024",
        headers=make_auth_header(company2_admin_token)
    )
    assert response2.status_code == 200
    holidays2 = response2.json()
    assert len(holidays2) == 1
    assert holidays2[0]["date"] == "2024-07-04"


# ========== Epic Isolation Tests ==========

@pytest.mark.asyncio
async def test_epic_isolation(setup_companies):
    """Test that epics are isolated per company."""
    storage = setup_companies["storage"]
    company1_id = setup_companies["company1_id"]
    company2_id = setup_companies["company2_id"]

    # Create epic for Company 1
    await storage.upsert_epic(
        epic_key="PROJ-100",
        epic_name="Company 1 Epic",
        summary="Feature A",
        status="In Progress",
        jira_instance="Company1 JIRA",
        company_id=company1_id
    )

    # Create epic for Company 2
    await storage.upsert_epic(
        epic_key="TASK-200",
        epic_name="Company 2 Epic",
        summary="Feature B",
        status="To Do",
        jira_instance="Company2 JIRA",
        company_id=company2_id
    )

    # Company 1 gets epics
    epics1 = await storage.get_all_epics(company1_id)
    assert len(epics1) == 1
    assert epics1[0]["epic_key"] == "PROJ-100"

    # Company 2 gets epics
    epics2 = await storage.get_all_epics(company2_id)
    assert len(epics2) == 1
    assert epics2[0]["epic_key"] == "TASK-200"


# ========== Dashboard Isolation Tests ==========

@pytest.mark.asyncio
async def test_dashboard_requires_authentication(client):
    """Test that dashboard endpoint requires authentication."""
    response = await client.get("/api/dashboard?start_date=2024-01-01&end_date=2024-01-31")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_dashboard_data_isolation(client, setup_companies, company1_admin_token, company2_admin_token):
    """Test that dashboard shows only company-specific data."""
    storage = setup_companies["storage"]
    company1_id = setup_companies["company1_id"]
    company2_id = setup_companies["company2_id"]

    # Create user for Company 1
    user1_id = await storage.create_user(
        email="user1@company1.test",
        first_name="User",
        last_name="One",
        company_id=company1_id
    )

    # Create user for Company 2
    user2_id = await storage.create_user(
        email="user2@company2.test",
        first_name="User",
        last_name="Two",
        company_id=company2_id
    )

    # Create worklogs for Company 1
    worklogs_c1 = [
        Worklog(
            id="wl1",
            issue_key="PROJ-1",
            issue_summary="Company 1 work",
            author_email="user1@company1.test",
            author_display_name="User One",
            started=datetime(2024, 1, 15, 9, 0, 0),
            time_spent_seconds=28800,  # 8 hours
            jira_instance="Instance1"
        )
    ]
    await storage.upsert_worklogs(worklogs_c1, company1_id)

    # Create worklogs for Company 2
    worklogs_c2 = [
        Worklog(
            id="wl2",
            issue_key="TASK-1",
            issue_summary="Company 2 work",
            author_email="user2@company2.test",
            author_display_name="User Two",
            started=datetime(2024, 1, 15, 10, 0, 0),
            time_spent_seconds=14400,  # 4 hours
            jira_instance="Instance2"
        )
    ]
    await storage.upsert_worklogs(worklogs_c2, company2_id)

    # Company 1 gets dashboard - should only see 8 hours
    response1 = await client.get(
        "/api/dashboard?start_date=2024-01-01&end_date=2024-01-31",
        headers=make_auth_header(company1_admin_token)
    )
    assert response1.status_code == 200
    data1 = response1.json()
    assert data1["total_hours"] == 8.0

    # Company 2 gets dashboard - should only see 4 hours
    response2 = await client.get(
        "/api/dashboard?start_date=2024-01-01&end_date=2024-01-31",
        headers=make_auth_header(company2_admin_token)
    )
    assert response2.status_code == 200
    data2 = response2.json()
    assert data2["total_hours"] == 4.0


# ========== Summary Test ==========

@pytest.mark.asyncio
async def test_complete_isolation_summary(setup_companies):
    """
    Comprehensive test verifying complete data isolation.

    This test creates comprehensive data for two companies and verifies:
    - No data leakage between companies
    - All entities are properly scoped
    - Cross-company queries return empty results
    """
    storage = setup_companies["storage"]
    company1_id = setup_companies["company1_id"]
    company2_id = setup_companies["company2_id"]

    # ===== Setup Company 1 Data =====
    team1_id = await storage.create_team("Engineering", company1_id)
    user1_id = await storage.create_user("eng1@c1.test", "Eng", "One", company1_id, team1_id)
    jira1_id = await storage.create_jira_instance(
        "C1 JIRA", "https://c1.test", "admin@c1.test", "secret1", None, company1_id
    )

    # ===== Setup Company 2 Data =====
    team2_id = await storage.create_team("Engineering", company2_id)
    user2_id = await storage.create_user("eng2@c2.test", "Eng", "Two", company2_id, team2_id)
    jira2_id = await storage.create_jira_instance(
        "C2 JIRA", "https://c2.test", "admin@c2.test", "secret2", None, company2_id
    )

    # ===== Verification: Teams =====
    teams1 = await storage.get_all_teams(company1_id)
    teams2 = await storage.get_all_teams(company2_id)
    assert len(teams1) == 1
    assert len(teams2) == 1
    assert teams1[0]["id"] != teams2[0]["id"]

    # ===== Verification: Users =====
    users1 = await storage.get_all_users(company1_id)
    users2 = await storage.get_all_users(company2_id)
    assert len(users1) == 1
    assert len(users2) == 1
    assert users1[0]["email"] == "eng1@c1.test"
    assert users2[0]["email"] == "eng2@c2.test"

    # ===== Verification: JIRA Instances =====
    jira1 = await storage.get_all_jira_instances(company1_id)
    jira2 = await storage.get_all_jira_instances(company2_id)
    assert len(jira1) == 1
    assert len(jira2) == 1
    assert jira1[0]["api_token"] == "secret1"
    assert jira2[0]["api_token"] == "secret2"

    # ===== Verification: Cross-company access returns None/Empty =====
    team_c2_from_c1 = await storage.get_team(team2_id, company1_id)
    assert team_c2_from_c1 is None

    user_c2_from_c1 = await storage.get_user(user2_id, company1_id)
    assert user_c2_from_c1 is None

    print("\n✅ Complete isolation verified:")
    print(f"  - Company 1 has {len(teams1)} team(s), {len(users1)} user(s), {len(jira1)} JIRA instance(s)")
    print(f"  - Company 2 has {len(teams2)} team(s), {len(users2)} user(s), {len(jira2)} JIRA instance(s)")
    print(f"  - Cross-company access correctly returns None/Empty")
    print(f"  - No data leakage detected")
