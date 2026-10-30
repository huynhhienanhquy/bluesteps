"""Compatibility entry point: generate the v0.2 execution/readiness pack."""
from pathlib import Path
import runpy

if __name__ == '__main__':
    runpy.run_path(str(Path(__file__).with_name('build_execution_pack.py')), run_name='__main__')
