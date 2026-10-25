import { useEffect, useMemo, useState } from 'react'
import './App.css'

const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

function formatMw(value) {
  return `${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} MW`
}

function formatPct(value) {
  return `${Number(value || 0).toFixed(2)}%`
}

function formatDateLabel(dateString) {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  })
}

function LineChart({ actualSeries, forecastSeries, rangeLabel }) {
  const width = 820
  const height = 260
  const padding = 30
  const scaleMax = Math.max(...actualSeries.concat(forecastSeries), 1)

  const actualPoints = actualSeries.map((value, index) => ({
    x: padding + (index / Math.max(actualSeries.length - 1, 1)) * (width - padding * 2),
    y: height - padding - (value / scaleMax) * (height - padding * 2),
  }))

  const forecastPoints = forecastSeries.map((value, index) => ({
    x: padding + (index / Math.max(forecastSeries.length - 1, 1)) * (width - padding * 2),
    y: height - padding - (value / scaleMax) * (height - padding * 2),
  }))

  const actualPath = actualPoints.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
  const forecastPath = forecastPoints.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')

  const labels = [
    { label: 'Start', value: 0 },
    { label: 'Mid', value: Math.floor((actualSeries.length - 1) / 2) },
    { label: 'End', value: actualSeries.length - 1 },
  ]

  const svgKey = `${rangeLabel}-${actualSeries.length}-${forecastSeries.length}`

  return (
    <div className="chart-panel">
      <div className="chart-toolbar">
        <span className="small-chip">Range: {rangeLabel}</span>
      </div>
      <svg key={svgKey} viewBox={`0 0 ${width} ${height}`} className="chart-svg" role="img" aria-label="Wind generation forecast chart">
        <line x1={padding} x2={width - padding} y1={height - padding} y2={height - padding} className="axis-line" />
        <line x1={padding} x2={padding} y1={padding} y2={height - padding} className="axis-line" />
        {Array.from({ length: 4 }).map((_, index) => {
          const y = padding + (index * (height - padding * 2)) / 3
          return <line key={y} x1={padding} x2={width - padding} y1={y} y2={y} className="grid-line" />
        })}
        <path d={actualPath} className="series actual" />
        <path d={forecastPath} className="series forecast" />
      </svg>
      <div className="legend">
        <span><i className="swatch actual"></i>Actual generation</span>
        <span><i className="swatch forecast"></i>Forecast generation</span>
      </div>
      <div className="x-axis-labels">
        {labels.map((labelInfo) => (
          <span key={labelInfo.label}>{labelInfo.label}</span>
        ))}
      </div>
    </div>
  )
}

function App() {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [chartRange, setChartRange] = useState('7d')
  const [tablePage, setTablePage] = useState(1)
  const [pageSize, setPageSize] = useState(8)

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${apiBase}/api/dashboard`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }
        return response.json()
      })
      .then((payload) => {
        setData(payload)
        setIsLoading(false)
      })
      .catch((fetchError) => {
        if (fetchError.name === 'AbortError') return
        setError('Unable to load the latest forecast analysis from the backend service.')
        setIsLoading(false)
      })

    return () => controller.abort()
  }, [])

  const series = useMemo(() => {
    if (!data?.timeSeries?.length) return { actual: [], forecast: [] }
    return {
      actual: data.timeSeries.map((point) => Number(point.actual) || 0),
      forecast: data.timeSeries.map((point) => Number(point.forecast) || 0),
    }
  }, [data])

  const chartSeries = useMemo(() => {
    if (!series.actual.length) return { actual: [], forecast: [], rangeLabel: 'all' }

    const buckets = {
      '7d': 7 * 48,
      '14d': 14 * 48,
      'all': series.actual.length,
    }

    const points = buckets[chartRange] || series.actual.length
    const startIndex = Math.max(series.actual.length - points, 0)

    return {
      actual: series.actual.slice(startIndex),
      forecast: series.forecast.slice(startIndex),
      rangeLabel: chartRange === 'all' ? 'Full month' : `${chartRange.slice(0, -1)} days`,
    }
  }, [chartRange, series])

  const dailyRows = useMemo(() => {
    if (!data?.dailyBreakdown) return []
    return [...data.dailyBreakdown].sort((a, b) => new Date(a.date) - new Date(b.date))
  }, [data])

  const totalPages = Math.max(1, Math.ceil(dailyRows.length / pageSize))

  const pageRows = useMemo(() => {
    const start = (tablePage - 1) * pageSize
    return dailyRows.slice(start, start + pageSize)
  }, [dailyRows, pageSize, tablePage])

  useEffect(() => {
    setTablePage(1)
  }, [pageSize])

  if (isLoading) {
    return <div className="page-shell"><div className="status-box">Loading wind forecast analysis…</div></div>
  }

  if (error || !data) {
    return <div className="page-shell"><div className="status-box error">{error || 'No data available.'}</div></div>
  }

  const { metrics, latestSnapshot } = data

  return (
    <div className="page-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">UK day-ahead procurement context</p>
          <h1>Wind forecast decision support</h1>
        </div>
        <div className="badge-group">
          <span className="badge">Period: Jan 2026</span>
          <span className="badge source">Source: {data.source}</span>
        </div>
      </header>

      <section className="summary-grid">
        <article className="stat-card highlight">
          <span className="label">Latest actual wind</span>
          <strong>{formatMw(latestSnapshot.actualMw)}</strong>
          <small>{latestSnapshot.startTime}</small>
        </article>
        <article className="stat-card">
          <span className="label">Latest forecast</span>
          <strong>{formatMw(latestSnapshot.forecastMw)}</strong>
          <small>Issued {latestSnapshot.publishTime}</small>
        </article>
        <article className="stat-card">
          <span className="label">Mean absolute error</span>
          <strong>{formatMw(metrics.maeMw)}</strong>
          <small>Average absolute deviation</small>
        </article>
        <article className="stat-card">
          <span className="label">Forecast bias</span>
          <strong>{formatMw(metrics.biasMw)}</strong>
          <small>{metrics.biasMw >= 0 ? 'Forecast above actuals' : 'Forecast below actuals'}</small>
        </article>
      </section>

      <section className="panel chart-panel-wrap">
        <div className="panel-header top-margin">
          <div>
            <p className="eyebrow">Forecast quality</p>
            <h2>Actual vs forecasted wind generation</h2>
          </div>
          <div className="range-controls">
            <button className={chartRange === '7d' ? 'active' : ''} onClick={() => setChartRange('7d')}>7 days</button>
            <button className={chartRange === '14d' ? 'active' : ''} onClick={() => setChartRange('14d')}>14 days</button>
            <button className={chartRange === 'all' ? 'active' : ''} onClick={() => setChartRange('all')}>Full month</button>
          </div>
        </div>
        <LineChart actualSeries={chartSeries.actual} forecastSeries={chartSeries.forecast} rangeLabel={chartSeries.rangeLabel} />
      </section>

      <section className="metrics-grid">
        <div className="panel">
          <h3>Accuracy metrics</h3>
          <ul className="metric-list">
            <li><span>MAE</span><strong>{formatMw(metrics.maeMw)}</strong></li>
            <li><span>RMSE</span><strong>{formatMw(metrics.rmseMw)}</strong></li>
            <li><span>MAPE</span><strong>{formatPct(metrics.mapePct)}</strong></li>
            <li><span>Mean actual</span><strong>{formatMw(metrics.meanActualMw)}</strong></li>
            <li><span>Mean forecast</span><strong>{formatMw(metrics.meanForecastMw)}</strong></li>
          </ul>
        </div>

        <div className="panel">
          <h3>Procurement implication</h3>
          <div className="proc-box">
            <p>For the January 2026 decision window, the model indicates an average forecast error of {formatMw(metrics.maeMw)}.</p>
            <p>That means the procurement team should factor in a residual balancing requirement of roughly {formatMw(metrics.biasMw)} MW during the period, depending on the direction of bias.</p>
          </div>
        </div>
      </section>

      <section className="panel table-panel">
        <div className="panel-header table-header">
          <div>
            <p className="eyebrow">Daily view</p>
            <h2>Daily generation balance</h2>
          </div>
          <div className="table-controls">
            <label>
              Rows
              <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
                <option value={5}>5</option>
                <option value={8}>8</option>
                <option value={10}>10</option>
              </select>
            </label>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Actual</th>
                <th>Forecast</th>
                <th>Daily spread</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr key={row.date}>
                  <td>{formatDateLabel(row.date)}</td>
                  <td>{formatMw(row.actualTotalMw)}</td>
                  <td>{formatMw(row.forecastTotalMw)}</td>
                  <td className={row.dayAheadErrorMw >= 0 ? 'positive' : 'negative'}>{formatMw(row.dayAheadErrorMw)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pagination-row">
          <button disabled={tablePage === 1} onClick={() => setTablePage((page) => Math.max(page - 1, 1))}>Previous</button>
          <span>Page {tablePage} of {totalPages}</span>
          <button disabled={tablePage >= totalPages} onClick={() => setTablePage((page) => Math.min(page + 1, totalPages))}>Next</button>
        </div>
      </section>
    </div>
  )
}

export default App
