"""Bounded retention cycles, single operator lock and a private health heartbeat."""

import argparse
import json
import logging
import os
import signal
import threading
from datetime import UTC, datetime, timedelta
from pathlib import Path

from sqlalchemy import delete, select, tuple_
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.db.session import build_engine
from app.models import LearningView
from app.services.analytics import purge as analytics_purge
from app.services.auth import now_utc
from app.services.auth_maintenance import cleanup_expired
from app.services.crm import automations, purge_schools
from app.services.leads import purge as leads_purge

LOCK = 74120410
INTERVAL = 3600


def learning_purge(session):
    columns = (LearningView.content_id, LearningView.viewer_digest, LearningView.day)
    expired = select(*columns).where(LearningView.expires_at < now_utc()).limit(500)
    return {
        "deleted": session.execute(
            delete(LearningView).where(tuple_(*columns).in_(expired))
        ).rowcount
    }


def cycle(engine, max_batches=100):
    result = {}
    with engine.connect() as lock:
        if not lock.exec_driver_sql(f"SELECT pg_try_advisory_lock({LOCK})").scalar():
            return {"skipped_lock": True}
        try:
            jobs = {
                "auth": lambda s: cleanup_expired(s, now_utc(), 500),
                "learning": learning_purge,
                "leads": lambda s: leads_purge(s, 500),
                "analytics": analytics_purge,
                "crm_retention": purge_schools,
                "crm_automations": automations,
            }
            for name, job in jobs.items():
                totals = {}
                for _ in range(max_batches):
                    with Session(engine) as session, session.begin():
                        batch = job(session)
                    for key, value in batch.items():
                        totals[key] = totals.get(key, 0) + value
                    if not any(batch.values()):
                        break
                else:
                    raise RuntimeError("Retention backlog exceeds the bounded cycle")
                result[name] = totals
        finally:
            lock.exec_driver_sql(f"SELECT pg_advisory_unlock({LOCK})")
    return result


def healthy(path: Path, now=None):
    try:
        state = json.loads(path.read_text(encoding="utf-8"))
        last = datetime.fromisoformat(state["last_success"])
        age = (now or datetime.now(UTC)) - last
        return state["status"] == "ok" and timedelta(0) <= age <= timedelta(seconds=INTERVAL * 2)
    except (OSError, ValueError, KeyError, TypeError):
        return False


def write_state(path: Path, state):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(state) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--state-file", type=Path, default=Path("/srv/operations/maintenance.json"))
    parser.add_argument("--once", action="store_true")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    if args.check:
        raise SystemExit(0 if healthy(args.state_file) else 2)
    stop = threading.Event()
    for sig in (signal.SIGINT, signal.SIGTERM):
        signal.signal(sig, lambda *_: stop.set())
    engine = build_engine(Settings())
    try:
        while not stop.is_set():
            delay = INTERVAL
            try:
                result = cycle(engine)
                if not result.get("skipped_lock"):
                    state = {
                        "status": "ok",
                        "last_success": now_utc().isoformat(),
                        "counts": result,
                    }
                    write_state(args.state_file, state)
                    print(json.dumps(state), flush=True)
            except Exception:
                delay = 30
                # DB exceptions may contain connection details; emit a fixed public event only.
                write_state(args.state_file, {"status": "error"})
                logging.getLogger("makan.operations").error("maintenance_failed")
                if args.once:
                    raise SystemExit(2) from None
            if args.once or stop.wait(delay):
                break
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
