"""
Packages API router - create packages of JIRA issues from templates.
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from ..models import (
    PackageTemplateCreate, PackageTemplateUpdate,
    PackageCreateRequest, PackageCreateResponse, PackageCreateResult
)
from ..cache import get_storage
from ..jira_client import JiraClient
from ..config import get_jira_instances_from_db
from ..logging_config import get_logger

router = APIRouter(prefix="/api/packages", tags=["packages"])
logger = get_logger(__name__)


# ========== Template CRUD Endpoints ==========

@router.get("/templates")
async def list_templates():
    """List all package templates with their elements."""
    storage = get_storage()
    templates = await storage.get_all_package_templates()
    return {"templates": templates}


@router.post("/templates")
async def create_template(data: PackageTemplateCreate):
    """Create a new package template."""
    storage = get_storage()

    template_id = await storage.create_package_template(
        name=data.name,
        description=data.description,
        default_project_key=data.default_project_key,
        parent_issue_type=data.parent_issue_type,
        child_issue_type=data.child_issue_type
    )

    # Set elements
    if data.elements:
        await storage.set_template_elements(template_id, data.elements)

    template = await storage.get_package_template(template_id)
    return template


@router.get("/templates/{template_id}")
async def get_template(template_id: int):
    """Get a single package template."""
    storage = get_storage()
    template = await storage.get_package_template(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@router.put("/templates/{template_id}")
async def update_template(template_id: int, data: PackageTemplateUpdate):
    """Update a package template."""
    storage = get_storage()

    existing = await storage.get_package_template(template_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Template not found")

    # Update basic fields
    update_fields = {}
    if data.name is not None:
        update_fields["name"] = data.name
    if data.description is not None:
        update_fields["description"] = data.description
    if data.default_project_key is not None:
        update_fields["default_project_key"] = data.default_project_key
    if data.parent_issue_type is not None:
        update_fields["parent_issue_type"] = data.parent_issue_type
    if data.child_issue_type is not None:
        update_fields["child_issue_type"] = data.child_issue_type

    if update_fields:
        await storage.update_package_template(template_id, **update_fields)

    # Update elements if provided
    if data.elements is not None:
        await storage.set_template_elements(template_id, data.elements)

    updated = await storage.get_package_template(template_id)
    return updated


@router.delete("/templates/{template_id}")
async def delete_template(template_id: int):
    """Delete a package template."""
    storage = get_storage()

    existing = await storage.get_package_template(template_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Template not found")

    await storage.delete_package_template(template_id)
    return {"success": True, "message": "Template deleted"}


# ========== JIRA Metadata Endpoints ==========

@router.get("/jira-projects")
async def get_jira_projects(instance: str = Query(..., description="JIRA instance name")):
    """Get projects from a JIRA instance."""
    storage = get_storage()
    db_instance = await storage.get_jira_instance_by_name(instance)
    if not db_instance:
        raise HTTPException(status_code=404, detail=f"JIRA instance '{instance}' not found")

    from ..models import JiraInstanceConfig
    instance_config = JiraInstanceConfig(
        name=db_instance["name"],
        url=db_instance["url"],
        email=db_instance["email"],
        api_token=db_instance["api_token"],
        tempo_api_token=db_instance.get("tempo_api_token")
    )

    client = JiraClient(instance_config)
    projects = await client.get_projects()
    return {"projects": projects}


@router.get("/jira-issue-types")
async def get_jira_issue_types(
    instance: str = Query(..., description="JIRA instance name"),
    project_key: str = Query(..., description="JIRA project key")
):
    """Get issue types for a project from a JIRA instance."""
    storage = get_storage()
    db_instance = await storage.get_jira_instance_by_name(instance)
    if not db_instance:
        raise HTTPException(status_code=404, detail=f"JIRA instance '{instance}' not found")

    from ..models import JiraInstanceConfig
    instance_config = JiraInstanceConfig(
        name=db_instance["name"],
        url=db_instance["url"],
        email=db_instance["email"],
        api_token=db_instance["api_token"],
        tempo_api_token=db_instance.get("tempo_api_token")
    )

    client = JiraClient(instance_config)
    issue_types = await client.get_issue_types_for_project(project_key)
    return {"issue_types": issue_types}


# ========== Package Creation Endpoint ==========

@router.post("/create", response_model=PackageCreateResponse)
async def create_package(data: PackageCreateRequest):
    """Create a package of issues (parent + children) on one or more JIRA instances."""
    storage = get_storage()

    if not data.jira_instances:
        raise HTTPException(status_code=400, detail="At least one JIRA instance is required")

    if not data.selected_elements:
        raise HTTPException(status_code=400, detail="At least one element must be selected")

    results = []
    errors = []

    for instance_name in data.jira_instances:
        try:
            # Get JIRA instance credentials
            db_instance = await storage.get_jira_instance_by_name(instance_name)
            if not db_instance:
                errors.append(f"JIRA instance '{instance_name}' not found")
                continue

            from ..models import JiraInstanceConfig
            instance_config = JiraInstanceConfig(
                name=db_instance["name"],
                url=db_instance["url"],
                email=db_instance["email"],
                api_token=db_instance["api_token"],
                tempo_api_token=db_instance.get("tempo_api_token")
            )

            client = JiraClient(instance_config)

            # Step 1: Create parent issue
            logger.info(f"Creating parent issue on {instance_name}: {data.parent_summary}")
            parent_result = await client.create_issue(
                project_key=data.project_key,
                summary=data.parent_summary,
                issue_type=data.parent_issue_type,
                description=data.parent_description
            )
            parent_key = parent_result.get("key")
            logger.info(f"Parent issue created: {parent_key}")

            # Step 2: Create child issues linked to parent
            child_issues = [
                {
                    "project_key": data.project_key,
                    "summary": element,
                    "issue_type": data.child_issue_type,
                    "parent_key": parent_key
                }
                for element in data.selected_elements
            ]

            children_created = []
            try:
                # Try bulk creation first
                bulk_result = await client.create_issues_bulk(child_issues)
                for issue in bulk_result.get("issues", []):
                    children_created.append({
                        "key": issue.get("key"),
                        "summary": ""  # Bulk doesn't return summary
                    })

                # Handle bulk errors
                for error in bulk_result.get("errors", []):
                    errors.append(f"{instance_name}: Child issue error: {error}")

            except Exception as bulk_error:
                # Fallback: create children one by one
                logger.warning(f"Bulk creation failed on {instance_name}, falling back to sequential: {bulk_error}")
                for child in child_issues:
                    try:
                        child_result = await client.create_issue(
                            project_key=child["project_key"],
                            summary=child["summary"],
                            issue_type=child["issue_type"],
                            parent_key=child["parent_key"]
                        )
                        children_created.append({
                            "key": child_result.get("key"),
                            "summary": child["summary"]
                        })
                    except Exception as child_error:
                        errors.append(f"{instance_name}: Failed to create child '{child['summary']}': {str(child_error)}")

            # Map summaries to children (for bulk results that don't include summary)
            for i, child in enumerate(children_created):
                if not child.get("summary") and i < len(data.selected_elements):
                    child["summary"] = data.selected_elements[i]

            results.append(PackageCreateResult(
                jira_instance=instance_name,
                parent_key=parent_key,
                children=children_created
            ))

            logger.info(f"Package created on {instance_name}: parent={parent_key}, children={len(children_created)}")

        except Exception as e:
            error_msg = f"{instance_name}: {str(e)}"
            errors.append(error_msg)
            logger.error(f"Failed to create package on {instance_name}: {e}")

    return PackageCreateResponse(
        success=len(results) > 0,
        results=results,
        errors=errors
    )
