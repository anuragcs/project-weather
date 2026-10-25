from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent.parent
SAMPLE_DATA_PATH = BASE_DIR / 'app' / 'data' / 'sample_wind_jan_2026.json'

ELEXON_BASE_URL = os.getenv('ELEXON_BASE_URL', 'https://api.bmreports.com/BMRS')
ELEXON_API_KEY = os.getenv('ELEXON_API_KEY', '')

TARGET_PERIOD_START = '2026-01-01T00:00:00Z'
TARGET_PERIOD_END = '2026-01-31T23:30:00Z'
