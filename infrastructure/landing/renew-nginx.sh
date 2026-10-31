#!/usr/bin/env bash
# Managed by makan landing
set -Eeuo pipefail
/usr/sbin/nginx -t
/usr/bin/systemctl reload nginx
