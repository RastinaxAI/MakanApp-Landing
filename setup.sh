#!/usr/bin/env bash
set -e
set -u
set -o pipefail
umask 077

echo 'MakanApp: Next.js + Docker deployment v2'

if [ "$(id -u)" -ne 0 ]; then
    echo 'Run as root: sudo bash setup.sh' >&2
    exit 1
fi

PROJECT_DIR="${PROJECT_DIR:-/var/www/makanapp/landing}"
ENV_FILE="${ENV_FILE:-/etc/makanapp/production.env}"
RUNTIME_DIR=/etc/makanapp
RUNTIME_COMPOSE="$RUNTIME_DIR/compose.nginx.json"

if [ ! -f "$PROJECT_DIR/compose.production.yaml" ] || [ ! -f "$PROJECT_DIR/apps/web/package.json" ]; then
    echo "Project source is missing from $PROJECT_DIR (compose.production.yaml and apps/web are required)." >&2
    exit 1
fi

export DEBIAN_FRONTEND=noninteractive
export NEEDRESTART_MODE=a
export COMPOSE_PARALLEL_LIMIT=1
apt-get update
apt-get upgrade -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold"
apt-get install -y nginx ufw certbot python3-certbot-nginx python3 curl
if ! docker compose version >/dev/null 2>&1; then
    apt-get install -y docker.io docker-compose-v2
fi
systemctl enable --now docker
docker info >/dev/null
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
install -d -m 700 "$RUNTIME_DIR" "$(dirname "$ENV_FILE")"

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
trap 'echo "Deployment stopped. Read the error above. Service status:" >&2; compose ps >&2 || true' ERR
compose --profile tools config --quiet

# Build before changing the current Nginx site.
compose build db api web
compose up -d --wait --wait-timeout 180 db
compose --profile tools run --rm migrate
compose run --rm --no-deps api python -m app.commands.crm_backfill
compose run --rm --no-deps api python -m app.commands.import_content
compose up -d --no-build --wait --wait-timeout 300 api web maintenance
curl --fail --silent --show-error http://127.0.0.1:8000/api/v1/health/ready >/dev/null
curl --fail --silent --show-error http://127.0.0.1:3000/health/ready >/dev/null
curl --fail --silent --show-error -H 'Host: makanapp.org' http://127.0.0.1:3000/ >/dev/null

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

    location ~ /\\. {
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
curl --fail --silent --show-error --resolve makanapp.org:443:127.0.0.1 https://makanapp.org/ >/dev/null
compose ps
echo 'Landing deployed: https://makanapp.org (www uses the same application).'
