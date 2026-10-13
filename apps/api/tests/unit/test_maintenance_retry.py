import json
from unittest.mock import Mock, patch

from app.commands import maintenance


def test_worker_recovers_after_failure_and_replaces_error_heartbeat(tmp_path):
    state = tmp_path / "heartbeat.json"
    stop = Mock()
    stop.is_set.return_value = False
    stop.wait.side_effect = [False, True]
    engine = Mock()
    with (
        patch("sys.argv", ["maintenance", "--state-file", str(state)]),
        patch.object(maintenance.threading, "Event", return_value=stop),
        patch.object(maintenance.signal, "signal"),
        patch.object(maintenance, "Settings"),
        patch.object(maintenance, "build_engine", return_value=engine),
        patch.object(
            maintenance,
            "cycle",
            side_effect=[RuntimeError("DB unavailable"), {"leads": {"purged": 1}}],
        ),
    ):
        maintenance.main()
    assert [call.args[0] for call in stop.wait.call_args_list] == [30, 3600]
    assert json.loads(state.read_text())["status"] == "ok"
    assert maintenance.healthy(state)
    engine.dispose.assert_called_once()
