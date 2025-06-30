"""Main entry point for the RealtimeSTT application."""

import os
import sys

# Add src to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

# Import must be after path modification
from realtime_stt.main import main  # noqa: E402

if __name__ == "__main__":
    main()
