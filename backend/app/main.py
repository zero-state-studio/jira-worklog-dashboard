"""
JIRA Worklog Dashboard - FastAPI Backend
Main application entry point.
"""
import os
import time
import json
import traceback
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from .config import get_config, DEMO_CONFIG, get_teams_from_db, get_users_from_db
from .cache import get_storage
from .routers import dashboard, teams, users, epics, sync, settings, logs, issues, packages, billing, factorial
from .logging_config import (
    setup_logging, generate_request_id, request_id_var,
    get_logger, get_db_handler
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler - runs on startup and shutdown."""
    # Setup logging first
    setup_logging(log_level="DEBUG")
    logger = get_logger(__name__)

    # Startup
    logger.info("Starting JIRA Worklog Dashboard...")

    # Try to load config, fall back to demo mode if not found
    try:
        config = get_config()
        if config.settings.demo_mode:
            logger.info("Running in DEMO MODE with sample data")
        else:
            logger.info(f"Loaded configuration with {len(config.jira_instances)} JIRA instance(s)")
            logger.info(f"Configured {len(config.teams)} team(s) from config")
    except FileNotFoundError:
        logger.warning("No config.yaml found - running in DEMO MODE")
        # Force demo mode by setting environment variable
        os.environ["JIRA_DASHBOARD_DEMO_MODE"] = "true"

    # Initialize storage
    storage = get_storage()
    await storage.initialize()
    logger.info("Storage initialized")

    yield

    # Shutdown
    logger.info("Shutting down...")


# Create FastAPI application
app = FastAPI(
    title="JIRA Worklog Dashboard",
    description="Dashboard per visualizzare i worklog JIRA con supporto multi-team e multi-istanza",
    version="1.0.0",
    lifespan=lifespan
)


class LoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log all requests and responses."""

    MAX_BODY_SIZE = 10000  # Max 10KB for body capture

    async def dispatch(self, request: Request, call_next):
        # Generate and set request ID
        request_id = generate_request_id()
        request_id_var.set(request_id)

        # Skip logging for certain endpoints to reduce noise
        skip_logging = request.url.path in ["/api/health", "/api/logs"]

        start_time = time.time()
        logger = get_logger("http")

        # Capture request body for POST/PUT/PATCH/DELETE
        request_body = None
        query_params = None
        if not skip_logging:
            # Capture query params
            if request.query_params:
                query_params = dict(request.query_params)

            # Capture request body
            if request.method in ["POST", "PUT", "PATCH", "DELETE"]:
                try:
                    body_bytes = await request.body()
                    if body_bytes and len(body_bytes) < self.MAX_BODY_SIZE:
                        content_type = request.headers.get("content-type", "")
                        if "application/json" in content_type:
                            try:
                                request_body = json.loads(body_bytes)
                            except json.JSONDecodeError:
                                request_body = body_bytes.decode("utf-8", errors="replace")
                        else:
                            request_body = body_bytes.decode("utf-8", errors="replace")
                except Exception:
                    pass  # Ignore body capture errors

        # Log request (unless skipped)
        if not skip_logging:
            logger.info(f"Request: {request.method} {request.url.path}")

        # Process request and capture response body
        response_body = None
        try:
            response = await call_next(request)
            duration_ms = (time.time() - start_time) * 1000

            # Capture response body if JSON and small enough
            if not skip_logging:
                content_type = response.headers.get("content-type", "")
                if "application/json" in content_type:
                    # Read the response body
                    response_body_bytes = b""
                    async for chunk in response.body_iterator:
                        response_body_bytes += chunk

                    if len(response_body_bytes) < self.MAX_BODY_SIZE:
                        try:
                            response_body = json.loads(response_body_bytes)
                        except json.JSONDecodeError:
                            pass

                    # Recreate the response with the captured body
                    response = Response(
                        content=response_body_bytes,
                        status_code=response.status_code,
                        headers=dict(response.headers),
                        media_type=response.media_type
                    )

            # Log response
            if not skip_logging:
                logger.info(
                    f"Response: {request.method} {request.url.path} - {response.status_code} ({duration_ms:.1f}ms)"
                )

            # Flush logs to database
            db_handler = get_db_handler()
            if db_handler and not skip_logging:
                buffered_logs = db_handler.get_and_clear_buffer()
                if buffered_logs:
                    # Build extra_data with request/response info
                    extra_data = {}
                    if query_params:
                        extra_data["query_params"] = query_params
                    if request_body is not None:
                        extra_data["request_body"] = request_body
                    if response_body is not None:
                        extra_data["response_body"] = response_body

                    # Enrich with request info
                    for log in buffered_logs:
                        log["endpoint"] = request.url.path
                        log["method"] = request.method
                        log["status_code"] = response.status_code
                        log["duration_ms"] = duration_ms
                        if extra_data:
                            # Merge with existing extra_data if any
                            existing = log.get("extra_data") or {}
                            if isinstance(existing, str):
                                try:
                                    existing = json.loads(existing)
                                except:
                                    existing = {}
                            log["extra_data"] = {**existing, **extra_data}

                    # Store to database
                    storage = get_storage()
                    await storage.insert_logs_batch(buffered_logs)

            # Add request ID to response headers
            response.headers["X-Request-ID"] = request_id
            return response

        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            logger.error(f"Error: {request.method} {request.url.path} - {str(e)}", exc_info=True)
            raise


# Add logging middleware (before CORS)
app.add_middleware(LoggingMiddleware)

# Configure CORS for frontend (web and Tauri desktop)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # Alternative dev server
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "tauri://localhost",      # Tauri desktop app
        "https://tauri.localhost", # Tauri desktop app (alternative)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(dashboard.router)
app.include_router(teams.router)
app.include_router(users.router)
app.include_router(epics.router)
app.include_router(issues.router)
app.include_router(sync.router)
app.include_router(settings.router)
app.include_router(logs.router)
app.include_router(packages.router)
app.include_router(billing.router)
app.include_router(factorial.router)


# Global exception handler to log tracebacks
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch all unhandled exceptions and log full traceback."""
    logger = get_logger("error")

    # Get full traceback
    tb_str = traceback.format_exception(type(exc), exc, exc.__traceback__)
    full_traceback = "".join(tb_str)

    # Log with full traceback
    logger.error(
        f"Unhandled exception on {request.method} {request.url.path}:\n{full_traceback}"
    )

    # Store error log to database
    try:
        storage = get_storage()
        await storage.insert_logs_batch([{
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "level": "ERROR",
            "logger_name": "error",
            "message": f"Unhandled exception: {str(exc)}",
            "request_id": request_id_var.get(""),
            "endpoint": request.url.path,
            "method": request.method,
            "status_code": 500,
            "extra_data": {"traceback": full_traceback}
        }])
    except Exception:
        pass  # Don't fail if logging fails

    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"}
    )


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    try:
        config = get_config()
        teams = await get_teams_from_db()
        return {
            "status": "healthy",
            "demo_mode": config.settings.demo_mode,
            "jira_instances": len(config.jira_instances),
            "teams": len(teams)
        }
    except FileNotFoundError:
        return {
            "status": "healthy",
            "demo_mode": True,
            "jira_instances": 2,
            "teams": 3
        }


@app.get("/api/config")
async def get_config_info():
    """Get non-sensitive configuration info."""
    try:
        config = get_config()
    except FileNotFoundError:
        config = DEMO_CONFIG

    # Get teams and users from database
    teams = await get_teams_from_db()
    users = await get_users_from_db()

    # Get JIRA instances from database first, fallback to config.yaml
    storage = get_storage()
    db_instances = await storage.get_all_jira_instances()

    if db_instances:
        jira_instances = [
            {"name": inst["name"], "url": inst["url"]}
            for inst in db_instances if inst.get("is_active", True)
        ]
    else:
        # Fallback to config.yaml
        jira_instances = [
            {"name": inst.name, "url": inst.url}
            for inst in config.jira_instances
        ]

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

    return {
        "demo_mode": config.settings.demo_mode,
        "daily_working_hours": config.settings.daily_working_hours,
        "timezone": config.settings.timezone,
        "complementary_instances": config.settings.complementary_instances,
        "jira_instances": jira_instances,
        "teams": [
            {
                "name": team["name"],
                "member_count": len(team_members.get(team["name"], [])),
                "members": team_members.get(team["name"], [])
            }
            for team in teams
        ]
    }


@app.post("/api/cache/clear")
async def clear_cache():
    """Clear all cached data."""
    cache = get_cache()
    await cache.clear_all()
    return {"status": "ok", "message": "Cache cleared"}


# Entry point for running as standalone executable (Tauri sidecar)
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")
