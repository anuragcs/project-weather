# Wind Forecast Decision Support

## Overview

This project is a simple dashboard designed to help energy traders and procurement teams understand wind power forecasts and how closely they match actual generation. The goal is to make it easier to spot forecast errors and use that information when planning day-ahead electricity purchases in the UK.

The frontend is built with React, while the backend uses Python and FastAPI to load the data and calculate forecast accuracy. The project focuses on January 2026 and uses wind generation data structured around Elexon's BMRS fields.

## How it works

The dashboard brings the main information together in one place. Users can compare forecasted wind generation with actual output, review forecast accuracy, and see how the difference changes over time.

The idea is to help answer a practical question: **How much can we rely on the wind forecast when planning electricity purchases for the next day?**

## Main features

- Compare forecasted wind generation with actual generation.
- Review forecast error using MAE, RMSE, MAPE, and bias.
- View daily summaries and changes over time.
- Explore the January 2026 dataset through a simple dashboard.
- Run the frontend and backend locally or use Docker Compose to start the application.

## Project structure

- `frontend/` — React application and dashboard UI.
- `backend/` — FastAPI application and data analysis logic.
- `backend/app/data/sample_wind_jan_2026.json` — Local sample dataset for January 2026.
- `docker-compose.yml` — Configuration for running the application with Docker.

## Running locally

### 1. Start the backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will be available at `http://localhost:8000`.

### 2. Start the frontend

Open a second terminal and run:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser to use the dashboard.

### Run with Docker

From the project root, run:

```bash
docker compose up --build
```

This starts the backend on port `8000` and the frontend on port `4173`, as configured in the Docker setup.

## Data source

The project follows the Elexon BMRS data structure for actual wind generation and forecasts. The relevant fields include:

- `startTime` — the time period the record relates to.
- `generation` — the recorded or forecast generation value.
- `publishTime` — when a forecast was published.

A local January 2026 sample dataset is included so the application can run without depending on a live API connection. Live data retrieval depends on the implementation and the required BMRS API configuration; the sample dataset should not be confused with verified live data.

## API endpoints

- `GET /api/health` — checks whether the backend is running.
- `GET /api/dashboard` — returns the dashboard data, including forecast accuracy metrics, the latest snapshot, daily summaries, and time-series data.

## Deployment

The application is structured to support containerised deployment. One practical option is to host the React frontend on Vercel and the FastAPI backend on a service such as Render, Railway, or Azure App Service.

Deployment still needs to be completed and tested on the chosen hosting platforms before a live URL can be provided.

## AI tools

AI-assisted coding tools like chatgpt were used during development to help implement and refine parts of the application. The resulting code was reviewed and adjusted as part of the implementation process.

## Why this project matters

Wind generation can change the amount of electricity available to the market, which makes forecast accuracy important when planning purchases in advance. This dashboard brings forecasts, actual output, and error metrics into one view so a procurement team can better understand forecast uncertainty and identify where additional review may be needed.

It is intended as a lightweight decision-support tool rather than a complete electricity trading or procurement system.