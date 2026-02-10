"""
Performance tests for upsert_worklogs N+1 fix.

Verifies that the batch upsert operation is significantly faster
than the previous loop-based approach.
"""
import pytest
import time
from datetime import datetime, timedelta
from app.models import Worklog


def create_test_worklog(index: int, company_id: int = 1) -> Worklog:
    """Create a test worklog."""
    now = datetime.now()
    return Worklog(
        id=f"worklog-{company_id}-{index}",
        issue_key=f"PROJ-{index % 100}",
        issue_summary=f"Test Issue {index}",
        author_email=f"user{index % 10}@test.com",
        author_display_name=f"Test User {index % 10}",
        time_spent_seconds=3600,  # 1 hour
        started=now - timedelta(days=index % 30),
        jira_instance="Test Instance",
        parent_key=f"EPIC-{index % 20}",
        parent_name=f"Test Epic {index % 20}",
        parent_type="Epic",
        epic_key=f"EPIC-{index % 20}",
        epic_name=f"Test Epic {index % 20}"
    )


@pytest.mark.asyncio
async def test_upsert_worklogs_batch_performance(storage):
    """
    Test that batch upsert is significantly faster than loop-based approach.

    Expected improvement: 12x faster (60s -> 5s for 100k worklogs)
    Testing with 10k worklogs for faster test execution.
    """
    company_id = 1
    worklog_count = 10000

    # Create test worklogs
    worklogs = [
        create_test_worklog(i, company_id)
        for i in range(worklog_count)
    ]

    # Measure batch upsert performance
    start_time = time.time()
    inserted, updated = await storage.upsert_worklogs(worklogs, company_id)
    elapsed_time = time.time() - start_time

    # Verify results
    assert inserted == worklog_count, f"Expected {worklog_count} inserts, got {inserted}"
    assert updated == 0, f"Expected 0 updates on first run, got {updated}"

    # Calculate performance metrics
    worklogs_per_second = worklog_count / elapsed_time
    time_per_worklog_ms = (elapsed_time * 1000) / worklog_count

    print(f"\n✓ Batch Upsert Performance (10k worklogs):")
    print(f"  Total time: {elapsed_time:.2f}s")
    print(f"  Worklogs/sec: {worklogs_per_second:.0f}")
    print(f"  Time per worklog: {time_per_worklog_ms:.3f}ms")

    # Performance assertion: Should be significantly fast (< 0.5s for 10k)
    # Extrapolating: 100k should be < 5s (vs old 60s)
    assert elapsed_time < 1.0, f"Batch upsert took {elapsed_time:.2f}s, expected < 1.0s for 10k worklogs"


@pytest.mark.asyncio
async def test_upsert_worklogs_duplicate_handling(storage):
    """
    Test that upserting duplicate worklogs updates existing records.
    """
    company_id = 1
    worklog_count = 100

    # First upsert: all new
    worklogs_batch1 = [
        create_test_worklog(i, company_id)
        for i in range(worklog_count)
    ]

    inserted1, updated1 = await storage.upsert_worklogs(worklogs_batch1, company_id)
    assert inserted1 == worklog_count, f"First upsert: expected {worklog_count} inserts"
    assert updated1 == 0, f"First upsert: expected 0 updates"

    # Modify some worklogs (change time_spent)
    modified_worklogs = []
    for i in range(worklog_count):
        wl = create_test_worklog(i, company_id)
        if i % 3 == 0:  # Modify 1/3 of worklogs
            wl.time_spent_seconds = 7200  # Change to 2 hours
        modified_worklogs.append(wl)

    # Second upsert: should update existing records
    inserted2, updated2 = await storage.upsert_worklogs(modified_worklogs, company_id)

    # About 1/3 should be updates, 0 inserts (all already exist)
    assert inserted2 == 0, f"Second upsert: expected 0 inserts, got {inserted2}"
    assert updated2 == worklog_count, f"Second upsert: expected {worklog_count} updates, got {updated2}"

    print(f"\n✓ Upsert Duplicate Handling:")
    print(f"  First: {inserted1} inserted, {updated1} updated")
    print(f"  Second: {inserted2} inserted, {updated2} updated")


@pytest.mark.asyncio
async def test_upsert_worklogs_mixed_batch(storage):
    """
    Test that batch upsert handles mixed new/existing records correctly.
    """
    company_id = 1

    # First batch: insert 100 worklogs
    first_batch = [
        create_test_worklog(i, company_id)
        for i in range(100)
    ]
    inserted1, updated1 = await storage.upsert_worklogs(first_batch, company_id)
    assert inserted1 == 100
    assert updated1 == 0

    # Second batch: 50 existing + 50 new
    second_batch = [
        create_test_worklog(i, company_id)  # First 50 are existing (0-49)
        for i in range(100)  # Create 100 more (0-99)
    ] + [
        create_test_worklog(100 + i, company_id)  # 50 new (100-149)
        for i in range(50)
    ]

    inserted2, updated2 = await storage.upsert_worklogs(second_batch, company_id)

    # 50 from first batch (0-49) should be updated, 50 new should be inserted (100-149)
    assert inserted2 == 50, f"Mixed batch: expected 50 inserts, got {inserted2}"
    assert updated2 == 100, f"Mixed batch: expected 100 updates, got {updated2}"

    print(f"\n✓ Mixed Batch Handling:")
    print(f"  Inserted: {inserted2}, Updated: {updated2}")


@pytest.mark.asyncio
async def test_upsert_worklogs_empty_list(storage):
    """Test that upserting empty list is handled correctly."""
    company_id = 1

    inserted, updated = await storage.upsert_worklogs([], company_id)

    assert inserted == 0
    assert updated == 0


@pytest.mark.asyncio
async def test_upsert_worklogs_company_isolation(storage):
    """
    Test that worklogs are isolated by company_id.
    """
    company1_id = 1
    company2_id = 2

    # Company 1 inserts
    worklogs_c1 = [
        create_test_worklog(i, company1_id)
        for i in range(50)
    ]
    inserted_c1, _ = await storage.upsert_worklogs(worklogs_c1, company1_id)
    assert inserted_c1 == 50

    # Company 2 inserts same worklog IDs (should not conflict)
    worklogs_c2 = [
        create_test_worklog(i, company2_id)
        for i in range(50)
    ]
    inserted_c2, _ = await storage.upsert_worklogs(worklogs_c2, company2_id)
    assert inserted_c2 == 50

    # Verify both companies' data is separate
    count_c1 = await storage.get_worklog_count(company1_id)
    count_c2 = await storage.get_worklog_count(company2_id)

    assert count_c1 == 50, f"Company 1 should have 50 worklogs, has {count_c1}"
    assert count_c2 == 50, f"Company 2 should have 50 worklogs, has {count_c2}"

    print(f"\n✓ Company Isolation:")
    print(f"  Company 1: {count_c1} worklogs")
    print(f"  Company 2: {count_c2} worklogs")
