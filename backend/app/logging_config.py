"""
Logging configuration for JIRA Worklog Dashboard.
Provides structured JSON logging with file rotation and database persistence.
"""
import logging
import json
import sys
import uuid
from datetime import datetime
from pathlib import Path
from logging.handlers import RotatingFileHandler
from typing import Optional
from contextvars import ContextVar

# Context variable for request tracking
request_id_var: ContextVar[str] = ContextVar('request_id', default='')


class JSONFormatter(logging.Formatter):
    """Custom formatter that outputs logs in JSON format."""

    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": request_id_var.get(''),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        # Add extra fields if present
        if hasattr(record, 'extra_data'):
            log_data['extra_data'] = record.extra_data

        # Add exception info if present
        if record.exc_info:
            log_data['exception'] = self.formatException(record.exc_info)

        return json.dumps(log_data, ensure_ascii=False)


class DatabaseLogHandler(logging.Handler):
    """Handler that buffers logs for batch storage in SQLite database."""

    def __init__(self, level=logging.NOTSET):
        super().__init__(level)
        self._buffer = []
        self._buffer_size = 50  # Max buffer before warning

    def emit(self, record: logging.LogRecord):
        """Queue log entry for async storage."""
        try:
            log_entry = {
                "timestamp": datetime.utcnow().isoformat(),
                "level": record.levelname,
                "logger_name": record.name,
                "message": self.format(record),
                "request_id": request_id_var.get(''),
                "extra_data": getattr(record, 'extra_data', None)
            }
            self._buffer.append(log_entry)

            # Warn if buffer is getting large (should be flushed by middleware)
            if len(self._buffer) > self._buffer_size:
                sys.stderr.write(f"Warning: Log buffer size exceeded {self._buffer_size}\n")
        except Exception:
            self.handleError(record)

    def get_and_clear_buffer(self) -> list[dict]:
        """Get buffered logs and clear buffer. Thread-safe."""
        logs = self._buffer.copy()
        self._buffer.clear()
        return logs

    def flush_to_storage(self, storage) -> int:
        """Flush buffer to storage synchronously. Returns count flushed."""
        logs = self.get_and_clear_buffer()
        if not logs:
            return 0
        # Note: This should be called from async context
        return len(logs)


# Global database handler reference
_db_handler: Optional[DatabaseLogHandler] = None


def setup_logging(
    log_dir: str = "logs",
    log_level: str = "INFO",
    max_bytes: int = 10 * 1024 * 1024,  # 10MB
    backup_count: int = 5
) -> DatabaseLogHandler:
    """
    Configure application logging.

    Args:
        log_dir: Directory for log files
        log_level: Minimum log level (DEBUG, INFO, WARNING, ERROR)
        max_bytes: Max size per log file before rotation
        backup_count: Number of backup files to keep

    Returns:
        DatabaseLogHandler for middleware use
    """
    global _db_handler

    # Create logs directory
    log_path = Path(log_dir)
    log_path.mkdir(exist_ok=True)

    # Get root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level.upper()))

    # Clear existing handlers to avoid duplicates
    root_logger.handlers.clear()

    # Console handler (human-readable format)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_format = logging.Formatter(
        "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%H:%M:%S"
    )
    console_handler.setFormatter(console_format)
    root_logger.addHandler(console_handler)

    # File handler (JSON format, rotating)
    file_handler = RotatingFileHandler(
        log_path / "app.log",
        maxBytes=max_bytes,
        backupCount=backup_count,
        encoding='utf-8'
    )
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(JSONFormatter())
    root_logger.addHandler(file_handler)

    # Database handler for persistence
    _db_handler = DatabaseLogHandler()
    _db_handler.setLevel(logging.INFO)
    _db_handler.setFormatter(logging.Formatter("%(message)s"))
    root_logger.addHandler(_db_handler)

    # Quiet down noisy loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(logging.WARNING)
    logging.getLogger("aiosqlite").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)

    return _db_handler


def get_db_handler() -> Optional[DatabaseLogHandler]:
    """Get the global database log handler."""
    return _db_handler


def generate_request_id() -> str:
    """Generate a unique 8-character request ID."""
    return str(uuid.uuid4())[:8]


def get_logger(name: str) -> logging.Logger:
    """Get a logger with the specified name."""
    return logging.getLogger(name)


def log_with_extra(logger: logging.Logger, level: int, message: str, **extra):
    """Log a message with extra structured data."""
    record = logger.makeRecord(
        logger.name, level, "", 0, message, (), None
    )
    record.extra_data = extra
    logger.handle(record)
