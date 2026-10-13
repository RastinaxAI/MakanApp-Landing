"""Exercise the built API image with a disposable real DB and named media volume.

No fixture account or image is written to the development database/media volume.
Credentials are forwarded using process environment variable names, never CLI values.
"""

import hashlib
import json
import os
import re
import subprocess
import time
from pathlib import Path
from uuid import uuid4

import httpx
import psycopg
from psycopg import sql
from sqlalchemy.engine import make_url

ROOT = Path(__file__).resolve().parents[1]
values = {}
for line in (ROOT / ".env.test").read_text().splitlines():
    match = re.fullmatch(r"([A-Z_]+)=([a-f0-9]{64})", line)
    if match:
        values[match[1]] = match[2]
name = "makan_test_cms_docker_" + uuid4().hex
container = "makan-cms-acceptance-" + uuid4().hex
volume = container + "-media"
environment = {
    **os.environ,
    "AUTH_SECRET": values["AUTH_SECRET"],
    "AUTH_MFA_KEY": values["AUTH_MFA_KEY"],
    "APP_ENV": "test",
    "MEDIA_ROOT": "/srv/media",
    "AUTH_ALLOWED_ORIGINS": '["http://127.0.0.1:18100"]',
}
control = make_url(
    f"postgresql://postgres:{values['POSTGRES_PASSWORD']}@127.0.0.1:15432/makan_test_control"
)
owner = control.set(
    drivername="postgresql+psycopg",
    host="db-test",
    port=5432,
    database=name,
    username="makan_migrator",
    password=values["MIGRATION_DB_PASSWORD"],
)
runtime = owner.set(username="makan_api", password=values["API_DB_PASSWORD"])
image = "makan-landing-dev-api"
network = "makan-landing-test_default"
evidence = {"database_fixture": True, "account_fixture_only": True}


def docker(*arguments, input=None):
    result = subprocess.run(
        ["docker", *arguments],
        check=False,
        env=environment,
        input=input,
        text=True,
        capture_output=True,
        cwd=ROOT,
    )
    if result.returncode:
        # Private diagnostics may include upstream connection errors; do not print credentials.
        (ROOT / ".preview/cms-docker-error.log").write_text(
            result.stderr, encoding="utf-8"
        )
        raise RuntimeError(
            "Docker CMS acceptance failed; inspect private .preview diagnostics"
        )
    return result.stdout


try:
    with psycopg.connect(
        control.render_as_string(hide_password=False), autocommit=True
    ) as db:
        db.execute(
            sql.SQL("CREATE DATABASE {} OWNER makan_migrator").format(
                sql.Identifier(name)
            )
        )
        db.execute(
            sql.SQL("GRANT CONNECT ON DATABASE {} TO makan_api").format(
                sql.Identifier(name)
            )
        )
    with psycopg.connect(
        owner.set(
            drivername="postgresql", host="127.0.0.1", port=15432
        ).render_as_string(hide_password=False)
    ) as db:
        db.execute("REVOKE ALL ON SCHEMA public FROM PUBLIC")
        db.execute("ALTER SCHEMA public OWNER TO makan_migrator")
        db.execute("GRANT USAGE ON SCHEMA public TO makan_api")
    environment["DATABASE_URL"] = owner.render_as_string(hide_password=False)
    docker(
        "run",
        "--rm",
        "--network",
        network,
        "-e",
        "DATABASE_URL",
        "-e",
        "AUTH_SECRET",
        "-e",
        "AUTH_MFA_KEY",
        image,
        "alembic",
        "upgrade",
        "head",
    )
    password = uuid4().hex + uuid4().hex
    environment["CMS_FIXTURE_PASSWORD"] = password
    setup = 'import os; from sqlalchemy.orm import Session; from app.core.config import Settings; from app.core.security import Security; from app.db.session import build_engine; from app.models import Admin; s=Settings(); e=build_engine(s); db=Session(e); db.add(Admin(email="docker-fixture@example.com",role="owner",password_hash=Security(s).hasher.hash(os.environ["CMS_FIXTURE_PASSWORD"]))); db.commit(); db.close(); e.dispose()'
    docker(
        "run",
        "--rm",
        "--network",
        network,
        "-e",
        "DATABASE_URL",
        "-e",
        "AUTH_SECRET",
        "-e",
        "AUTH_MFA_KEY",
        "-e",
        "CMS_FIXTURE_PASSWORD",
        image,
        "python",
        "-c",
        setup,
    )
    environment["DATABASE_URL"] = runtime.render_as_string(hide_password=False)
    docker("volume", "create", volume)
    start_arguments = (
        "run",
        "-d",
        "--name",
        container,
        "--network",
        network,
        "--read-only",
        "--tmpfs",
        "/tmp",
        "--cap-drop",
        "ALL",
        "--security-opt",
        "no-new-privileges:true",
        "-p",
        "127.0.0.1:18100:8000",
        "-v",
        f"{volume}:/srv/media",
        *[
            item
            for key in (
                "DATABASE_URL",
                "AUTH_SECRET",
                "AUTH_MFA_KEY",
                "APP_ENV",
                "MEDIA_ROOT",
                "AUTH_ALLOWED_ORIGINS",
            )
            for item in ("-e", key)
        ],
        image,
    )
    docker(*start_arguments)
    with httpx.Client(base_url="http://127.0.0.1:18100", timeout=10) as client:

        def ready():
            for _ in range(60):
                try:
                    if client.get("/api/v1/health/ready").status_code == 200:
                        return
                except httpx.HTTPError:
                    pass
                time.sleep(0.5)
            raise RuntimeError("Docker API did not become ready")

        def headers():
            token = client.get("/api/v1/admin/auth/csrf").json()["csrf_token"]
            return {"Origin": "http://127.0.0.1:18100", "X-CSRF-Token": token}

        ready()
        assert (
            client.post(
                "/api/v1/admin/auth/login",
                headers=headers(),
                json={"email": "docker-fixture@example.com", "password": password},
            ).status_code
            == 200
        )
        upload = client.post(
            "/api/v1/admin/media",
            headers=headers(),
            data={"alt_text": "Docker persistence fixture"},
            files={
                "file": (
                    "fixture.png",
                    (ROOT / "apps/web/tests/fixtures/cms.png").read_bytes(),
                    "image/png",
                )
            },
        )
        assert upload.status_code == 201
        media = upload.json()
        mid = media["id"]
        assert client.get(f"/api/v1/media/{mid}/file").status_code == 404
        h = headers()
        h["If-Match"] = "1"
        page = client.post(
            "/api/v1/admin/pages",
            headers=headers(),
            json={
                "slug": "docker-persistence",
                "title": "Acceptance fixture",
                "payload": {
                    "kind": "page",
                    "headline": "Persistent page",
                    "summary": "Fixture only",
                    "sections": [{"type": "gallery", "media_id": mid}],
                },
            },
        ).json()
        assert (
            client.post(
                f"/api/v1/admin/pages/{page['id']}/publish",
                headers=h,
                json={"revision_id": page["revision_id"]},
            ).status_code
            == 200
        )

        def create_learning(resource, slug, kind, **extra):
            response = client.post(
                "/api/v1/admin/" + resource,
                headers=headers(),
                json={
                    "slug": slug,
                    "title": slug,
                    "payload": {
                        "kind": kind,
                        "headline": slug,
                        "summary": "Docker isolated acceptance fixture",
                        "audiences": ["teacher"],
                        "body_html": "<h2>Steps</h2><p>Persistent real fixture</p>",
                        **extra,
                    },
                },
            )
            assert response.status_code == 201, response.text
            item = response.json()
            publish_headers = headers()
            publish_headers["If-Match"] = str(item["row_version"])
            published = client.post(
                f"/api/v1/admin/{resource}/{item['id']}/publish",
                headers=publish_headers,
                json={"revision_id": item["revision_id"]},
            )
            assert published.status_code == 200, published.text
            return item

        article = create_learning(
            "learn/contents",
            "docker-article",
            "article",
            cover_media_id=mid,
            featured=True,
        )
        video = create_learning(
            "learn/contents",
            "docker-video",
            "video",
            cover_media_id=mid,
            aparat_id="abc12",
            duration_seconds=95,
        )
        series = create_learning(
            "learn/series",
            "docker-series",
            "series",
            item_ids=[article["id"], video["id"]],
        )

        def check_learning():
            assert (
                client.get("/api/v1/learn/contents/docker-article").json()["id"]
                == article["id"]
            )
            assert (
                client.get("/api/v1/learn/contents/docker-video").json()["payload"][
                    "duration_seconds"
                ]
                == 95
            )
            assert [
                i["id"]
                for i in client.get("/api/v1/learn/series/docker-series").json()[
                    "items"
                ]
            ] == [article["id"], video["id"]]
            assert (
                client.get("/api/v1/learn/contents?featured=true").json()["pagination"][
                    "total"
                ]
                == 1
            )

        check_learning()

        before = client.get(f"/api/v1/media/{mid}/file")
        assert before.status_code == 200
        digest = hashlib.sha256(before.content).hexdigest()
        evidence.update(
            {
                "migration_head": "0005_learning",
                "uid": docker("exec", container, "id", "-u").strip(),
                "readonly_root": True,
                "caps_dropped": True,
                "private_before_publish": True,
                "sha256_before": digest,
                "dimensions": [media["width"], media["height"]],
            }
        )
        docker("restart", container)
        ready()
        check_learning()
        evidence["learning_article_video_series_survive_restart"] = True
        after = client.get(f"/api/v1/media/{mid}/file")
        assert (
            after.status_code == 200
            and hashlib.sha256(after.content).hexdigest() == digest
        )
        assert (
            client.get("/api/v1/pages/docker-persistence").json()["payload"]["headline"]
            == "Persistent page"
        )
        docker("rm", "-f", container)
        docker(*start_arguments)
        ready()
        check_learning()
        evidence["learning_article_video_series_survive_recreate"] = True
        recreated = client.get(f"/api/v1/media/{mid}/file")
        assert (
            recreated.status_code == 200
            and hashlib.sha256(recreated.content).hexdigest() == digest
        )
        assert (
            client.get("/api/v1/pages/docker-persistence").json()["payload"]["headline"]
            == "Persistent page"
        )
        evidence["media_and_content_survive_container_recreate"] = True
        assert client.get("/api/v1/admin/auth/me").status_code == 200
        evidence.update(
            {
                "media_and_content_survive_restart": True,
                "session_survives_restart": True,
                "mime": after.headers["content-type"],
                "sha256_after": hashlib.sha256(after.content).hexdigest(),
                "status": "passed",
            }
        )
finally:
    # Only the exact two randomly named fixtures created above are removed.
    subprocess.run(["docker", "rm", "-f", container], capture_output=True, check=False)
    subprocess.run(["docker", "volume", "rm", volume], capture_output=True, check=False)
    if (
        subprocess.run(
            ["docker", "inspect", container], capture_output=True, check=False
        ).returncode
        == 0
        or subprocess.run(
            ["docker", "volume", "inspect", volume], capture_output=True, check=False
        ).returncode
        == 0
    ):
        raise RuntimeError("Docker fixture cleanup incomplete")
    with psycopg.connect(
        control.render_as_string(hide_password=False), autocommit=True
    ) as db:
        db.execute(
            sql.SQL("DROP DATABASE IF EXISTS {} WITH (FORCE)").format(
                sql.Identifier(name)
            )
        )
    evidence["fixture_cleanup"] = True
    (ROOT / "docs/qa/step7/docker-persistence.json").write_text(
        json.dumps(evidence, indent=2) + "\n", encoding="utf-8"
    )
print("CMS Docker acceptance passed; disposable database, account and volume removed.")
