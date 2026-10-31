#!/usr/bin/env bash
# Makan SSR deployment. System changes are reachable only through an explicit SSH target.
set -Eeuo pipefail
umask 027
STAGE='اعتبارسنجی ورودی'; NEXT='فرمان --help را بخوانید.'
ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
HOST='' SSH_USER='' SSH_PORT='' EMAIL='' KNOWN_HOSTS='' CONTROL_PATH='' IDENTITY='' REMOTE=false DIRECT=false
BASE=/opt/makan
fail() { printf 'خطا در %s: %s\nاقدام بعدی: %s\n' "$STAGE" "$1" "$NEXT" >&2; return 1; }
on_error() {
    local code=$? line=$1
    trap - ERR
    printf 'مرحلهٔ ناموفق: %s؛ خط %s؛ کد %s\nاقدام بعدی: %s\n' "$STAGE" "$line" "$code" "$NEXT" >&2
    exit "$code"
}
trap 'on_error "$LINENO"' ERR
usage() {
    cat <<'HELP'
استقرار همین مخزن برای https://makanapp.org — فقط دامنهٔ اصلی
روش اصلی: دریافت پروژه با Git و اجرای مستقیم روی VPS.

روش Git: پروژه را روی VPS clone کنید و در همان VPS، با root یا کاربر دارای sudo اجرا کنید:
  bash deploy-landing.sh all --on-server --host VPS_IP --user root --port SSH_PORT --email EMAIL
  bash deploy-landing.sh deploy --on-server --host VPS_IP --user root --port SSH_PORT
در این روش هیچ کلید یا اتصال SSH از رایانهٔ اجراکنندهٔ Codex لازم نیست.
--on-server پیش از هر تغییر، تطابق IPv4 مقصد با IP واقعی دستگاه را بررسی می‌کند.

  bash deploy-landing.sh inspect
  bash deploy-landing.sh server-check --host IP --user USER --port PORT
  bash deploy-landing.sh prepare      --host IP --user USER --port PORT
  bash deploy-landing.sh deploy       --host IP --user USER --port PORT
  bash deploy-landing.sh https        --host IP --user USER --port PORT --email EMAIL
  bash deploy-landing.sh verify       --host IP --user USER --port PORT
  bash deploy-landing.sh renew-test   --host IP --user USER --port PORT
  bash deploy-landing.sh rollback     --host IP --user USER --port PORT

inspect: فقط بررسی محلی؛ نصب یا تغییر سیستم ندارد.
server-check: شناسایی خواندنی VPS، Ubuntu، منابع، پورت‌ها، سرویس‌ها و sudo.
prepare: نصب بسته‌های ضروری از apt همان Ubuntu، runtime پین‌شده و تنظیم خصوصی.
deploy: انتقال سورس بدون اسرار، npm ci و uv sync غیرریشه، build، snapshot، انتشار.
https: مستقل از build؛ HTTP-01، نگهداری گواهی معتبر و آزمون تمدید.
verify: بررسی origin و دامنهٔ عمومی؛ HTTPS باید از قبل فعال شده باشد.
renew-test: تمدید آزمایشی؛ پیش و پس از فعال‌شدن CDN اجرا شود.
rollback: تعویض نسخهٔ فعال و قبلی؛ فقط در صورت یکسان‌بودن schema دیتابیس.

ورودی‌ها: --host IPv4 عمومی واقعی VPS؛ --user کاربر SSH؛ --port پورت واقعی 1..65535.
ایمیل واقعی فقط برای https لازم است. هیچ پورت SSH پیش‌فرضی وجود ندارد.
SSH agent/کلید و known_hosts باید از قبل آماده باشند. رمز/کلید خصوصی دریافت نمی‌شود.
کاربر SSH برای عملیات سیستمی به sudo غیرتعاملی نیاز دارد؛ root SSH نیز پشتیبانی می‌شود.
اسکریپت فایروال یا SSH را تغییر نمی‌دهد. 80 و 443 را در فایروال موجود باز کنید.
مراحل را جدا ادامه دهید؛ تأخیر DNS نیاز به build دوباره ندارد.
پیش‌نیاز محلی: Bash، Python 3، OpenSSH، tar. جزئیات و محدودیت‌ها: DEPLOY_FA.md
گزینه‌های محلی اختیاری: --known-hosts /absolute/file و --control-path /absolute/socket
کلید اختصاصیِ از پیش مجازشده: --identity /absolute/private-key-file (فقط مسیر، نه محتوای کلید)
پیکربندی عمومی SSH خوانده نمی‌شود؛ اتصال مستقیم با -F /dev/null و پارامترهای صریح است.
HELP
}
[[ $# -gt 0 ]] || { usage; exit 2; }
ACTION=$1; shift
case "$ACTION" in
    -h|--help) usage; exit 0 ;;
    all|inspect|server-check|prepare|deploy|https|verify|renew-test|rollback) ;;
    *) fail 'فرمان ناشناخته.' ;;
esac
while (($#)); do
    case "$1" in
        --remote) REMOTE=true; shift ;;
        --on-server) REMOTE=true; DIRECT=true; shift ;;
        --host|--user|--port|--email|--known-hosts|--control-path|--identity)
            [[ $# -ge 2 && -n $2 && $2 != --* ]] || fail 'مقدار گزینه خالی است.'
            case "$1" in
                --host) [[ -z $HOST ]] || fail 'گزینه تکراری.'; HOST=$2 ;;
                --user) [[ -z $SSH_USER ]] || fail 'گزینه تکراری.'; SSH_USER=$2 ;;
                --port) [[ -z $SSH_PORT ]] || fail 'گزینه تکراری.'; SSH_PORT=$2 ;;
                --email) [[ -z $EMAIL ]] || fail 'گزینه تکراری.'; EMAIL=$2 ;;
                --known-hosts) [[ -z $KNOWN_HOSTS ]] || fail 'گزینه تکراری.'; KNOWN_HOSTS=$2 ;;
                --control-path) [[ -z $CONTROL_PATH ]] || fail 'گزینه تکراری.'; CONTROL_PATH=$2 ;;
                --identity) [[ -z $IDENTITY ]] || fail 'گزینه تکراری.'; IDENTITY=$2 ;;
            esac
            shift 2 ;;
        *) fail 'گزینه ناشناخته.' ;;
    esac
done
command -v python3 >/dev/null || fail 'Python 3 لازم است.'
HELPER=$ROOT/infrastructure/landing/ops.py
[[ -f $HELPER ]] || fail 'فایل infrastructure/landing/ops.py پیدا نشد.'
if [[ $ACTION == inspect ]]; then
    [[ $REMOTE == false && -z $HOST$SSH_USER$SSH_PORT$EMAIL$KNOWN_HOSTS$CONTROL_PATH$IDENTITY ]] || fail 'inspect ورودی SSH ندارد.'
    printf 'محیط اجرای بررسی؛ hostname=%s، user=%s؛ هویت VPS در این فرمان احراز نمی‌شود.\n' "$(hostname)" "$(id -un)"
    python3 "$HELPER" inspect "$ROOT"
    exit
fi
python3 "$HELPER" validate "$HOST" "$SSH_USER" "$SSH_PORT" "$EMAIL" "$ACTION"
if [[ $REMOTE == false ]]; then
    STAGE='اتصال صریح به VPS'; NEXT='اتصال SSH، کلید میزبان و sudo را روی مقصد آماده کنید؛ بررسی کلید میزبان را غیرفعال نکنید.'
    command -v ssh >/dev/null || fail 'OpenSSH client لازم است.'
    SSH=(ssh -F /dev/null -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=15)
    if [[ -n $KNOWN_HOSTS ]]; then
        [[ $KNOWN_HOSTS == /* && -f $KNOWN_HOSTS && -r $KNOWN_HOSTS ]] || fail 'فایل known_hosts باید مطلق، موجود و خواندنی باشد.'
        SSH+=(-o "UserKnownHostsFile=$KNOWN_HOSTS")
    fi
    if [[ -n $CONTROL_PATH ]]; then
        [[ $CONTROL_PATH == /* && -S $CONTROL_PATH ]] || fail 'ControlPath باید مسیر مطلق یک اتصال SSH آماده باشد.'
        SSH+=(-o "ControlPath=$CONTROL_PATH")
    fi
    if [[ -n $IDENTITY ]]; then
        [[ $IDENTITY == /* && -f $IDENTITY && -r $IDENTITY ]] || fail 'مسیر کلید موجود و خواندنی لازم است؛ محتوای آن را در چت نفرستید.'
        SSH+=(-o IdentitiesOnly=yes -i "$IDENTITY")
    fi
    SSH+=(-p "$SSH_PORT" "$SSH_USER@$HOST")
    printf 'مبدأ محلی: %s؛ مقصد واقعی SSH: %s@%s:%s\n' "$(hostname)" "$SSH_USER" "$HOST" "$SSH_PORT"
    UPLOAD=$("${SSH[@]}" 'umask 077; mktemp -d /tmp/makan-upload.XXXXXXXX')
    [[ $UPLOAD =~ ^/tmp/makan-upload\.[a-zA-Z0-9]+$ ]] || fail 'مسیر موقت دریافتی معتبر نیست.'
    python3 "$HELPER" pack "$ROOT" "$ACTION" | "${SSH[@]}" "tar --no-same-owner -xf - -C '$UPLOAD'"
    # Inputs have been strictly validated; no secrets are transported as arguments.
    printf -v CMD 'bash %q %q --remote --host %q --user %q --port %q' "$UPLOAD/deploy-landing.sh" "$ACTION" "$HOST" "$SSH_USER" "$SSH_PORT"
    if [[ -n $EMAIL ]]; then printf -v CMD '%s --email %q' "$CMD" "$EMAIL"; fi
    "${SSH[@]}" "$CMD"
    if [[ $ACTION == verify ]]; then
        STAGE='بررسی بیرونی از رایانهٔ مبدأ'; NEXT='DNS، مسیر HTTPS و قواعد CDN را بررسی کنید.'
        python3 "$HELPER" verify "https://makanapp.org" "$HOST" origin-tls
        python3 "$HELPER" verify "https://makanapp.org" "$HOST" public
    fi
    printf 'مرحلهٔ %s تمام شد. سورس موقت فاقد اسرار: %s روی VPS\n' "$ACTION" "$UPLOAD"
    exit
fi

# Direct Git deployment is explicit and also checks the target's actual network identity.
if [[ $DIRECT == true ]]; then
    [[ -z $KNOWN_HOSTS$CONTROL_PATH$IDENTITY ]] || fail 'گزینه‌های کلید و اتصال محلی برای --on-server لازم نیستند.'
    python3 "$HELPER" server-identity "$HOST"
else
    [[ -n ${SSH_CONNECTION:-} ]] || fail 'عملیات سرور فقط داخل اتصال SSH مجاز است.'
fi
printf 'اکنون روی دستگاه مقصد هستیم: hostname=%s، user=%s، target=%s:%s\n' "$(hostname)" "$(id -un)" "$HOST" "$SSH_PORT"
STAGE='شناسایی واقعی VPS'; NEXT='نسخهٔ Ubuntu، فضای دیسک، سرویس‌های موجود و دسترسی sudo را بررسی کنید.'
# shellcheck disable=SC1091
source /etc/os-release
printf 'سیستم‌عامل واقعی: %s؛ VERSION_ID=%s\n' "$PRETTY_NAME" "$VERSION_ID"
[[ $ID == ubuntu ]] || fail 'این اسکریپت مخصوص Ubuntu است.'
df -h / /var; free -h; printf 'CPU: %s\n' "$(nproc)"
ss -lnt
systemctl --no-pager --type=service --state=running
if ((EUID == 0)); then SUDO=(); else SUDO=(sudo -n); fi
if [[ $ACTION == server-check ]]; then
    if "${SUDO[@]}" true; then printf 'دسترسی عملیات سیستمی آماده است.\n'; else fail 'sudo غیرتعاملی آماده نیست.'; fi
    if command -v ufw >/dev/null; then "${SUDO[@]}" ufw status; fi
    exit
fi
"${SUDO[@]}" true || fail 'sudo غیرتعاملی لازم است.'
[[ $VERSION_ID == 26.* ]] || fail 'نسخه با Ubuntu 26 اعلام‌شده سازگار نیست؛ قبل از نصب بررسی شود.'
if [[ $ACTION == all ]]; then
    SERVER_FLAG=--remote
    if [[ $DIRECT == true ]]; then SERVER_FLAG=--on-server; fi
    for action in prepare deploy https verify; do
        bash "$ROOT/deploy-landing.sh" "$action" "$SERVER_FLAG" --host "$HOST" --user "$SSH_USER" --port "$SSH_PORT" --email "$EMAIL"
    done
    exit
fi
"${SUDO[@]}" install -d -m 755 /run/makan
"${SUDO[@]}" touch /run/makan/deploy.lock
"${SUDO[@]}" chmod 644 /run/makan/deploy.lock
exec 9</run/makan/deploy.lock
flock -n 9 || fail 'استقرار دیگری در حال اجراست.'

as_user() {
    local account=$1; shift
    if ((EUID == 0)); then runuser -u "$account" -- "$@"; else sudo -n -H -u "$account" -- "$@"; fi
}
as_makan() { as_user makan env HOME="$BASE" PATH="$BASE/runtime/node/bin:/usr/bin:/bin" NPM_CONFIG_CACHE="$BASE/cache/npm" UV_PYTHON_INSTALL_DIR="$BASE/runtime/python" UV_PYTHON_BIN_DIR="$BASE/cache/bin" UV_CACHE_DIR="$BASE/cache/uv" "$@"; }
backup_file() {
    local path=$1
    if [[ -e $path || -L $path ]]; then
        "${SUDO[@]}" cp -a -- "$path" "$BACKUP/$(basename "$path")"
    fi
}
new_backup() {
    BACKUP="/var/backups/makan/config-$(date -u +%Y%m%dT%H%M%S)-$$"
    "${SUDO[@]}" install -d -m 700 "$BACKUP"
}
managed_install() {
    local src=$1 dst=$2 mode=${3:-644}
    if [[ -e $dst || -L $dst ]]; then
        "${SUDO[@]}" grep -q 'Managed by makan landing' "$dst" || fail 'فایل مقصد ناشناخته است؛ خودکار جایگزین نمی‌شود.'
        backup_file "$dst"
    fi
    "${SUDO[@]}" install -m "$mode" "$src" "$dst"
}
if [[ $ACTION == prepare ]]; then
    STAGE='آماده‌سازی سرور'; NEXT='تعارض پورت/سرویس یا خطای apt و دانلود runtime را برطرف و prepare را تکرار کنید.'
    # Refuse existing applications, databases or users that this tool does not own.
    if ! "${SUDO[@]}" test -f /etc/makan/managed; then
        ! id makan &>/dev/null || fail 'کاربر makan از قبل وجود دارد؛ مالکیت باید بررسی شود.'
        [[ ! -e $BASE && ! -e /etc/makan ]] || fail 'مسیر موجود و ناشناخته است.'
        if command -v pg_lsclusters >/dev/null && [[ -n $(pg_lsclusters --no-header) ]]; then fail 'PostgreSQL موجود باید بررسی شود.'; fi
        if ss -Hlnt '( sport = :3100 or sport = :8000 or sport = :5432 )' | read -r _; then fail 'یکی از پورت‌های داخلی موردنیاز اشغال است.'; fi
    fi
    for port in 80 443; do
        if ss -Hlnt "sport = :$port" | read -r _; then
            "${SUDO[@]}" systemctl is-active --quiet nginx || fail 'پورت وب توسط سرویس دیگری اشغال است.'
        fi
    done
    if command -v certbot >/dev/null && [[ $(readlink -f "$(command -v certbot)") != /usr/bin/certbot ]]; then fail 'نصب Certbot دیگری وجود دارد؛ با apt مخلوط نمی‌شود.'; fi
    # Record ownership before apt, so interrupted preparation can resume.
    "${SUDO[@]}" install -d -m 750 /etc/makan
    "${SUDO[@]}" touch /etc/makan/managed
    "${SUDO[@]}" apt-get update
    "${SUDO[@]}" env DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends nginx certbot postgresql postgresql-client curl ca-certificates xz-utils rsync python3
    if ! id makan &>/dev/null; then "${SUDO[@]}" useradd --system --create-home --home-dir "$BASE" --shell /usr/sbin/nologin makan; fi
    "${SUDO[@]}" install -d -m 755 "$BASE" "$BASE/releases" "$BASE/runtime"
    "${SUDO[@]}" install -d -o makan -g makan -m 750 "$BASE/cache" "$BASE/runtime/python" /var/lib/makan/media /var/lib/makan/operations
    "${SUDO[@]}" install -d -m 750 -o root -g makan /etc/makan
    "${SUDO[@]}" install -d -m 755 /var/lib/letsencrypt/.well-known/acme-challenge
    "${SUDO[@]}" install -d -m 700 /var/backups/makan
    "${SUDO[@]}" python3 "$HELPER" init
    "${SUDO[@]}" systemctl enable --now postgresql
    # Never print generated SQL or credentials. psql output contains only command tags.
    "${SUDO[@]}" python3 "$HELPER" sql | as_user postgres psql -X -v ON_ERROR_STOP=1 -d postgres
    as_user postgres psql -X -v ON_ERROR_STOP=1 -d makan_landing -c 'REVOKE ALL ON SCHEMA public FROM PUBLIC; ALTER SCHEMA public OWNER TO makan_migrator; GRANT USAGE ON SCHEMA public TO makan_api;'
    STAGE='نصب runtime پین‌شده'; NEXT='دسترسی HTTPS به nodejs.org و GitHub و checksum فایل‌ها را بررسی کنید.'
    WORK=$(mktemp -d /tmp/makan-runtime.XXXXXXXX)
    case "$(uname -m)" in x86_64) NODE_ARCH=x64; UV_ARCH=x86_64 ;; aarch64) NODE_ARCH=arm64; UV_ARCH=aarch64 ;; *) fail 'معماری پشتیبانی نمی‌شود.' ;; esac
    if [[ ! -x $BASE/runtime/node/bin/node ]]; then
        curl -fsS --proto '=https' --tlsv1.2 "https://nodejs.org/dist/v24.21.0/node-v24.21.0-linux-$NODE_ARCH.tar.xz" -o "$WORK/node.tar.xz"
        curl -fsS --proto '=https' --tlsv1.2 https://nodejs.org/dist/v24.21.0/SHASUMS256.txt -o "$WORK/SHASUMS256.txt"
        python3 "$HELPER" checksum "$WORK/SHASUMS256.txt" "node-v24.21.0-linux-$NODE_ARCH.tar.xz" "$WORK/node.tar.xz"
        tar -xJf "$WORK/node.tar.xz" -C "$WORK"
        "${SUDO[@]}" mv "$WORK/node-v24.21.0-linux-$NODE_ARCH" "$BASE/runtime/node"
        "${SUDO[@]}" chown -R root:root "$BASE/runtime/node"
    fi
    [[ $("$BASE/runtime/node/bin/node" --version) == v24.21.0 ]] || fail 'runtime موجود با پین پروژه متفاوت است.'
    if [[ ! -x $BASE/runtime/uv ]]; then
        UV_FILE="uv-$UV_ARCH-unknown-linux-gnu.tar.gz"
        curl -fsSL --proto '=https' --tlsv1.2 "https://github.com/astral-sh/uv/releases/download/0.13.0/$UV_FILE" -o "$WORK/uv.tar.gz"
        curl -fsSL --proto '=https' --tlsv1.2 "https://github.com/astral-sh/uv/releases/download/0.13.0/$UV_FILE.sha256" -o "$WORK/uv.sha256"
        python3 "$HELPER" checksum "$WORK/uv.sha256" "$UV_FILE" "$WORK/uv.tar.gz"
        tar -xzf "$WORK/uv.tar.gz" -C "$WORK"
        "${SUDO[@]}" install -m 755 "$WORK/uv-$UV_ARCH-unknown-linux-gnu/uv" "$BASE/runtime/uv"
    fi
    [[ $("$BASE/runtime/uv" --version) == 'uv 0.13.0'* ]] || fail 'نسخهٔ uv متفاوت است.'
    as_makan "$BASE/runtime/uv" python install 3.13.16
    printf 'آماده‌سازی تمام شد؛ نسخهٔ واقعی PostgreSQL: '
    as_user postgres psql -X -At -c 'SHOW server_version'
    printf 'هیچ فایروال یا تنظیم SSH تغییر نکرد. پیش از HTTPS، پورت‌های وب را در فایروال موجود مجاز کنید.\n'
    exit
fi
"${SUDO[@]}" test -f /etc/makan/managed || fail 'ابتدا prepare اجرا شود.'
new_backup
NGINX_APPLIED=false

nginx_activate() {
    local temp=$1 conf=/etc/nginx/sites-available/makan-landing.conf enabled=/etc/nginx/sites-enabled/makan-landing.conf had=false linked=false
    if [[ -e $conf || -L $conf ]]; then
        "${SUDO[@]}" grep -q 'Managed by makan landing' "$conf" || fail 'فایل Nginx ناشناخته است.'
        had=true; backup_file "$conf"
    fi
    if [[ -L $enabled ]]; then
        [[ $(readlink "$enabled") == "$conf" ]] || fail 'لینک Nginx ناشناخته است.'
        linked=true
    elif [[ -e $enabled ]]; then fail 'فایل فعال Nginx ناشناخته است.'; fi
    "${SUDO[@]}" nginx -T 2>/dev/null | python3 "$HELPER" nginx-conflict
    "${SUDO[@]}" install -m 644 "$temp" "$conf"
    if [[ $linked == false ]]; then "${SUDO[@]}" ln -s "$conf" "$enabled"; fi
    if "${SUDO[@]}" nginx -t && "${SUDO[@]}" systemctl reload nginx; then return 0; fi
    if [[ $had == true ]]; then "${SUDO[@]}" cp -a "$BACKUP/makan-landing.conf" "$conf"; else "${SUDO[@]}" unlink "$conf"; fi
    if [[ $linked == false ]]; then "${SUDO[@]}" unlink "$enabled"; fi
    "${SUDO[@]}" nginx -t && "${SUDO[@]}" systemctl reload nginx
    return 1
}
render_nginx() {
    local mode=$1
    "${SUDO[@]}" python3 "$HELPER" nginx "$ROOT/infrastructure/landing/nginx" "$mode" > "$ROOT/nginx.rendered.conf"
    nginx_activate "$ROOT/nginx.rendered.conf"
    NGINX_APPLIED=true
}
wait_ready() {
    local count
    for ((count=0; count<45; count++)); do
        if curl -fs --max-time 5 http://127.0.0.1:3100/health/ready >/dev/null; then return 0; fi
        sleep 1
    done
    return 1
}
switch_release() {
    "${SUDO[@]}" ln -sfn "$1" "$BASE/current.next"
    "${SUDO[@]}" mv -Tf "$BASE/current.next" "$BASE/current"
}
if [[ $ACTION == deploy ]]; then
    STAGE='بررسی و build نسخهٔ جدید'; NEXT='لاگ خصوصی نسخه در /opt/makan/releases را بررسی و deploy را دوباره اجرا کنید؛ نسخهٔ فعلی تا پایان build حفظ می‌شود.'
    python3 "$HELPER" inspect "$ROOT"
    RELEASE="$BASE/releases/$(date -u +%Y%m%dT%H%M%S)-$$"
    "${SUDO[@]}" install -d -m 750 -o makan -g makan "$RELEASE"
    # Also sanitize direct Git checkouts; .git/.env/local state never enter a release.
    python3 "$HELPER" pack "$ROOT" deploy | "${SUDO[@]}" tar --no-same-owner -xf - -C "$RELEASE"
    "${SUDO[@]}" chown -R makan:makan "$RELEASE"
    # Positional arguments are expanded by the non-root child Bash.
    # shellcheck disable=SC2016
    as_makan bash -c 'set -Eeuo pipefail; cd "$1"; umask 027; export NODE_ENV=production NEXT_STANDALONE=false NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS=--max-old-space-size=2048; npm ci --include=dev --no-audit --no-fund; API_INTERNAL_URL=http://127.0.0.1:9 npm run build; cd apps/api; "$2/runtime/uv" sync --frozen --no-dev --python 3.13.16' _ "$RELEASE" "$BASE" > "$ROOT/build.log" 2>&1 || {
        "${SUDO[@]}" install -m 640 -o root -g makan "$ROOT/build.log" "$RELEASE/build.log"
        fail 'نصب یا build ناموفق؛ خروجی حساس احتمالی در چت چاپ نمی‌شود.'
    }
    "${SUDO[@]}" install -m 640 -o root -g makan "$ROOT/build.log" "$RELEASE/build.log"
    "${SUDO[@]}" test -s "$RELEASE/apps/web/.next/BUILD_ID"
    "${SUDO[@]}" test -d "$RELEASE/apps/web/.next/static"
    "${SUDO[@]}" test -x "$RELEASE/apps/api/.venv/bin/python"
    "${SUDO[@]}" install -d -m 750 -o makan -g makan "$RELEASE/apps/web/.next/cache"
    # shellcheck disable=SC2016
    as_makan bash -c 'set -e; cd "$1/apps/api"; .venv/bin/alembic heads' _ "$RELEASE" > "$ROOT/schema.head"
    TARGET_SCHEMA=$(awk '{print $1}' "$ROOT/schema.head")
    [[ $TARGET_SCHEMA =~ ^[a-zA-Z0-9_]+$ ]] || fail 'بیش از یک migration head یا head نامعتبر.'
    OLD=$(readlink -f "$BASE/current" 2>/dev/null || true)
    if [[ -n $OLD && -d $OLD ]]; then
        [[ $OLD == "$BASE/releases/"* ]] || fail 'نسخهٔ فعال به مسیر ناشناخته اشاره می‌کند.'
        [[ $("${SUDO[@]}" cat "$OLD/schema.head") == "$TARGET_SCHEMA" ]] || fail 'نسخهٔ جدید schema متفاوت دارد؛ انتشار متوقف شد. برای تغییر schema، طرح migration و بازیابی داده لازم است.'
        # Verify actual DB state as well as the previous release marker.
        CURRENT_SCHEMA=$(as_user postgres psql -X -At -d makan_landing -c 'SELECT version_num FROM alembic_version')
        [[ $CURRENT_SCHEMA == "$TARGET_SCHEMA" ]] || fail 'schema واقعی با نسخهٔ فعال همخوان نیست.'
    fi
    printf '%s\n' "$TARGET_SCHEMA" | "${SUDO[@]}" tee "$RELEASE/schema.head" >/dev/null
    "${SUDO[@]}" chmod 644 "$RELEASE/schema.head"
    STAGE='snapshot داده و راه‌اندازی API'; NEXT='snapshot در /var/backups/makan محفوظ است؛ خطای سرویس را با journalctl بررسی کنید.'
    SNAP="/var/backups/makan/data-$(basename "$RELEASE")"
    "${SUDO[@]}" install -d -m 700 "$SNAP"
    as_user postgres pg_dump -Fc makan_landing | "${SUDO[@]}" tee "$SNAP/database.dump" >/dev/null
    "${SUDO[@]}" tar -czf "$SNAP/media.tar.gz" -C /var/lib/makan media
    "${SUDO[@]}" chmod 600 "$SNAP/database.dump" "$SNAP/media.tar.gz"
    # First deployment initializes the existing authored content; later releases never rewrite it.
    if [[ -z $OLD || ! -d $OLD ]]; then
        "${SUDO[@]}" python3 "$HELPER" run /etc/makan/migrate.env "$RELEASE/apps/api" "$RELEASE/apps/api/.venv/bin/python" -m alembic upgrade head
        for module in import_content refresh_learning_intro refresh_form_copy crm_backfill; do
            "${SUDO[@]}" python3 "$HELPER" run /etc/makan/api.env "$RELEASE/apps/api" "$RELEASE/apps/api/.venv/bin/python" -m "app.commands.$module"
        done
        "${SUDO[@]}" python3 "$HELPER" run /etc/makan/api.env "$RELEASE/apps/api" "$RELEASE/apps/api/.venv/bin/python" "$RELEASE/infrastructure/landing/site_origin.py"
    fi
    for unit in makan-api.service makan-web.service makan-maintenance.service; do
        FRAGMENT=$(systemctl show -p FragmentPath --value "$unit" 2>/dev/null || true)
        if [[ -n $FRAGMENT ]]; then "${SUDO[@]}" grep -q 'Managed by makan landing' "$FRAGMENT" || fail 'سرویس همنام ناشناخته است.'; fi
    done
    # ERR trap recovers the previous release on any activation/verification failure.
    # shellcheck disable=SC2329
    recover() {
        local code=$?
        trap - ERR
        if [[ -n $OLD && -d $OLD ]]; then
            switch_release "$OLD"
            for unit in makan-api.service makan-web.service makan-maintenance.service; do
                if "${SUDO[@]}" test -f "$BACKUP/$unit"; then "${SUDO[@]}" cp -a "$BACKUP/$unit" "/etc/systemd/system/$unit"; fi
            done
            "${SUDO[@]}" systemctl daemon-reload
            "${SUDO[@]}" systemctl restart makan-api makan-web makan-maintenance
            printf 'نسخهٔ قبلی بازیابی شد؛ سلامت آن را با verify بررسی کنید.\n' >&2
        else
            "${SUDO[@]}" systemctl stop makan-web makan-api makan-maintenance || true
            if [[ -L $BASE/current ]]; then "${SUDO[@]}" unlink "$BASE/current"; fi
            printf 'انتشار نخست ناموفق؛ سرویس جدید متوقف شد و داده برای ادامه حفظ شد.\n' >&2
        fi
        if [[ $NGINX_APPLIED == true ]]; then
            if "${SUDO[@]}" test -f "$BACKUP/makan-landing.conf"; then
                "${SUDO[@]}" cp -a "$BACKUP/makan-landing.conf" /etc/nginx/sites-available/makan-landing.conf
            else
                "${SUDO[@]}" unlink /etc/nginx/sites-enabled/makan-landing.conf
                "${SUDO[@]}" unlink /etc/nginx/sites-available/makan-landing.conf
            fi
            "${SUDO[@]}" nginx -t && "${SUDO[@]}" systemctl reload nginx
        fi
        printf 'خطا در %s. %s\n' "$STAGE" "$NEXT" >&2
        exit "$code"
    }
    trap recover ERR
    for unit in makan-api.service makan-web.service makan-maintenance.service; do managed_install "$ROOT/infrastructure/landing/systemd/$unit" "/etc/systemd/system/$unit"; done
    "${SUDO[@]}" systemctl daemon-reload
    switch_release "$RELEASE"
    "${SUDO[@]}" systemctl enable --now makan-api makan-web makan-maintenance
    "${SUDO[@]}" systemctl restart makan-api makan-web makan-maintenance
    wait_ready
    python3 "$HELPER" verify http://127.0.0.1:3100 "$HOST" application
    STAGE='فعال‌سازی Nginx'; NEXT='nginx -t، journalctl و فایل‌های backup را بررسی کنید.'
    "${SUDO[@]}" systemctl enable --now nginx
    if "${SUDO[@]}" test -f /etc/makan/tls-enabled || "${SUDO[@]}" grep -q 'ssl_certificate ' /etc/nginx/sites-available/makan-landing.conf 2>/dev/null; then render_nginx tls; else render_nginx http; fi
    python3 "$HELPER" verify http://127.0.0.1 "$HOST" origin-http
    if [[ -n $OLD && -d $OLD ]]; then
        "${SUDO[@]}" ln -sfn "$OLD" "$BASE/previous"
    fi
    trap 'on_error "$LINENO"' ERR
    printf 'نسخهٔ فعال: %s؛ موفقیت origin محلی به معنی تأیید DNS/HTTPS بیرونی نیست.\n' "$RELEASE"
    exit
fi
if [[ $ACTION == https ]]; then
    STAGE='دسترسی HTTP-01 و گواهی origin'; NEXT='DNS شامل A/AAAA و CAA، پورت 80، فایروال و مسیر ACME را بررسی کنید؛ سپس فقط https را تکرار کنید.'
    "${SUDO[@]}" systemctl is-active --quiet nginx || fail 'ابتدا deploy موفق لازم است.'
    TOKEN="makan-probe-$(date +%s)-$$"
    printf '%s' "$TOKEN" | "${SUDO[@]}" tee "/var/lib/letsencrypt/.well-known/acme-challenge/$TOKEN" >/dev/null
    "${SUDO[@]}" chmod 644 "/var/lib/letsencrypt/.well-known/acme-challenge/$TOKEN"
    if [[ $(curl --noproxy '*' -fsS --max-time 20 "http://makanapp.org/.well-known/acme-challenge/$TOKEN") != "$TOKEN" ]]; then fail 'مسیر عمومی ACME به این سرور نمی‌رسد.'; fi
    "${SUDO[@]}" unlink "/var/lib/letsencrypt/.well-known/acme-challenge/$TOKEN"
    if "${SUDO[@]}" test -f /etc/letsencrypt/live/makanapp.org/fullchain.pem; then
        "${SUDO[@]}" openssl x509 -in /etc/letsencrypt/live/makanapp.org/fullchain.pem -noout -checkhost makanapp.org >/dev/null || fail 'نام گواهی موجود ناسازگار است.'
    fi
    # certonly --keep-until-expiring reuses valid lineages and renews only when due.
    "${SUDO[@]}" certbot certonly --webroot -w /var/lib/letsencrypt --cert-name makanapp.org -d makanapp.org --email "$EMAIL" --agree-tos --non-interactive --keep-until-expiring
    "${SUDO[@]}" openssl x509 -in /etc/letsencrypt/live/makanapp.org/fullchain.pem -noout -checkend 86400 >/dev/null
    "${SUDO[@]}" openssl x509 -in /etc/letsencrypt/live/makanapp.org/fullchain.pem -noout -checkhost makanapp.org >/dev/null
    render_nginx tls
    "${SUDO[@]}" touch /etc/makan/tls-enabled
    "${SUDO[@]}" install -d -m 755 /etc/letsencrypt/renewal-hooks/deploy
    managed_install "$ROOT/infrastructure/landing/renew-nginx.sh" /etc/letsencrypt/renewal-hooks/deploy/makan-nginx.sh 755
    "${SUDO[@]}" systemctl enable --now certbot.timer
    "${SUDO[@]}" certbot renew --cert-name makanapp.org --dry-run --run-deploy-hooks
    python3 "$HELPER" verify https://makanapp.org 127.0.0.1 origin-tls
    printf 'گواهی origin و تمدید آزمایشی بررسی شدند؛ بررسی مستقل عمومی: فرمان verify.\n'
    exit
fi
if [[ $ACTION == renew-test ]]; then
    STAGE='آزمون تمدید پس از DNS/CDN'; NEXT='لاگ /var/log/letsencrypt/letsencrypt.log و عبور ACME از CDN را بررسی کنید.'
    "${SUDO[@]}" systemctl is-enabled --quiet certbot.timer
    "${SUDO[@]}" systemctl is-active --quiet certbot.timer
    "${SUDO[@]}" certbot renew --cert-name makanapp.org --dry-run --run-deploy-hooks
    exit
fi
if [[ $ACTION == rollback ]]; then
    STAGE='بازگشت نسخه'; NEXT='نسخه‌ها، schema و journalctl را بررسی کنید؛ داده به‌صورت خودکار بازنویسی نمی‌شود.'
    CURRENT=$(readlink -f "$BASE/current")
    PREVIOUS=$(readlink -f "$BASE/previous")
    [[ $CURRENT == "$BASE/releases/"* && $PREVIOUS == "$BASE/releases/"* && -d $PREVIOUS && $CURRENT != "$PREVIOUS" ]] || fail 'نسخهٔ قبلی معتبر وجود ندارد.'
    SCHEMA=$(as_user postgres psql -X -At -d makan_landing -c 'SELECT version_num FROM alembic_version')
    [[ $("${SUDO[@]}" cat "$PREVIOUS/schema.head") == "$SCHEMA" ]] || fail 'schema نسخهٔ قبلی ناسازگار است؛ بازگردانی داده نیازمند عملیات جداگانه است.'
    switch_release "$PREVIOUS"
    if "${SUDO[@]}" systemctl restart makan-api makan-web makan-maintenance && wait_ready && python3 "$HELPER" verify http://127.0.0.1:3100 "$HOST" application; then
        "${SUDO[@]}" ln -sfn "$CURRENT" "$BASE/previous"
        printf 'بازگشت موفق به %s؛ تنظیم TLS و داده حفظ شدند.\n' "$PREVIOUS"
    else
        switch_release "$CURRENT"
        "${SUDO[@]}" systemctl restart makan-api makan-web makan-maintenance
        fail 'نسخهٔ قبلی سالم نبود؛ اشاره‌گر به نسخهٔ اولیه بازگردانده شد.'
    fi
    exit
fi
if [[ $ACTION == verify ]]; then
    STAGE='بررسی نهایی VPS و مسیر عمومی'; NEXT='خطای همان مسیر، لاگ سرویس‌ها، DNS و تنظیم CDN را بررسی کنید.'
    "${SUDO[@]}" nginx -t
    for unit in nginx makan-api makan-web makan-maintenance certbot.timer; do
        "${SUDO[@]}" systemctl is-active --quiet "$unit"
        "${SUDO[@]}" systemctl is-enabled --quiet "$unit"
    done
    python3 "$HELPER" verify https://makanapp.org 127.0.0.1 origin-tls
    python3 "$HELPER" verify https://makanapp.org "$HOST" public
    "${SUDO[@]}" openssl x509 -in /etc/letsencrypt/live/makanapp.org/fullchain.pem -noout -subject -issuer -dates
    "${SUDO[@]}" systemctl list-timers --no-pager certbot.timer
fi
