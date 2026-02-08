"""
Logs API router - view and manage application logs.
"""
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Query, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import csv
import io
import json

from ..cache import get_storage
from ..auth.dependencies import require_admin, CurrentUser

router = APIRouter(prefix="/api/logs", tags=["logs"])


class LogEntry(BaseModel):
    """Log entry model."""
    id: int
    timestamp: str
    level: str
    logger_name: Optional[str] = None
    message: str
    request_id: Optional[str] = None
    endpoint: Optional[str] = None
    method: Optional[str] = None
    status_code: Optional[int] = None
    duration_ms: Optional[float] = None
    extra_data: Optional[dict] = None


class LogsResponse(BaseModel):
    """Paginated logs response."""
    logs: list[LogEntry]
    total: int
    page: int
    page_size: int
    total_pages: int


class LogStatsResponse(BaseModel):
    """Log statistics response."""
    total: int
    by_level: dict
    date_range: Optional[dict] = None


@router.get("", response_model=LogsResponse)
async def get_logs(
    level: Optional[str] = Query(None, description="Filter by log level (DEBUG, INFO, WARNING, ERROR)"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    endpoint: Optional[str] = Query(None, description="Filter by endpoint pattern"),
    request_id: Optional[str] = Query(None, description="Filter by request ID"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=10, le=200, description="Items per page"),
    current_user: CurrentUser = Depends(require_admin)
):
    """Get paginated logs with optional filters (ADMIN only)."""
    storage = get_storage()
    offset = (page - 1) * page_size

    logs, total = await storage.get_logs(
        level=level,
        start_date=start_date,
        end_date=end_date,
        endpoint=endpoint,
        request_id=request_id,
        limit=page_size,
        offset=offset
    )

    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return LogsResponse(
        logs=[LogEntry(**log) for log in logs],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/stats", response_model=LogStatsResponse)
async def get_log_stats(current_user: CurrentUser = Depends(require_admin)):
    """Get log statistics (ADMIN only)."""
    storage = get_storage()
    stats = await storage.get_log_stats()
    return LogStatsResponse(**stats)


def format_log_as_text(log: dict) -> str:
    """Format a single log entry as readable text."""
    lines = []
    lines.append("=" * 80)
    lines.append(f"[{log.get('timestamp', 'N/A')}] [{log.get('level', 'N/A')}]")
    lines.append(f"Endpoint: {log.get('method', '')} {log.get('endpoint', 'N/A')}")
    lines.append(f"Status: {log.get('status_code', 'N/A')} | Duration: {log.get('duration_ms', 0):.1f}ms")
    lines.append(f"Request ID: {log.get('request_id', 'N/A')}")
    lines.append(f"Message: {log.get('message', 'N/A')}")

    # Include extra_data if present
    extra_data = log.get('extra_data')
    if extra_data:
        if isinstance(extra_data, str):
            try:
                extra_data = json.loads(extra_data)
            except:
                pass

        if isinstance(extra_data, dict):
            if extra_data.get('query_params'):
                lines.append(f"Query Params: {json.dumps(extra_data['query_params'], ensure_ascii=False)}")
            if extra_data.get('request_body'):
                body = extra_data['request_body']
                if isinstance(body, dict):
                    body = json.dumps(body, indent=2, ensure_ascii=False)
                lines.append(f"Request Body:\n{body}")
            if extra_data.get('response_body'):
                body = extra_data['response_body']
                if isinstance(body, dict):
                    body = json.dumps(body, indent=2, ensure_ascii=False)
                # Truncate long response bodies
                if len(str(body)) > 500:
                    body = str(body)[:500] + "... (truncated)"
                lines.append(f"Response Body:\n{body}")

    return "\n".join(lines)


@router.get("/download")
async def download_logs(
    format: str = Query("json", description="Download format: json, csv, or txt"),
    level: Optional[str] = Query(None, description="Filter by log level"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    endpoint: Optional[str] = Query(None, description="Filter by endpoint pattern"),
    limit: int = Query(10000, ge=100, le=100000, description="Max logs to download"),
    current_user: CurrentUser = Depends(require_admin)
):
    """Download logs as JSON, CSV, or TXT (ADMIN only)."""
    storage = get_storage()

    logs, _ = await storage.get_logs(
        level=level,
        start_date=start_date,
        end_date=end_date,
        endpoint=endpoint,
        limit=limit,
        offset=0
    )

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    format_lower = format.lower()

    if format_lower == "csv":
        # Generate CSV
        output = io.StringIO()
        if logs:
            fieldnames = [
                "id", "timestamp", "level", "logger_name", "message",
                "request_id", "endpoint", "method", "status_code", "duration_ms"
            ]
            writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction='ignore')
            writer.writeheader()
            writer.writerows(logs)

        content = output.getvalue()
        return StreamingResponse(
            iter([content]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=logs_{timestamp}.csv"
            }
        )
    elif format_lower == "txt":
        # Generate human-readable TXT
        lines = [
            f"JIRA Worklog Dashboard - Application Logs",
            f"Exported: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"Total logs: {len(logs)}",
            f"Filters: level={level or 'all'}, start={start_date or 'N/A'}, end={end_date or 'N/A'}",
            "",
        ]
        for log in logs:
            lines.append(format_log_as_text(log))
        lines.append("=" * 80)
        lines.append("END OF LOG FILE")

        content = "\n".join(lines)
        return StreamingResponse(
            iter([content]),
            media_type="text/plain",
            headers={
                "Content-Disposition": f"attachment; filename=logs_{timestamp}.txt"
            }
        )
    else:
        # Generate JSON (default)
        content = json.dumps(logs, indent=2, ensure_ascii=False)
        return StreamingResponse(
            iter([content]),
            media_type="application/json",
            headers={
                "Content-Disposition": f"attachment; filename=logs_{timestamp}.json"
            }
        )


@router.delete("")
async def delete_old_logs(
    before_days: int = Query(30, ge=0, le=365, description="Delete logs older than N days. Use 0 to delete ALL logs."),
    current_user: CurrentUser = Depends(require_admin)
):
    """Delete logs older than specified number of days. Use before_days=0 to delete all logs (ADMIN only)."""
    storage = get_storage()

    if before_days == 0:
        # Delete ALL logs
        deleted = await storage.delete_all_logs()
        return {
            "success": True,
            "deleted_count": deleted,
            "message": "All logs deleted"
        }
    else:
        before_date = (datetime.now() - timedelta(days=before_days)).isoformat()
        deleted = await storage.delete_old_logs(before_date)
        return {
            "success": True,
            "deleted_count": deleted,
            "before_date": before_date
        }
