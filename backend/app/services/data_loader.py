from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

import requests

from app.config import ELEXON_API_KEY, ELEXON_BASE_URL, SAMPLE_DATA_PATH


def _normalise_record(record):
    return {
        'startTime': record.get('startTime'),
        'publishTime': record.get('publishTime'),
        'generation': record.get('generation'),
    }


def _load_sample_dataset():
    with open(SAMPLE_DATA_PATH, 'r', encoding='utf-8') as handle:
        payload = json.load(handle)
    return payload.get('actual', []), payload.get('forecast', [])


def _fetch_remote_dataset(dataset_name: str, fuel_type: str = 'WIND'):
    if not ELEXON_API_KEY:
        raise RuntimeError('ELEXON_API_KEY is not configured. Using local sample data instead.')

    params = {
        'APIKey': ELEXON_API_KEY,
        'FuelType': fuel_type,
        'FromDate': '20260101',
        'ToDate': '20260131',
    }
    response = requests.get(f'{ELEXON_BASE_URL}/{dataset_name}/v1', params=params, timeout=30)
    response.raise_for_status()
    data = response.json()

    if isinstance(data, dict):
        records = data.get('data') or data.get('items') or data.get('result') or []
    else:
        records = data

    return [_normalise_record(item) for item in records if isinstance(item, dict)]


def load_wind_dataset():
    try:
        actual = _fetch_remote_dataset('FUELHH')
        forecast = _fetch_remote_dataset('WINDFOR')
        source = 'bmrs-live'
    except Exception:
        actual, forecast = _load_sample_dataset()
        source = 'sample-data'

    return {
        'actual': actual,
        'forecast': forecast,
        'source': source,
        'period': {
            'start': '2026-01-01T00:00:00Z',
            'end': '2026-01-31T23:30:00Z',
        },
    }
