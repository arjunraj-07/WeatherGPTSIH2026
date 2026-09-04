import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import useSWR from 'swr';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarDays, ChevronDown, CloudRain, Droplets, RefreshCw, ThermometerSun, Umbrella } from 'lucide-react';
import { WeatherService } from '../../services/api';
import { mockForecastData } from '../../data/mockData';
import { usePreferences } from '../../hooks/usePreferences';
import { celsiusToDisplay, cn, temperatureSuffix } from '../../lib/weather';
import WeatherIcon from '../../components/WeatherIcon';

export default function ForecastView() {
  const { temperatureUnit } = usePreferences();
  const [selectedDay, setSelectedDay] = useState<number | null>(0);
  const [selectedHour, setSelectedHour] = useState(0);
  const { data: forecast, error, isLoading, mutate } = useSWR('forecast-page', () => WeatherService.getForecast(), {
    fallbackData: mockForecastData,
    revalidateOnFocus: false,
  });
  const suffix = temperatureSuffix(temperatureUnit);

  const chartData = useMemo(
    () => (forecast?.hourly ?? []).map((hour, index) => ({
      index,
      time: hour.time,
      temp: celsiusToDisplay(hour.temp, temperatureUnit),
      precipitation: hour.precipitationProb,
    })),
    [forecast?.hourly, temperatureUnit],
  );

  const derived = useMemo(() => {
    const daily = forecast?.daily ?? [];
    const hourly = forecast?.hourly ?? [];
    if (daily.length === 0 && hourly.length === 0) return null;
    const wettestHour = hourly.reduce((best, hour) => !best || hour.precipitationProb > best.precipitationProb ? hour : best, hourly[0]);
    const min = daily.length ? Math.min(...daily.map((day) => day.minTemp)) : Math.min(...hourly.map((hour) => hour.temp));
    const max = daily.length ? Math.max(...daily.map((day) => day.maxTemp)) : Math.max(...hourly.map((hour) => hour.temp));
    return { wettestHour, min, max };
  }, [forecast]);

  if (isLoading && !forecast) {
    return <div className="forecast-skeleton" role="status" aria-label="Loading forecast"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>;
  }

  if (!forecast) {
    return (
      <div className="atmo-panel error-state" role="alert">
        <span className="error-state__icon"><CloudRain className="h-7 w-7" /></span>
        <h1>Forecast unavailable</h1><p>The forecast service did not return usable data.</p>
        <button type="button" className="action-button" onClick={() => void mutate()}><RefreshCw className="h-4 w-4" /> Retry</button>
      </div>
    );
  }

  const globalMin = forecast.daily.length ? Math.min(...forecast.daily.map((day) => day.minTemp)) : 0;
  const globalMax = forecast.daily.length ? Math.max(...forecast.daily.map((day) => day.maxTemp)) : 1;
  const globalSpan = Math.max(1, globalMax - globalMin);

  return (
    <div className="forecast-view">
      <header className="page-heading">
        <div><span className="eyebrow">Time, made legible</span><h1>Forecast intelligence</h1><p>Trace the next hours, compare daily ranges and focus on the periods that change your plans.</p></div>
        <span className="observation-source"><span /> {import.meta.env.VITE_DATA_MODE !== 'api' ? 'Demo forecast' : 'API forecast'}</span>
      </header>

      {error && (
        <div className="inline-error" role="status"><CloudRain className="h-4 w-4" /><span>Refresh failed; showing the latest available values.</span><button type="button" onClick={() => void mutate()}>Retry</button></div>
      )}

      {derived && (
        <section className="forecast-summary" aria-label="Forecast summary">
          <div><span><ThermometerSun className="h-4 w-4" /> Period range</span><strong>{celsiusToDisplay(derived.min, temperatureUnit)}–{celsiusToDisplay(derived.max, temperatureUnit)}{suffix}</strong><small>Across returned days</small></div>
          <div><span><Umbrella className="h-4 w-4" /> Wettest hour</span><strong>{derived.wettestHour?.time ?? 'Not available'}</strong><small>{derived.wettestHour ? `${derived.wettestHour.precipitationProb}% precipitation` : 'No hourly values'}</small></div>
          <div><span><CalendarDays className="h-4 w-4" /> Outlook</span><strong>{forecast.daily.length} {forecast.daily.length === 1 ? 'day' : 'days'}</strong><small>Returned by this source</small></div>
        </section>
      )}

      <section className="forecast-curve atmo-panel" aria-labelledby="curve-title">
        <div className="section-heading">
          <div><span className="eyebrow">Hourly curve</span><h2 id="curve-title">Temperature through the next hours</h2></div>
          {forecast.hourly[selectedHour] && <span className="curve-focus">Focused: {forecast.hourly[selectedHour].time}</span>}
        </div>
        {chartData.length > 0 ? (
          <div className="forecast-chart" role="img" aria-label={`Hourly temperatures from ${chartData[0]?.time} to ${chartData.at(-1)?.time}. Range ${Math.min(...chartData.map((item) => item.temp))} to ${Math.max(...chartData.map((item) => item.temp))} degrees.`}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 18, right: 12, left: -20, bottom: 0 }}>
                <defs><linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgb(var(--color-primary))" stopOpacity={0.3} /><stop offset="100%" stopColor="rgb(var(--color-primary))" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid vertical={false} stroke="rgb(var(--color-ink) / 0.1)" strokeDasharray="4 6" />
                <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fill: 'rgb(var(--color-ink) / 0.55)', fontSize: 11 }} />
                <YAxis unit="°" tickLine={false} axisLine={false} tick={{ fill: 'rgb(var(--color-ink) / 0.55)', fontSize: 11 }} domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip formatter={(value) => [`${value}${suffix}`, 'Temperature']} contentStyle={{ background: 'rgb(var(--color-surface))', border: '1px solid rgb(var(--color-ink) / 0.12)', borderRadius: 12, color: 'rgb(var(--color-ink))' }} />
                <Area type="monotone" dataKey="temp" stroke="rgb(var(--color-primary))" strokeWidth={3} fill="url(#forecastFill)" activeDot={{ r: 5, fill: 'rgb(var(--color-sun))', stroke: 'rgb(var(--color-surface))', strokeWidth: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : <div className="compact-empty">No hourly forecast values were returned.</div>}

        {forecast.hourly.length > 0 && (
          <div className="forecast-hours" role="list" aria-label="Hourly forecast details">
            {forecast.hourly.map((hour, index) => (
              <button type="button" role="listitem" key={`${hour.time}-${index}`} className={cn('forecast-hour', selectedHour === index && 'forecast-hour--active')} onClick={() => setSelectedHour(index)} onFocus={() => setSelectedHour(index)} aria-pressed={selectedHour === index}>
                <span>{hour.time}</span><WeatherIcon icon={hour.icon} condition={hour.condition} className="h-7 w-7" /><strong>{celsiusToDisplay(hour.temp, temperatureUnit)}°</strong><small><Droplets className="h-3 w-3" />{hour.precipitationProb}%</small>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="daily-forecast" aria-labelledby="daily-title">
        <div className="section-heading"><div><span className="eyebrow">Daily outlook</span><h2 id="daily-title">{forecast.daily.length}-day forecast</h2></div><span className="section-heading__note">Select a day to inspect its range</span></div>
        {forecast.daily.length > 0 ? (
          <div className="daily-list">
            {forecast.daily.map((day, index) => {
              const start = ((day.minTemp - globalMin) / globalSpan) * 100;
              const width = Math.max(12, ((day.maxTemp - day.minTemp) / globalSpan) * 100);
              const expanded = selectedDay === index;
              return (
                <article key={`${day.date}-${index}`} className={cn('daily-row', expanded && 'daily-row--expanded')}>
                  <button type="button" className="daily-row__button" onClick={() => setSelectedDay(expanded ? null : index)} aria-expanded={expanded} aria-controls={`day-detail-${index}`}>
                    <span className="daily-row__date"><strong>{day.day}</strong><small>{day.date}</small></span>
                    <span className="daily-row__condition"><WeatherIcon icon={day.icon} condition={day.condition} className="h-7 w-7" /><span>{day.condition}</span></span>
                    <span className="daily-row__rain"><Droplets className="h-4 w-4" />{day.precipitationProb}%</span>
                    <span className="daily-row__range"><b>{celsiusToDisplay(day.minTemp, temperatureUnit)}°</b><i><span style={{ left: `${start}%`, width: `${Math.min(width, 100 - start)}%` }} /></i><strong>{celsiusToDisplay(day.maxTemp, temperatureUnit)}°</strong></span>
                    <ChevronDown className="daily-row__chevron h-5 w-5" />
                  </button>
                  <AnimatePresence initial={false}>
                    {expanded && (
                      <motion.div id={`day-detail-${index}`} className="daily-row__detail" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.26 }}>
                        <div><span>Expected condition</span><strong>{day.condition}</strong></div><div><span>Temperature span</span><strong>{celsiusToDisplay(day.minTemp, temperatureUnit)}–{celsiusToDisplay(day.maxTemp, temperatureUnit)}{suffix}</strong></div><div><span>Precipitation probability</span><strong>{day.precipitationProb}%</strong></div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="atmo-panel empty-state"><span className="empty-state__icon"><CalendarDays className="h-7 w-7" /></span><h2>No daily outlook</h2><p>This source returned no daily forecast values.</p></div>
        )}
      </section>
    </div>
  );
}
