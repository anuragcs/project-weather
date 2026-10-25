from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.services.analysis import aggregate_daily, compute_accuracy, latest_snapshot
from app.services.data_loader import load_wind_dataset

app = FastAPI(title='Wind Forecast Decision Support', version='1.0.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.get('/api/health')
def health():
    return {'status': 'ok', 'service': 'wind-forecast-api'}


@app.get('/api/dashboard')
def get_dashboard():
    dataset = load_wind_dataset()
    actual = dataset['actual']
    forecast = dataset['forecast']
    accuracy = compute_accuracy(actual, forecast)
    daily = aggregate_daily(actual, forecast)
    latest = latest_snapshot(actual, forecast)

    return {
        'source': dataset['source'],
        'period': dataset['period'],
        'metrics': accuracy,
        'latestSnapshot': latest,
        'dailyBreakdown': daily,
        'timeSeries': [
            {
                'timestamp': item['startTime'],
                'actual': item['actual'],
                'forecast': item['forecast'],
            }
            for item in sorted(
                [
                    {
                        'startTime': actual_item['startTime'],
                        'actual': actual_item['generation'],
                        'forecast': next(
                            (fc['generation'] for fc in forecast if fc['startTime'] == actual_item['startTime']),
                            None,
                        ),
                    }
                    for actual_item in actual
                    if actual_item.get('startTime')
                ],
                key=lambda item: item['startTime'],
            )
            if item['forecast'] is not None
        ][:288],
    }
