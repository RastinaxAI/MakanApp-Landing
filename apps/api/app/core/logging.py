import json
import logging
from datetime import UTC, datetime


class SafeJsonFormatter(logging.Formatter):
    """Only explicit metadata is emitted; exception text and payloads are excluded."""

    def format(self, record: logging.LogRecord) -> str:
        data = {
            "timestamp": datetime.now(UTC).isoformat(),
            "level": record.levelname,
            "event": (
                "request_completed"
                if record.name == "makan.api" and record.msg == "request_completed"
                else "server_log"
            ),
        }
        for key in ("trace_id", "method", "route", "status", "duration_ms", "error_code"):
            if hasattr(record, key):
                data[key] = getattr(record, key)
        return json.dumps(data, ensure_ascii=False)


def configure_logging() -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(SafeJsonFormatter())
    logger = logging.getLogger("makan.api")
    logger.handlers = [handler]
    logger.setLevel(logging.INFO)
    logger.propagate = False
    for name in ("uvicorn.error", "uvicorn.access"):
        server_logger = logging.getLogger(name)
        server_logger.handlers = [handler]
        server_logger.propagate = False
