import { useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, CalendarRange, Database, RefreshCw, ThermometerSun, TrendingDown, TrendingUp } from 'lucide-react';
import { ClimateService } from '../../services/api';
import type { ClimateData } from '../../types/models';

interface ClimatePoint {
  year: string;
  temp: number;
}

interface ClimateResult {
  data: ClimateData;
  source: 'bundled historical dataset' | 'service fallback';
}

function isUsableClimateData(data: ClimateData) {
  return data.labels.length >= 2
    && data.labels.length === data.historicalTemp.length
    && data.historicalTemp.every((value) => Number.isFinite(value));
}

async function loadClimateEvidence(): Promise<ClimateResult> {
  try {
    const response = await fetch('/data/india_temperature_1901_2025.json');
    if (!response.ok) throw new Error('Historical dataset request failed.');
    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) throw new Error('Historical dataset has an invalid shape.');

    const points = payload
      .map((record): ClimatePoint | null => {
        if (!record || typeof record !== 'object') return null;
        const item = record as Record<string, unknown>;
        const year = Number(item.year);
        const temp = Number(item.annual_temp);
        if (!Number.isFinite(year) || !Number.isFinite(temp)) return null;
        return { year: String(Math.trunc(year)), temp };
      })
      .filter((point): point is ClimatePoint => point !== null)
      .sort((a, b) => Number(a.year) - Number(b.year));

    if (points.length < 2) throw new Error('Historical dataset does not contain enough valid records.');
    return {
      data: {
        labels: points.map((point) => point.year),
        historicalTemp: points.map((point) => point.temp),
        historicalRainfall: [],
      },
      source: 'bundled historical dataset',
    };
  } catch {
    const fallback = await ClimateService.getClimateTrends();
    if (!isUsableClimateData(fallback)) throw new Error('Climate evidence is unavailable or invalid.');
    return { data: fallback, source: 'service fallback' };
  }
}

function mean(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
}

export default function ClimateView() {
  const [timeRange, setTimeRange] = useState<'50' | 'All'>('All');
  const { data: result, error, isLoading, mutate } = useSWR('climate-evidence', loadClimateEvidence, { revalidateOnFocus: false });

  const allPoints = useMemo<ClimatePoint[]>(() => {
    if (!result) return [];
    return result.data.labels.map((year, index) => ({ year, temp: result.data.historicalTemp[index] })).filter((point) => Number.isFinite(point.temp));
  }, [result]);

  const chartData = useMemo(() => timeRange === '50' ? allPoints.slice(-50) : allPoints, [allPoints, timeRange]);

  const evidence = useMemo(() => {
    if (chartData.length < 2) return null;
    const n = chartData.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;
    chartData.forEach((point, index) => {
      sumX += index;
      sumY += point.temp;
      sumXY += index * point.temp;
      sumX2 += index * index;
    });
    const denominator = n * sumX2 - sumX * sumX;
    const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
    const warmest = chartData.reduce((current, point) => point.temp > current.temp ? point : current);
    const coolest = chartData.reduce((current, point) => point.temp < current.temp ? point : current);
    const firstDecade = chartData.slice(0, Math.min(10, chartData.length));
    const latestDecade = chartData.slice(-Math.min(10, chartData.length));
    const decadeShift = mean(latestDecade.map((point) => point.temp)) - mean(firstDecade.map((point) => point.temp));
    return { slope, warmest, coolest, decadeShift, average: mean(chartData.map((point) => point.temp)) };
  }, [chartData]);

  if (isLoading) {
    return <div className="climate-skeleton" role="status" aria-label="Loading climate evidence"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>;
  }

  if (error || !result || !evidence) {
    return (
      <div className="climate-view">
        <header className="page-heading"><div><span className="eyebrow">Long-range evidence</span><h1>India climate trends</h1><p>Annual temperature evidence could not be prepared.</p></div></header>
        <section className="atmo-panel empty-state" role="alert"><span className="empty-state__icon"><AlertTriangle className="h-7 w-7" /></span><h2>Climate dataset unavailable</h2><p>The bundled file and service fallback did not return usable numeric records.</p><button type="button" className="action-button" onClick={() => void mutate()}><RefreshCw className="h-4 w-4" />Retry dataset</button></section>
      </div>
    );
  }

  const direction = evidence.slope > 0.0005 ? 'warming' : evidence.slope < -0.0005 ? 'cooling' : 'stable';
  const firstYear = chartData.at(0)?.year;
  const lastYear = chartData.at(-1)?.year;
  const accessibleSummary = `${chartData.length} annual observations from ${firstYear} to ${lastYear}. The least-squares trend is ${evidence.slope.toFixed(3)} degrees Celsius per year. The warmest observation is ${evidence.warmest.temp.toFixed(2)} degrees in ${evidence.warmest.year}.`;

  return (
    <div className="climate-view">
      <header className="page-heading climate-heading">
        <div><span className="eyebrow">Long-range evidence</span><h1>India annual temperature</h1><p>Read the 1901–2025 record as evidence, with every summary derived from the bundled observations.</p></div>
        <div className="climate-source"><Database className="h-4 w-4" /><span><strong>{chartData.length} records</strong>{result.source}</span></div>
      </header>

      <section className="climate-lead" aria-label="Calculated temperature trend">
        <div className="climate-lead__signal">
          {direction === 'warming' ? <TrendingUp className="h-8 w-8" /> : direction === 'cooling' ? <TrendingDown className="h-8 w-8" /> : <ThermometerSun className="h-8 w-8" />}
        </div>
        <div className="climate-lead__reading"><span>Least-squares trend</span><strong>{evidence.slope >= 0 ? '+' : ''}{evidence.slope.toFixed(3)}°C <small>/ year</small></strong></div>
        <p>The selected record shows a <strong>{direction}</strong> long-term direction. This is a descriptive trend, not a short-range forecast.</p>
      </section>

      <section className="climate-chart-panel atmo-panel" aria-labelledby="climate-chart-title">
        <div className="section-heading">
          <div><span className="eyebrow">Observed annual mean</span><h2 id="climate-chart-title">{firstYear}—{lastYear}</h2></div>
          <div className="range-switch" role="group" aria-label="Climate time range">
            <button type="button" onClick={() => setTimeRange('All')} aria-pressed={timeRange === 'All'}>Full dataset</button>
            <button type="button" onClick={() => setTimeRange('50')} aria-pressed={timeRange === '50'}>Last 50 years</button>
          </div>
        </div>
        <p className="sr-only">{accessibleSummary}</p>
        <div className="climate-chart" role="img" aria-label={accessibleSummary}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 18, right: 12, left: 0, bottom: 4 }}>
              <CartesianGrid stroke="rgb(var(--color-ink) / 0.09)" strokeDasharray="3 5" vertical={false} />
              <XAxis dataKey="year" stroke="rgb(var(--color-ink) / 0.46)" fontSize={10} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={32} tickMargin={10} />
              <YAxis domain={['dataMin - 0.5', 'dataMax + 0.5']} stroke="rgb(var(--color-ink) / 0.46)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value: number) => `${value.toFixed(1)}°`} width={42} />
              <RechartsTooltip
                cursor={{ stroke: 'rgb(var(--color-primary) / 0.35)', strokeWidth: 1 }}
                contentStyle={{ borderRadius: 14, border: '1px solid rgb(var(--color-ink) / 0.12)', background: 'rgb(var(--color-surface))', boxShadow: '0 12px 32px rgb(3 24 33 / 0.14)', fontSize: 12 }}
                formatter={(value) => [`${Number(value).toFixed(2)}°C`, 'Annual mean']}
                labelFormatter={(label) => `Year ${label}`}
              />
              <Line type="monotone" dataKey="temp" stroke="rgb(var(--color-primary))" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: 'rgb(var(--color-sun))', stroke: 'rgb(var(--color-surface))', strokeWidth: 2 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <footer className="climate-chart-panel__footer"><span><CalendarRange className="h-4 w-4" />Annual means · no rainfall series inferred</span><small>Source: bundled India temperature dataset</small></footer>
      </section>

      <section className="climate-evidence-grid" aria-label="Derived climate summaries">
        <article><span>Warmest observation</span><strong>{evidence.warmest.temp.toFixed(2)}°C</strong><small>{evidence.warmest.year}</small></article>
        <article><span>Coolest observation</span><strong>{evidence.coolest.temp.toFixed(2)}°C</strong><small>{evidence.coolest.year}</small></article>
        <article><span>Period average</span><strong>{evidence.average.toFixed(2)}°C</strong><small>{chartData.length} annual means</small></article>
        <article><span>Decade comparison</span><strong>{evidence.decadeShift >= 0 ? '+' : ''}{evidence.decadeShift.toFixed(2)}°C</strong><small>Latest 10 vs earliest 10 years shown</small></article>
      </section>
    </div>
  );
}
