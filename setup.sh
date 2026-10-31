#!/usr/bin/env bash
set -e
set -u
set -o pipefail

if [ "$(id -u)" -ne 0 ]; then
    echo "Run this script as root: sudo ./setup.sh" >&2
    exit 1
fi

export DEBIAN_FRONTEND=noninteractive
export NEEDRESTART_MODE=a

apt-get update
apt-get upgrade -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold"
apt-get install -y nginx ufw certbot python3-certbot-nginx

ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

mkdir -p /var/www/makanapp/landing

create_placeholder() {
    local directory="$1"
    local title="$2"
    if [ ! -e "$directory/index.html" ]; then
        cat > "$directory/index.html" <<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>$title</title>
</head>
<body><h1>$title</h1></body>
</html>
HTML
    fi
}

create_placeholder /var/www/makanapp/landing 'MakanApp - Landing'

chown -R www-data:www-data /var/www/makanapp
chmod -R 755 /var/www/makanapp

cat > /etc/nginx/sites-available/makanapp.conf <<'NGINX'
server {
    listen 80;
    listen [::]:80;
    server_name makanapp.org www.makanapp.org;

    root /var/www/makanapp/landing;
    index index.html;

    gzip on;
    gzip_vary on;
    gzip_min_length 256;
    gzip_types text/css text/plain text/javascript application/javascript application/json application/manifest+json application/xml image/svg+xml;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX

rm -f /etc/nginx/sites-enabled/default
ln -sfn /etc/nginx/sites-available/makanapp.conf /etc/nginx/sites-enabled/makanapp.conf
nginx -t
systemctl enable nginx
systemctl restart nginx

certbot --nginx --non-interactive --agree-tos --redirect -m rastinaxoffice@gmail.com -d makanapp.org -d www.makanapp.org

nginx -t
systemctl reload nginx
