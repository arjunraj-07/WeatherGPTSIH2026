import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CloudRain,
  Compass,
  Droplets,
  Eye,
  Gauge,
  Map as MapIcon,
  MapPin,
  Navigation,
  RefreshCw,
  Sunrise,
  Sunset,
  Umbrella,
  Waves,
  Wind,
} from 'lucide-react';
import { AlertService, WeatherService } from '../../services/api';
import { mockAlerts, mockForecastData } from '../../data/mockData';
import type { HourlyForecast } from '../../types/models';
import { useWeather } from '../../hooks/useWeather';
import { usePreferences } from '../../hooks/usePreferences';
import {
  celsiusToDisplay,
  cn,
  severityClass,
  temperatureSuffix,
  windToDisplay,
  windUnitLabel,
} from '../../lib/weather';
import WeatherIcon from '../../components/WeatherIcon';
import LocationSearch from '../../components/LocationSearch';

function parseTime(value: string) {
  const match = value.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;
  let hour = Number(match[1]);
  if (match[3].toUpperCase() === 'AM' && hour === 12) hour = 0;
  if (match[3].toUpperCase() === 'PM' && hour !== 12) hour += 12;
  return hour * 60 + Number(match[2]);
}

function daylightProgress(sunrise: string, sunset: string) {
  const start = parseTime(sunrise);
  const end = parseTime(sunset);
  if (start === null || end === null || end <= start) return 50;
  let now = new Date().getHours() * 60 + new Date().getMinutes();
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date());
    now = Number(parts.find((part) => part.type === 'hour')?.value ?? 12) * 60
      + Number(parts.find((part) => part.type === 'minute')?.value ?? 0);
  } catch {
    // The local clock is a deterministic fallback when timezone formatting is unavailable.
  }
  return Math.max(0, Math.min(100, ((now - start) / (end - start)) * 100));
}

function HomeSkeleton() {
  return (
    <div className="home-skeleton" aria-label="Loading weather intelligence" role="status">
      <div className="skeleton home-skeleton__hero" />
      <div className="skeleton home-skeleton__panel" />
      <div className="skeleton home-skeleton__strip" />
    </div>
  );
}

export default function HomeView() {
  const { weather, isLoading: weatherLoading, error: weatherError, retry: retryWeather, isDaytime } = useWeather();
  const { temperatureUnit, windUnit } = usePreferences();
  const [selectedHour, setSelectedHour] = useState(0);
  const {
    data: forecast,
    error: forecastError,
    isLoading: forecastLoading,
    mutate: retryForecast,
  } = useSWR('home-forecast', () => WeatherService.getForecast(), {
    fallbackData: mockForecastData,
    revalidateOnFocus: false,
  });
  const {
    data: alerts = mockAlerts,
    error: alertsError,
    mutate: retryAlerts,
  } = useSWR('home-alerts', () => AlertService.getAlerts(), {
    fallbackData: mockAlerts,
    revalidateOnFocus: false,
  });
  const isDemo = import.meta.env.VITE_DATA_MODE !== 'api';
  const activeAlerts = alerts.filter((alert) => alert.status === 'Active');
  const activeHour: HourlyForecast | undefined = forecast?.hourly[selectedHour] ?? forecast?.hourly[0];
  const tempSuffix = temperatureSuffix(temperatureUnit);

  const detailMetrics = useMemo(() => {
    if (!weather) return [];
    return [
      { label: 'Humidity', value: `${weather.humidity}%`, note: weather.humidity > 70 ? 'Moist air' : 'Comfortable', icon: Droplets },
      { label: 'Wind', value: `${windToDisplay(weather.windSpeed, windUnit)} ${windUnitLabel(windUnit)}`, note: `From ${weather.windDirection}`, icon: Wind },
      { label: 'Visibility', value: `${weather.visibility} km`, note: weather.visibility < 5 ? 'Reduced' : 'Good', icon: Eye },
      { label: 'Pressure', value: `${weather.pressure} hPa`, note: 'Sea level', icon: Gauge },
      { label: 'UV index', value: String(weather.uvIndex), note: weather.uvIndex >= 6 ? 'Protection needed' : 'Moderate', icon: Waves },
      { label: 'Cloud cover', value: `${weather.cloudCoverage}%`, note: weather.condition, icon: CloudRain },
      { label: 'Rain chance', value: `${weather.precipitationProb}%`, note: 'Next period', icon: Umbrella },
      { label: 'Wind bearing', value: weather.windDirection, note: 'Surface wind', icon: Compass },
    ];
  }, [weather, windUnit]);

  if ((weatherLoading || forecastLoading) && !weather) return <HomeSkeleton />;

  if (!weather) {
    return (
      <div className="atmo-panel error-state" role="alert">
        <span className="error-state__icon"><CloudRain className="h-7 w-7" /></span>
        <h1>Weather data could not be loaded</h1>
        <p>The last request did not complete. Check the configured source and try again.</p>
        <button type="button" className="action-button" onClick={retryWeather}><RefreshCw className="h-4 w-4" /> Retry</button>
      </div>
    );
  }

  const hasRefreshError = weatherError || forecastError || alertsError;
  const dayProgress = daylightProgress(weather.sunrise, weather.sunset);

  return (
    <motion.div
      className="home-view"
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.07 } } }}
    >
      {hasRefreshError && (
        <div className="home-status-banner" role="status">
          <AlertTriangle className="h-4 w-4" />
          <span>Some data could not refresh. The latest available sample remains visible.</span>
          <button
            type="button"
            onClick={() => {
              retryWeather();
              void retryForecast();
              void retryAlerts();
            }}
          >
            Try again
          </button>
        </div>
      )}

      <motion.section className="current-weather" variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }}>
        <div className="current-weather__main">
          <div className="current-weather__meta">
            <span className="weather-location"><MapPin className="h-4 w-4" /> {weather.location.city}{weather.location.state ? `, ${weather.location.state}` : ''}</span>
            <span className="observation-badge">{isDemo ? 'Simulated observation' : 'Current observation'}</span>
          </div>
          <div className="current-weather__condition">
            <WeatherIcon icon={weather.icon} condition={weather.condition} isDaytime={isDaytime} className="current-weather__icon" label={weather.condition} />
            <div>
              <span>{weather.condition}</span>
              <p>{isDemo ? 'Demo conditions for Chennai' : 'Latest available conditions'}</p>
            </div>
          </div>
          <div className="current-weather__reading">
            <strong>{celsiusToDisplay(weather.currentTemp, temperatureUnit)}°</strong>
            <div>
              <span>Feels like {celsiusToDisplay(weather.feelsLike, temperatureUnit)}{tempSuffix}</span>
              <small>High humidity is adding to the warmth.</small>
            </div>
          </div>
        </div>

        <aside className="current-weather__search" aria-label="Change weather location">
          <span className="eyebrow">Location command</span>
          <h2>Weather, wherever you need it</h2>
          <p>Search cities and districts. Mock mode returns the bundled Chennai demonstration.</p>
          <LocationSearch />
          <div className="search-footnote"><Navigation className="h-4 w-4" /> Coordinates {weather.location.latitude.toFixed(2)}, {weather.location.longitude.toFixed(2)}</div>
        </aside>
      </motion.section>

      <motion.section className="weather-details atmo-panel" aria-labelledby="conditions-title" variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }}>
        <div className="section-heading">
          <div>
            <span className="eyebrow">At a glance</span>
            <h2 id="conditions-title">Conditions around you</h2>
          </div>
          <span className="section-heading__note">Updated from {isDemo ? 'demo dataset' : 'weather service'}</span>
        </div>
        <div className="detail-metrics">
          {detailMetrics.map((metric) => (
            <div key={metric.label} className="detail-metric">
              <metric.icon className="h-5 w-5" aria-hidden="true" />
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <small>{metric.note}</small>
            </div>
          ))}
        </div>
        <div className="daylight-track">
          <div className="daylight-track__label"><Sunrise className="h-4 w-4" /><span><small>Sunrise</small><strong>{weather.sunrise}</strong></span></div>
          <div className="daylight-track__path" aria-label={`Daylight progress ${Math.round(dayProgress)} percent`}>
            <span className="daylight-track__fill" style={{ width: `${dayProgress}%` }} />
            <span className="daylight-track__sun" style={{ left: `${dayProgress}%` }} />
          </div>
          <div className="daylight-track__label daylight-track__label--end"><Sunset className="h-4 w-4" /><span><small>Sunset</small><strong>{weather.sunset}</strong></span></div>
        </div>
      </motion.section>

      <motion.section className="hourly-intelligence atmo-panel" aria-labelledby="hourly-title" variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }}>
        <div className="section-heading">
          <div><span className="eyebrow">Next hours</span><h2 id="hourly-title">How the afternoon unfolds</h2></div>
          <Link to="/forecast" className="text-link">Full forecast <ArrowRight className="h-4 w-4" /></Link>
        </div>
        {forecast && forecast.hourly.length > 0 ? (
          <>
            <div className="hourly-ribbon" role="list" aria-label="Hourly forecast">
              {forecast.hourly.map((hour, index) => (
                <button
                  type="button"
                  role="listitem"
                  key={`${hour.time}-${index}`}
                  className={cn('hourly-point', index === selectedHour && 'hourly-point--active')}
                  aria-pressed={index === selectedHour}
                  onClick={() => setSelectedHour(index)}
                  onFocus={() => setSelectedHour(index)}
                >
                  <span>{hour.time}</span>
                  <WeatherIcon icon={hour.icon} condition={hour.condition} className="h-7 w-7" />
                  <strong>{celsiusToDisplay(hour.temp, temperatureUnit)}°</strong>
                  <small><Droplets className="h-3 w-3" /> {hour.precipitationProb}%</small>
                </button>
              ))}
            </div>
            {activeHour && (
              <div className="hourly-detail" aria-live="polite">
                <div><WeatherIcon icon={activeHour.icon} condition={activeHour.condition} className="h-8 w-8" /><span><strong>{activeHour.time}</strong><small>{activeHour.condition}</small></span></div>
                <p>{activeHour.precipitationProb >= 60 ? 'Rain is likely—plan exposed travel with care.' : 'No significant rain signal in this simulated period.'}</p>
                <strong>{celsiusToDisplay(activeHour.temp, temperatureUnit)}{tempSuffix}</strong>
              </div>
            )}
          </>
        ) : (
          <div className="compact-empty">Hourly values are not available from this source.</div>
        )}
      </motion.section>

      <motion.div className="home-lower-grid" variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }}>
        <section className="alert-briefing atmo-panel" aria-labelledby="home-alerts-title">
          <div className="section-heading">
            <div><span className="eyebrow">Safety briefing</span><h2 id="home-alerts-title">Active alerts</h2></div>
            <Link to="/alerts" className="text-link">Alert centre <ArrowRight className="h-4 w-4" /></Link>
          </div>
          {activeAlerts.length > 0 ? (
            <div className="alert-briefing__list">
              {activeAlerts.slice(0, 2).map((alert) => (
                <Link key={alert.id} to="/alerts" className="alert-briefing__item">
                  <span className={cn('alert-briefing__signal', severityClass(alert.severity))}><AlertTriangle className="h-5 w-5" /></span>
                  <span><small>{alert.severity} · {alert.time}</small><strong>{alert.type}</strong><p>{alert.location}</p></span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="compact-empty">No active warnings for your monitored areas.</div>
          )}
        </section>

        <section className="explore-card atmo-panel" aria-labelledby="explore-title">
          <div className="explore-card__map" aria-hidden="true">
            <span /><span /><span />
            <MapIcon className="h-8 w-8" />
          </div>
          <div className="explore-card__body">
            <span className="eyebrow">Spatial preview · simulated</span>
            <h2 id="explore-title">See the weather move across India</h2>
            <p>Explore temperature, rainfall, wind and risk layers on the interactive map.</p>
            <div><Link to="/map" className="action-button">Open map <ArrowRight className="h-4 w-4" /></Link><Link to="/forecast" className="action-button action-button--quiet">Forecast</Link></div>
          </div>
        </section>
      </motion.div>

      <motion.section className="ask-weather atmo-panel" variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }}>
        <span className="ask-weather__icon"><Bot className="h-6 w-6" /></span>
        <div><span className="eyebrow">WeatherGPT assistant</span><h2>Turn conditions into a clear next step</h2><p>Ask about tomorrow&apos;s rain, active alerts or agricultural guidance using the bundled demo intelligence.</p></div>
        <Link to="/chat" className="action-button">Ask WeatherGPT <ArrowRight className="h-4 w-4" /></Link>
      </motion.section>
    </motion.div>
  );
}
