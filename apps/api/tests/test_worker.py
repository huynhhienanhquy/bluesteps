from unittest.mock import Mock

import pytest
from sqlalchemy import Engine
from sqlalchemy.exc import InterfaceError, OperationalError

from bluesteps_api import worker
from bluesteps_api.config import Settings


@pytest.mark.parametrize("error_type", [OperationalError, InterfaceError])
def test_worker_reconnects_with_bounded_backoff_and_resets_after_success(
    monkeypatch: pytest.MonkeyPatch,
    settings: Settings,
    caplog: pytest.LogCaptureFixture,
    error_type: type[OperationalError | InterfaceError],
) -> None:
    engine = Mock(spec=Engine)
    error = error_type("sensitive SQL", {}, Exception("sensitive credentials"))
    poll = Mock(side_effect=[*[error] * 7, True, error, False, KeyboardInterrupt()])
    sleep = Mock()
    monkeypatch.setattr(worker, "process_one", poll)
    monkeypatch.setattr(worker.time, "sleep", sleep)

    with pytest.raises(KeyboardInterrupt):
        worker.run_worker(engine, settings)

    assert [call.args[0] for call in sleep.call_args_list] == [1, 2, 4, 8, 16, 30, 30, 1, 1]
    assert engine.dispose.call_count == 8
    assert poll.call_count == 11
    assert "reconnecting" in caplog.text
    assert "sensitive" not in caplog.text


def test_worker_does_not_hide_unexpected_errors(monkeypatch: pytest.MonkeyPatch, settings: Settings) -> None:
    engine = Mock(spec=Engine)
    monkeypatch.setattr(worker, "process_one", Mock(side_effect=RuntimeError("worker bug")))
    with pytest.raises(RuntimeError, match="worker bug"):
        worker.run_worker(engine, settings)
    engine.dispose.assert_not_called()


@pytest.mark.parametrize("failure", [KeyboardInterrupt(), RuntimeError("worker bug")])
def test_main_disposes_engine_on_exit(monkeypatch: pytest.MonkeyPatch, failure: BaseException) -> None:
    engine = Mock(spec=Engine)
    config = Mock(spec=Settings)
    monkeypatch.setattr(worker, "get_settings", Mock(return_value=config))
    monkeypatch.setattr(worker, "make_engine", Mock(return_value=engine))
    monkeypatch.setattr(worker, "run_worker", Mock(side_effect=failure))
    if isinstance(failure, KeyboardInterrupt):
        worker.main()
    else:
        with pytest.raises(RuntimeError, match="worker bug"):
            worker.main()
    engine.dispose.assert_called_once_with()
