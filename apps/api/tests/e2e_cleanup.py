import os
import re
from pathlib import Path

import psycopg
from psycopg import sql
from sqlalchemy.engine import make_url

root = Path(__file__).resolve().parents[3]
marker = root / ".preview/e2e-db-name.txt"
control = make_url(os.environ["TEST_DATABASE_ADMIN_URL"])
if control.host != "127.0.0.1" or control.port != 15432 or control.database != "makan_test_control":
    raise RuntimeError("Unsafe cleanup control instance")
if marker.exists():
    name = marker.read_text(encoding="utf-8").strip()
    if not re.fullmatch(r"makan_test_e2e_[0-9a-f]{32}", name):
        raise RuntimeError("Unsafe E2E cleanup target")
    with psycopg.connect(
        control.set(drivername="postgresql").render_as_string(hide_password=False), autocommit=True
    ) as connection:
        connection.execute(
            sql.SQL("DROP DATABASE IF EXISTS {} WITH (FORCE)").format(sql.Identifier(name))
        )
    marker.unlink()
