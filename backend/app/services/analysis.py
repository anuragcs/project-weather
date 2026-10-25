from __future__ import annotations

import math
from collections import defaultdict
from datetime import datetime


def _safe_float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def align_series(actual_records, forecast_records):
    actual_by_time = {}
    for item in actual_records:
        ts = item.get('startTime')
        value = _safe_float(item.get('generation'))
        if ts:
            actual_by_time[ts] = value

    forecast_by_time = defaultdict(list)
    for item in forecast_records:
        ts = item.get('startTime')
        if ts:
            forecast_by_time[ts].append({
                'publishTime': item.get('publishTime'),
                'generation': _safe_float(item.get('generation')),
            })

    aligned = []
    for ts, actual_value in actual_by_time.items():
        candidates = forecast_by_time.get(ts, [])
        if not candidates:
            continue
        latest = max(candidates, key=lambda x: (x['publishTime'] or '',))
        aligned.append({
            'startTime': ts,
            'actual': actual_value,
            'forecast': latest['generation'],
            'publishTime': latest['publishTime'],
        })

    return sorted(aligned, key=lambda x: x['startTime'])


def compute_accuracy(actual_records, forecast_records):
    aligned = align_series(actual_records, forecast_records)
    if not aligned:
        return {
            'maeMw': 0.0,
            'rmseMw': 0.0,
            'mapePct': 0.0,
            'biasMw': 0.0,
            'meanActualMw': 0.0,
            'meanForecastMw': 0.0,
            'sampleCount': 0,
        }

    errors = [entry['forecast'] - entry['actual'] for entry in aligned]
    absolute_errors = [abs(error) for error in errors]
    actual_values = [entry['actual'] for entry in aligned]
    forecast_values = [entry['forecast'] for entry in aligned]

    mae = sum(absolute_errors) / len(absolute_errors)
    rmse = math.sqrt(sum(error ** 2 for error in errors) / len(errors))
    mape = (
        sum(abs(error) / max(abs(actual), 1e-6) for error, actual in zip(errors, actual_values))
        / len(actual_values)
    ) * 100
    bias = sum(errors) / len(errors)

    return {
        'maeMw': round(mae, 2),
        'rmseMw': round(rmse, 2),
        'mapePct': round(mape, 2),
        'biasMw': round(bias, 2),
        'meanActualMw': round(sum(actual_values) / len(actual_values), 2),
        'meanForecastMw': round(sum(forecast_values) / len(forecast_values), 2),
        'sampleCount': len(aligned),
    }


def aggregate_daily(actual_records, forecast_records):
    aligned = align_series(actual_records, forecast_records)
    groups = defaultdict(list)
    for item in aligned:
        day = item['startTime'][:10]
        groups[day].append(item)

    daily_breakdown = []
    for day in sorted(groups):
        values = groups[day]
        actual_sum = sum(item['actual'] for item in values)
        forecast_sum = sum(item['forecast'] for item in values)
        daily_breakdown.append({
            'date': day,
            'actualTotalMw': round(actual_sum, 2),
            'forecastTotalMw': round(forecast_sum, 2),
            'dayAheadErrorMw': round(forecast_sum - actual_sum, 2),
        })
    return daily_breakdown


def latest_snapshot(actual_records, forecast_records):
    aligned = align_series(actual_records, forecast_records)
    if not aligned:
        return {'startTime': None, 'actualMw': 0.0, 'forecastMw': 0.0, 'publishTime': None}

    latest = aligned[-1]
    return {
        'startTime': latest['startTime'],
        'actualMw': round(latest['actual'], 2),
        'forecastMw': round(latest['forecast'], 2),
        'publishTime': latest['publishTime'],
    }
