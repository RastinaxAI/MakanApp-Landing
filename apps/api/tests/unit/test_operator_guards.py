import importlib.util
from pathlib import Path
from unittest.mock import patch

import pytest


@pytest.fixture
def operator_module():
    path = Path(__file__).resolve().parents[4] / "scripts/production.py"
    spec = importlib.util.spec_from_file_location("makan_operations", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_env_no_overwrite_loopback_scope_and_distinct_keys(operator_module, tmp_path):
    path = tmp_path / "acceptance.env"
    operator_module.initialize(path, None, True)
    original = path.read_bytes()
    with pytest.raises(ValueError):
        operator_module.initialize(path, None, True)
    assert path.read_bytes() == original
    values = operator_module.read_env(path)
    assert len({values[key] for key in operator_module.KEYS}) == 7
    path.write_text(original.decode().replace("HTTPS_BIND=127.0.0.1", "HTTPS_BIND=0.0.0.0"))
    with pytest.raises(ValueError, match="loopback"):
        operator_module.read_env(path)


def test_restore_existing_volume_rejects_before_decrypt(operator_module, tmp_path):
    path = tmp_path / "acceptance.env"
    operator_module.initialize(path, None, True)
    operator = operator_module.Operator(path)
    with patch.object(operator_module.subprocess, "check_output", return_value="existing_volume\n"):
        with patch.object(operator_module, "decrypt") as decrypt:
            with pytest.raises(ValueError, match="existing"):
                operator.restore(tmp_path / "missing.backup")
            decrypt.assert_not_called()


def test_operation_lock_serializes_and_releases_on_failure(operator_module, tmp_path):
    path = tmp_path / "acceptance.env"
    operator_module.initialize(path, None, True)
    operator = operator_module.Operator(path)
    with pytest.raises(RuntimeError):
        with operator.lock():
            with pytest.raises(FileExistsError):
                with operator.lock():
                    pytest.fail("A second operation acquired the same project")
            raise RuntimeError("operation failed")
    with operator.lock():
        pass
