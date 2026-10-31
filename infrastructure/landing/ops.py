#!/usr/bin/env python3
"""Small deployment helpers. Never print environment files or secret exception values."""
import hashlib
import http.client
import ipaddress
import json
import os
from pathlib import Path
import pwd
import re
import secrets
import socket
import ssl
import subprocess
import sys
import tarfile
from urllib.parse import urlsplit

BASE = Path('/etc/makan')
MARKER = '# Managed by makan landing\n'
SKIP = {'.git', '.agents', '.aws', '.codex', 'node_modules', '.next', '.venv',
        '__pycache__', '.pytest_cache', '.ruff_cache', 'test-results', 'playwright-report',
        '.media', 'coverage', 'output', 'release', 'dist', 'htmlcov', '.backups', '.ops',
        '.npmrc', '.pypirc', '.ssh'}
SECRET_SUFFIX = {'.pem', '.key', '.pfx', '.p12', '.sqlite', '.sqlite3', '.db', '.dump',
                 '.sql', '.log', '.bak', '.enc', '.zip', '.pyc', '.tsbuildinfo'}


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def inspect(root):
    root = Path(root)
    package = json.loads((root / 'package.json').read_text())
    web = json.loads((root / 'apps/web/package.json').read_text())
    require(package['workspaces'] == ['apps/web'], 'ساختار workspace تغییر کرده؛ اسکریپت بازبینی شود.')
    require((root / '.nvmrc').read_text().strip() == '24', 'پین Node تغییر کرده است.')
    require(web['scripts']['build'] == 'next build --webpack', 'فرمان build تغییر کرده است.')
    require(web['scripts']['start'] == 'next start --hostname 127.0.0.1', 'فرمان start تغییر کرده است.')
    for relative in ('package-lock.json', 'apps/api/uv.lock', 'apps/api/pyproject.toml',
                     'apps/api/app/data/initial-marketing.json', 'apps/web/next.config.ts'):
        require((root / relative).is_file(), 'یکی از فایل‌های الزامی پروژه موجود نیست.')
    config = (root / 'apps/web/next.config.ts').read_text()
    require('output: process.env.NEXT_STANDALONE' in config and '"export"' not in config,
            'حالت خروجی Next تغییر کرده؛ استقرار بازبینی شود.')
    print('نوع واقعی: Next.js SSR + FastAPI + PostgreSQL؛ صفحهٔ اصلی به API و محتوای DB وابسته است.')
    print('Node 24.21.0 / npm همراه Node؛ Python 3.13.16 / uv 0.13.0؛ lockfileها بدون تغییر.')
    print('Production: next start روی 127.0.0.1:3100 و uvicorn روی 127.0.0.1:8000؛ Nginx دامنهٔ اصلی.')
    print('build متغیر محرمانه ندارد؛ API_INTERNAL_URL برای build به پورت بسته اشاره می‌کند؛ runtime در /etc/makan.')


def validate(host, user, port, email, action):
    require(ipaddress.IPv4Address(host).is_global, 'IPv4 عمومی واقعی لازم است؛ مقدار داخل کروشه معتبر نیست.')
    require(re.fullmatch(r'[a-z_][a-z0-9_-]{0,31}', user), 'نام کاربر SSH معتبر نیست.')
    require(re.fullmatch(r'[0-9]{1,5}', port) and 1 <= int(port) <= 65535, 'پورت واقعی SSH لازم است.')
    require(not email or re.fullmatch(r'[A-Za-z0-9.!#$%&*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,63}', email),
            'ایمیل معتبر لازم است.')
    require(action not in ('https', 'all') or bool(email), 'برای https/all ایمیل واقعی لازم است.')


def pack(root, action):
    root = Path(root).resolve()
    entries = [root / 'deploy-landing.sh', root / 'infrastructure/landing']
    if action in ('deploy', 'all'):
        entries += [root / 'apps', root / 'package.json', root / 'package-lock.json', root / '.nvmrc']
    with tarfile.open(fileobj=sys.stdout.buffer, mode='w|') as archive:
        def add(path):
            require(not path.is_symlink(), 'لینک نمادین در سورس انتخاب‌شده مجاز نیست.')
            if path.name in SKIP or path.name.startswith('.env') or path.suffix in SECRET_SUFFIX:
                return
            if path.is_dir():
                for child in sorted(path.iterdir()):
                    add(child)
            elif path.is_file():
                info = archive.gettarinfo(str(path), arcname=str(path.relative_to(root)))
                info.uid = info.gid = 0
                info.uname = info.gname = ''
                info.mode = 0o640
                with path.open('rb') as stream:
                    archive.addfile(info, stream)
        for entry in entries:
            add(entry)


def server_identity(host):
    result = subprocess.run(['ip', '-4', '-j', 'addr', 'show'], capture_output=True, text=True)
    require(result.returncode == 0, 'خواندن IP دستگاه ممکن نیست؛ --on-server را فقط روی VPS اجرا کنید.')
    interfaces = json.loads(result.stdout)
    addresses = {address.get('local') for interface in interfaces for address in interface.get('addr_info', [])}
    require(host in addresses, 'IP مقصد روی این دستگاه وجود ندارد؛ برای جلوگیری از نصب روی رایانهٔ محلی متوقف شد. اگر VPS پشت NAT است، روش SSH صریح یا بررسی شبکه لازم است.')
    print('IPv4 واقعی دستگاه با VPS مقصد تطبیق دارد: ' + host)


def read_env(path):
    result = {}
    for line in Path(path).read_text().splitlines():
        if line and not line.startswith('#'):
            key, value = line.split('=', 1)
            require(re.fullmatch(r'[A-Z_][A-Z_0-9]*', key), 'نام متغیر env معتبر نیست.')
            result[key] = value
    return result


def private_write(path, text, mode=0o600, group=None):
    path = Path(path)
    require(not path.exists(), 'فایل تنظیم موجود است؛ برای جلوگیری از تغییر secret متوقف شد.')
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, mode)
    with os.fdopen(descriptor, 'w') as stream:
        stream.write(text)
    if group is not None:
        os.chown(path, 0, group)


def init():
    require(os.geteuid() == 0, 'این عملیات فقط روی VPS با sudo اجرا می‌شود.')
    group = pwd.getpwnam('makan').pw_gid
    state = BASE / 'secrets.json'
    if state.exists():
        values = json.loads(state.read_text())
    else:
        values = {key: secrets.token_hex(32) for key in ('AUTH_SECRET', 'AUTH_MFA_KEY', 'PROXY_SHARED_SECRET',
                                                        'API_DB_PASSWORD', 'MIGRATION_DB_PASSWORD')}
        private_write(state, json.dumps(values) + '\n')
    common = {
        'APP_ENV': 'production', 'AUTH_OTP_DEBUG': 'false', 'AUTH_LEGACY_PASSWORD_LOGIN': 'false',
        'AUTH_SECRET': values['AUTH_SECRET'], 'AUTH_MFA_KEY': values['AUTH_MFA_KEY'],
        'PROXY_SHARED_SECRET': values['PROXY_SHARED_SECRET'],
        'AUTH_ALLOWED_ORIGINS': '["https://makanapp.org"]', 'MEDIA_ROOT': '/var/lib/makan/media',
        'SEO_INDEXING_ENABLED': 'false', 'ANALYTICS_ENABLED': 'false',
    }
    for name, role, key, mode in (('api.env', 'makan_api', 'API_DB_PASSWORD', 0o640),
                                  ('migrate.env', 'makan_migrator', 'MIGRATION_DB_PASSWORD', 0o600)):
        if not (BASE / name).exists():
            config = {**common, 'DATABASE_URL': f'postgresql+psycopg://{role}:{values[key]}@127.0.0.1:5432/makan_landing'}
            private_write(BASE / name, MARKER + ''.join(f'{k}={v}\n' for k, v in config.items()), mode, group)
    if not (BASE / 'web.env').exists():
        private_write(BASE / 'web.env', MARKER + 'NODE_ENV=production\nNEXT_TELEMETRY_DISABLED=1\nAPI_INTERNAL_URL=http://127.0.0.1:8000\n', 0o640, group)
    if not (BASE / 'nginx-proxy.conf').exists():
        private_write(BASE / 'nginx-proxy.conf', MARKER + f'proxy_set_header X-Makan-Proxy-Key "{values["PROXY_SHARED_SECRET"]}";\n')


def sql():
    values = json.loads((BASE / 'secrets.json').read_text())
    for key in ('API_DB_PASSWORD', 'MIGRATION_DB_PASSWORD'):
        require(re.fullmatch('[a-f0-9]{64}', values[key]), 'ساختار رمز ذخیره‌شده نامعتبر است.')
    print("SET log_statement = 'none';")
    for name, key in (('makan_migrator', 'MIGRATION_DB_PASSWORD'), ('makan_api', 'API_DB_PASSWORD')):
        print(f"SELECT 'CREATE ROLE {name} LOGIN PASSWORD ''{values[key]}'' NOSUPERUSER NOCREATEDB NOCREATEROLE' WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname='{name}') \\gexec")
    print("SELECT 'CREATE DATABASE makan_landing OWNER makan_migrator' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname='makan_landing') \\gexec")
    print('REVOKE ALL ON DATABASE makan_landing FROM PUBLIC; GRANT CONNECT ON DATABASE makan_landing TO makan_api;')


def run(env_file, directory, *command):
    require(os.geteuid() == 0, 'دسترسی sudo لازم است.')
    environment = read_env(env_file)
    account = pwd.getpwnam('makan')
    environment.update(PATH='/opt/makan/runtime/node/bin:/usr/bin:/bin', HOME='/opt/makan',
                       PYTHONDONTWRITEBYTECODE='1', PYTHONUNBUFFERED='1')
    os.chdir(directory)
    os.initgroups('makan', account.pw_gid)
    os.setgid(account.pw_gid)
    os.setuid(account.pw_uid)
    os.execve(command[0], list(command), environment)


def checksum(manifest, filename, payload):
    lines = Path(manifest).read_text().splitlines()
    hashes = [line.split()[0] for line in lines if len(line.split()) == 1 or line.split()[-1].lstrip('*') == filename]
    require(len(hashes) == 1 and re.fullmatch('[a-fA-F0-9]{64}', hashes[0]), 'checksum رسمی پیدا نشد.')
    require(hashlib.sha256(Path(payload).read_bytes()).hexdigest() == hashes[0].lower(), 'checksum دانلود مطابقت ندارد.')


def nginx(directory, mode):
    require(mode in ('http', 'tls'), 'حالت Nginx نامعتبر است.')
    directory = Path(directory)
    template = (directory / f'makanapp.org.{mode}.conf').read_text()
    print(template.replace('# APPLICATION_LOCATIONS', (directory / 'locations.conf').read_text()))


def nginx_conflict():
    source = ''
    sections = {}
    for line in sys.stdin:
        match = re.match(r'# configuration file (.+):$', line.strip())
        if match:
            source = match[1]
        sections[source] = sections.get(source, '') + line
    for source, content in sections.items():
        if source in ('/etc/nginx/sites-enabled/makan-landing.conf', '/etc/nginx/sites-available/makan-landing.conf'):
            continue
        content = re.sub(r'#.*', '', content)
        for names in re.findall(r'\bserver_name\s+([^;]+);', content):
            require(not set(names.split()) & {'makanapp.org', '.makanapp.org'},
                    'دامنه در تنظیم دیگری از Nginx وجود دارد؛ فایل ناشناخته خودکار تغییر نمی‌کند.')


class Connection(http.client.HTTPSConnection):
    """Use origin IP while preserving public Host, SNI and certificate validation."""
    def __init__(self, address):
        super().__init__('makanapp.org', timeout=25, context=ssl.create_default_context())
        self.address = address

    def connect(self):
        sock = socket.create_connection((self.address, 443), self.timeout)
        self.sock = self._context.wrap_socket(sock, server_hostname='makanapp.org')


def verify(base, ip, mode):
    target = urlsplit(base)
    def request(path):
        if mode == 'origin-tls':
            connection = Connection(ip)
        elif target.scheme == 'https':
            connection = http.client.HTTPSConnection(target.hostname, target.port or 443, timeout=25)
        else:
            connection = http.client.HTTPConnection(target.hostname, target.port or 80, timeout=25)
        try:
            connection.request('GET', path, headers={'Host': 'makanapp.org', 'User-Agent': 'MakanDeployVerifier/1'})
            response = connection.getresponse()
            content = response.read(12 * 1024 * 1024)
            return response.status, dict((k.lower(), v) for k, v in response.getheaders()), content
        finally:
            connection.close()

    status, headers, content = request('/')
    if mode == 'origin-http' and status in (301, 308):
        require(headers.get('location') == 'https://makanapp.org/', 'مقصد هدایت HTTP نامعتبر است.')
        print('origin HTTP به HTTPS صحیح هدایت می‌شود؛ محتوای برنامه جدا بررسی شد.')
        return
    require(status == 200 and 'text/html' in headers.get('content-type', ''), 'صفحهٔ اصلی پاسخ HTML موفق ندارد.')
    text = content.decode('utf-8')
    require('ماکان' in text and '/_next/static/' in text, 'پاسخ صفحه با لندینگ ماکان مطابقت ندارد.')
    require('no-store' in headers.get('cache-control', '') or 'no-cache' in headers.get('cache-control', '') or 'private' in headers.get('cache-control', ''),
            'HTML نباید کش عمومی طولانی داشته باشد.')
    assets = sorted(set(re.findall(r'(?:src|href)="(/_next/static/[^"?]+)', text)))
    require(any(path.endswith('.js') for path in assets) and any(path.endswith('.css') for path in assets), 'JS/CSS ساخته‌شده پیدا نشد.')
    assets += sorted(set(re.findall(r'(?:src|href)="(/brand/[^"?]+)', text)))
    for path in assets:
        code, h, body = request(path)
        require(code == 200 and body and 'text/html' not in h.get('content-type', ''), 'یکی از assetها بارگذاری نشد: ' + path)
        if path.endswith('.js'):
            require('javascript' in h.get('content-type', ''), 'نوع محتوای JavaScript صحیح نیست.')
        if path.endswith('.css'):
            require('text/css' in h.get('content-type', ''), 'نوع محتوای CSS صحیح نیست.')
    for path in ('/_next/static/makan-missing.js', '/_next/static/makan-missing.css'):
        code, h, _ = request(path)
        require(code == 404 and (mode == 'application' or 'text/html' not in h.get('content-type', '')),
                'asset ناموجود باید 404 غیر HTML بدهد.')
    for path in ('/features', '/solutions', '/about', '/faq', '/demo', '/contact', '/learn', '/blog', '/health/ready'):
        code, _, _ = request(path)
        require(code == 200, 'مسیر ضروری پاسخ موفق ندارد: ' + path)
    require(request('/makan-deploy-missing-page')[0] == 404, 'صفحهٔ ناموجود 404 واقعی ندارد.')
    if mode in ('public', 'origin-tls'):
        address = ip if mode == 'origin-tls' else 'makanapp.org'
        connection = http.client.HTTPConnection(address, 80, timeout=20)
        try:
            connection.request('GET', '/', headers={'Host': 'makanapp.org'})
            response = connection.getresponse()
            require(response.status in (301, 308) and response.getheader('Location') == 'https://makanapp.org/', 'هدایت HTTP به HTTPS درست نیست.')
        finally:
            connection.close()
    print(f'بررسی {mode}: صفحهٔ ماکان، {len(assets)} asset، مسیرهای اصلی، 404 و سلامت برنامه موفق بود.')


def main():
    action, *args = sys.argv[1:]
    functions = {'inspect': inspect, 'validate': validate, 'pack': pack, 'init': init, 'sql': sql,
                 'run': run, 'checksum': checksum, 'nginx': nginx, 'nginx-conflict': nginx_conflict,
                 'server-identity': server_identity, 'verify': verify}
    functions[action](*args)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        # Connection strings, SQL and settings validation values must never escape to the terminal.
        if isinstance(error, RuntimeError):
            print(str(error), file=sys.stderr)
        else:
            print(f'عملیات ناموفق ({type(error).__name__})؛ ورودی، شبکه و لاگ خصوصی همان مرحله را بررسی کنید.', file=sys.stderr)
        sys.exit(1)
