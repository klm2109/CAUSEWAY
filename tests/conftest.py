"""Give every test module the same isolated, platform-native demo database."""
import os
from pathlib import Path
from tempfile import TemporaryDirectory

_database_directory = TemporaryDirectory(prefix="causeway-tests-")
os.environ["CAUSEWAY_DB"] = str(Path(_database_directory.name) / "evidence.sqlite3")


def pytest_sessionfinish(session, exitstatus):
    _database_directory.cleanup()
