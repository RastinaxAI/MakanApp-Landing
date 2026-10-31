#!/usr/bin/env bash
set -e
set -E
set -u
set -o pipefail
umask 077

echo 'MakanApp: Next.js + Docker deployment v3'

if [ "$(id -u)" -ne 0 ]; then
    echo 'Run as root: sudo bash setup.sh' >&2
    exit 1
fi

PROJECT_DIR="${PROJECT_DIR:-/var/www/makanapp/landing}"
ENV_FILE="${ENV_FILE:-/etc/makanapp/production.env}"
RUNTIME_DIR=/etc/makanapp
RUNTIME_COMPOSE="$RUNTIME_DIR/compose.nginx.json"
CURRENT_STEP=initialization
JOB_CONTAINER=
LOG_PID=
PROGRESS_PID=

step() {
    CURRENT_STEP="$1"
    printf '\n[%s] %s\n' "$(date +%H:%M:%S)" "$CURRENT_STEP"
}

# Prevent two copies from changing the schema or Nginx at the same time.
exec 9>/var/lock/makanapp-setup.lock
if ! flock -n 9; then
    echo 'Another setup.sh is running. Wait for it to finish before retrying.' >&2
    exit 1
fi

if [ ! -f "$PROJECT_DIR/compose.production.yaml" ] || [ ! -f "$PROJECT_DIR/apps/web/package.json" ]; then
    echo "Project source is missing from $PROJECT_DIR (compose.production.yaml and apps/web are required)." >&2
    exit 1
fi

export DEBIAN_FRONTEND=noninteractive
export NEEDRESTART_MODE=a
export COMPOSE_PARALLEL_LIMIT=1
step '1/9 Preparing system dependencies'
if [ "${SKIP_SYSTEM_UPDATE:-0}" != 1 ]; then
    apt-get update
    apt-get upgrade -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold"
    apt-get install -y nginx ufw certbot python3-certbot-nginx python3 curl
    if ! docker compose version >/dev/null 2>&1; then
        apt-get install -y docker.io docker-compose-v2
    fi
fi
for dependency in nginx ufw certbot python3 curl docker timeout; do
    if ! command -v "$dependency" >/dev/null; then
        echo "Missing $dependency. Rerun without SKIP_SYSTEM_UPDATE=1." >&2
        exit 1
    fi
done
docker compose version
systemctl enable --now docker
docker info >/dev/null
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
install -d -m 700 "$RUNTIME_DIR" "$(dirname "$ENV_FILE")"

step '2/9 Loading credentials and preparing Compose'

# Keep existing credentials. Never reset passwords for an existing database.
if [ ! -f "$ENV_FILE" ]; then
    if [ -n "$(docker volume ls --filter label=com.docker.compose.project=makan-landing-prod --format '{{.Name}}')" ]; then
        echo 'Existing production volumes found. Set ENV_FILE to their original production.env and rerun.' >&2
        exit 1
    fi
    python3 - "$PROJECT_DIR/.env.production.example" "$ENV_FILE" <<'PY'
import re
import secrets
import sys
from pathlib import Path

values = {
    key: secrets.token_hex(32) for key in (
        'POSTGRES_PASSWORD', 'MIGRATION_DB_PASSWORD', 'API_DB_PASSWORD',
        'AUTH_SECRET', 'AUTH_MFA_KEY', 'PROXY_SHARED_SECRET', 'BACKUP_ENCRYPTION_KEY',
    )
}
values.update(
    SITE_DOMAIN='makanapp.org', PUBLIC_ORIGIN='https://makanapp.org',
    PUBLIC_POLICY_APPROVED='true',
)
content = Path(sys.argv[1]).read_text()
for key, value in values.items():
    content = re.sub(rf'(?m)^{key}=.*$', lambda _: f'{key}={value}', content)
with Path(sys.argv[2]).open('x') as output:
    output.write(content)
PY
fi
chmod 600 "$ENV_FILE"

# Render the repository's real production stack, then use host Nginx as its edge.
# The resolved file contains credentials and stays outside the public directory.
docker compose --env-file "$ENV_FILE" -f "$PROJECT_DIR/compose.production.yaml" \
    --profile tools config --format json > "$RUNTIME_DIR/compose.source.json"
python3 - "$RUNTIME_DIR/compose.source.json" "$RUNTIME_COMPOSE" <<'PY'
import json
import sys
from pathlib import Path

config = json.loads(Path(sys.argv[1]).read_text())
services = config['services']
services.pop('caddy', None)
for service, port in (('web', 3000), ('api', 8000)):
    services[service]['ports'] = [{
        'target': port, 'published': str(port), 'host_ip': '127.0.0.1',
        'protocol': 'tcp',
    }]
# Give the web container a non-internal network for the loopback publication.
services['web']['networks']['edge'] = None
Path(sys.argv[2]).write_text(json.dumps(config, indent=2))
Path(sys.argv[1]).unlink()
PY

compose() {
    docker compose --project-directory "$PROJECT_DIR" -f "$RUNTIME_COMPOSE" "$@"
}
cleanup_job() {
    # Stop only a temporary task created by this invocation, including on Ctrl+C.
    if [ -n "$JOB_CONTAINER" ]; then
        docker stop --time 10 "$JOB_CONTAINER" >/dev/null 2>&1 || true
    fi
    for child_pid in "$LOG_PID" "$PROGRESS_PID"; do
        if [ -n "$child_pid" ]; then
            kill "$child_pid" 2>/dev/null || true
            wait "$child_pid" 2>/dev/null || true
        fi
    done
    LOG_PID=
    PROGRESS_PID=
}

report_failure() {
    trap - ERR
    echo "Deployment stopped at: $CURRENT_STEP" >&2
    compose ps -a >&2 || true
    compose logs --tail 40 db api web >&2 || true
    # Show wait reasons and blocking PIDs, without dumping SQL or secrets.
    compose exec -T -e PGCONNECT_TIMEOUT=5 -e 'PGOPTIONS=-c statement_timeout=5000' db sh -c 'psql -U postgres -d "$POSTGRES_DB" -c "SELECT pid, usename, state, wait_event_type, wait_event, pg_blocking_pids(pid) AS blocked_by FROM pg_stat_activity WHERE datname = current_database();"' >&2 || true
}
trap report_failure ERR
trap cleanup_job EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
compose --profile tools config --quiet

run_job() {
    local label="$1" limit="$2" service="$3"
    shift 3
    local task_name="makan-setup-${label}-$$" exit_code wait_status=0
    # db has already passed its health check; avoid a second implicit startup.
    JOB_CONTAINER=$(compose --profile tools run -d --no-deps --no-build \
        --pull never -T --name "$task_name" "$service" "$@")
    docker logs --follow "$JOB_CONTAINER" 9>&- &
    LOG_PID=$!
    (
        exec 9>&-
        elapsed=0
        while sleep 15; do
            elapsed=$((elapsed + 15))
            echo "[$label] still running: ${elapsed}s (limit ${limit}s)"
        done
    ) &
    PROGRESS_PID=$!
    if exit_code=$(timeout "${limit}s" docker wait "$JOB_CONTAINER"); then
        wait_status=0
    else
        wait_status=$?
    fi
    if [ "$wait_status" -ne 0 ]; then
        echo "[$label] wait failed (status $wait_status); stopping task $task_name." >&2
        cleanup_job
        docker logs --tail 80 "$JOB_CONTAINER" >&2 || true
        JOB_CONTAINER=
        return 1
    fi
    # Flush the final container log lines before stopping the progress reporter.
    wait "$LOG_PID" || true
    LOG_PID=
    cleanup_job
    if [ "$exit_code" != 0 ]; then
        echo "[$label] exited with status $exit_code. Inspect with: docker logs $task_name" >&2
        JOB_CONTAINER=
        return 1
    fi
    docker rm "$JOB_CONTAINER" >/dev/null
    JOB_CONTAINER=
    echo "[$label] completed"
}

step '3/9 Building Docker images'
if [ "${SKIP_BUILD:-0}" = 1 ]; then
    echo 'Reusing previously built images (SKIP_BUILD=1).'
else
    compose build db api web
fi
step '4/9 Waiting for PostgreSQL (maximum 180 seconds)'
compose up -d --no-build --wait --wait-timeout 180 db
step '5/9 Applying database migrations (maximum 300 seconds)'
run_job migrate 300 migrate python -u -c 'import logging; logging.basicConfig(level=logging.INFO); from alembic.config import main; main(argv=["upgrade", "head"])'
step '6/9 Preparing CRM links and landing content'
run_job crm 180 api python -u -m app.commands.crm_backfill
run_job content 300 api python -u -m app.commands.import_content
step '7/9 Starting API, Next.js and maintenance (maximum 300 seconds)'
compose up -d --no-build --wait --wait-timeout 300 api web maintenance
curl --connect-timeout 5 --max-time 30 --fail --silent --show-error http://127.0.0.1:8000/api/v1/health/ready >/dev/null
curl --connect-timeout 5 --max-time 30 --fail --silent --show-error http://127.0.0.1:3000/health/ready >/dev/null
curl --connect-timeout 5 --max-time 30 --fail --silent --show-error -H 'Host: makanapp.org' http://127.0.0.1:3000/ >/dev/null

step '8/9 Connecting Nginx and configuring HTTPS'
# Keep a copy of the currently working site, including existing SSL settings.
BACKUP_DIR="$RUNTIME_DIR/nginx-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
if [ -f /etc/nginx/sites-available/makanapp.conf ]; then
    cp -a /etc/nginx/sites-available/makanapp.conf "$BACKUP_DIR/makanapp.conf"
fi
if [ -e /etc/nginx/sites-enabled/default ] || [ -L /etc/nginx/sites-enabled/default ]; then
    mv /etc/nginx/sites-enabled/default "$BACKUP_DIR/default"
fi

python3 - "$RUNTIME_COMPOSE" <<'PY'
import json
from pathlib import Path
import re
import sys

key = json.loads(Path(sys.argv[1]).read_text())['services']['api']['environment']['PROXY_SHARED_SECRET']
if not re.fullmatch(r'[a-f0-9]{64}', key):
    raise SystemExit('Invalid PROXY_SHARED_SECRET; refusing to write Nginx configuration.')
config = r'''server {
    listen 80;
    listen [::]:80;
    server_name makanapp.org;
    client_max_body_size 6m;

    gzip on;
    gzip_vary on;
    gzip_types text/css application/javascript application/json image/svg+xml;

    location ~ /\. {
        deny all;
    }

    location /api/v1/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Makan-Proxy-Key __PROXY_KEY__;
        proxy_set_header X-Makan-Client-IP $remote_addr;
        proxy_connect_timeout 3s;
        proxy_read_timeout 30s;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header Connection "";
        proxy_buffering off;
        proxy_read_timeout 60s;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name www.makanapp.org;
    return 301 https://makanapp.org$request_uri;
}
'''
Path('/etc/nginx/sites-available/makanapp.conf').write_text(config.replace('__PROXY_KEY__', key))
PY
chmod 600 /etc/nginx/sites-available/makanapp.conf
ln -sfn /etc/nginx/sites-available/makanapp.conf /etc/nginx/sites-enabled/makanapp.conf
if ! nginx -t; then
    if [ -f "$BACKUP_DIR/makanapp.conf" ]; then
        cp -a "$BACKUP_DIR/makanapp.conf" /etc/nginx/sites-available/makanapp.conf
    fi
    if [ -e "$BACKUP_DIR/default" ] || [ -L "$BACKUP_DIR/default" ]; then
        mv "$BACKUP_DIR/default" /etc/nginx/sites-enabled/default
    fi
    exit 1
fi
# Certbot reinstates HTTPS in the generated proxy configuration before reload.
# Keep the currently loaded site serving while certificates are prepared.
systemctl enable nginx
if ! systemctl is-active --quiet nginx; then
    systemctl start nginx
fi
if ! certbot --nginx --non-interactive --agree-tos --redirect \
    -m rastinaxoffice@gmail.com -d makanapp.org -d www.makanapp.org; then
    if [ -f "$BACKUP_DIR/makanapp.conf" ]; then
        cp -a "$BACKUP_DIR/makanapp.conf" /etc/nginx/sites-available/makanapp.conf
        nginx -t && systemctl reload nginx
    fi
    exit 1
fi
nginx -t
systemctl reload nginx
step '9/9 Checking the public HTTPS landing page'
curl --connect-timeout 5 --max-time 30 --fail --silent --show-error --resolve makanapp.org:443:127.0.0.1 https://makanapp.org/ >/dev/null
compose ps
echo 'Landing deployed: https://makanapp.org (www uses the same application).'
