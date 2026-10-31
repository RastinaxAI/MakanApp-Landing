"""Deployment safety checks; no SSH, sudo, system service or external network."""
import contextlib
import importlib.util
import io
from pathlib import Path
import subprocess
import sys
import tarfile
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[3]
SPEC = importlib.util.spec_from_file_location('makan_ops', ROOT / 'infrastructure/landing/ops.py')
ops = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(ops)


class DeploymentSafety(unittest.TestCase):
    def test_reject_placeholder_and_shell_inputs(self):
        for host, user, port, email in (
            ('[IP سرور]', 'root', '22', ''), ('127.0.0.1', 'root', '22', ''),
            ('8.8.8.8', 'root;id', '22', ''), ('8.8.8.8', 'root', '0', ''),
            ('8.8.8.8', 'root', '65536', ''), ('8.8.8.8', 'root', '22', 'a@x.org\ncommand'),
        ):
            with self.subTest(host=host, user=user, port=port), self.assertRaises((RuntimeError, ValueError)):
                ops.validate(host, user, port, email, 'deploy')

    def test_https_requires_email(self):
        with self.assertRaises(RuntimeError):
            ops.validate('8.8.8.8', 'deployer', '2222', '', 'https')

    def test_archive_excludes_secrets_build_and_repository(self):
        with tempfile.TemporaryDirectory(prefix='makan-test-') as directory:
            root = Path(directory)
            files = ('deploy-landing.sh', 'package.json', 'package-lock.json', '.nvmrc',
                     'infrastructure/landing/ops.py', 'apps/web/src/ok.ts',
                     'apps/web/.env.production', 'apps/web/.npmrc', 'apps/web/token.key',
                     'apps/web/node_modules/private/file', 'apps/web/.next/server.js',
                     'apps/api/.venv/private/file', 'apps/api/.media/private.png')
            for name in files:
                path = root / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text('fixture')
            result = subprocess.run([sys.executable, str(ROOT / 'infrastructure/landing/ops.py'),
                                     'pack', str(root), 'deploy'], capture_output=True, check=True)
            with tarfile.open(fileobj=io.BytesIO(result.stdout)) as archive:
                names = set(archive.getnames())
                self.assertIn('apps/web/src/ok.ts', names)
                self.assertIn('package-lock.json', names)
                self.assertFalse(any('.env' in name or '.npmrc' in name or '.key' in name or
                                     '/node_modules/' in name or '/.next/' in name or
                                     '/.venv/' in name or '/.media/' in name for name in names))

    def test_local_server_execution_is_refused_before_system_commands(self):
        import os
        environment = dict(os.environ)
        environment.pop('SSH_CONNECTION', None)
        result = subprocess.run(['bash', str(ROOT / 'deploy-landing.sh'), 'prepare', '--remote',
                                 '--host', '8.8.8.8', '--user', 'root', '--port', '2222'],
                                env=environment, capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('فقط داخل اتصال SSH', result.stderr)
        self.assertNotIn('اکنون روی VPS', result.stdout)

    def test_http_config_has_no_certificate_reference_and_one_hostname(self):
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            ops.nginx(ROOT / 'infrastructure/landing/nginx', 'http')
        config = output.getvalue()
        self.assertNotIn('ssl_certificate', config)
        self.assertEqual(config.count('server_name makanapp.org;'), 1)
        self.assertIn('location ^~ /.well-known/acme-challenge/', config)
        self.assertNotIn('index.html', config)
        self.assertNotIn('server_name www', config)
        self.assertNotIn('server_name app.', config)
        self.assertNotIn('server_name management.', config)

    def test_on_server_requires_matching_interface_address(self):
        output = '[{"addr_info":[{"local":"10.0.0.2"}]}]'
        with patch.object(ops.subprocess, 'run', return_value=subprocess.CompletedProcess([], 0, output, '')):
            with self.assertRaises(RuntimeError):
                ops.server_identity('8.8.8.8')

    def test_unknown_nginx_domain_is_rejected_without_exposing_config(self):
        config = '# configuration file /etc/nginx/sites-enabled/other.conf:\nserver { server_name makanapp.org; }\n'
        with patch.object(ops.sys, 'stdin', io.StringIO(config)), self.assertRaises(RuntimeError):
            ops.nginx_conflict()


if __name__ == '__main__':
    unittest.main()
