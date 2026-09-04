import type { ComponentType } from 'react';
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSun,
  Moon,
  Snowflake,
  Sun,
  ThermometerSun,
} from 'lucide-react';
import type { WeatherAlert, WeatherData } from '../types/models';

export type SceneVariant =
  | 'clear-day'
  | 'clear-night'
  | 'partly-cloudy-day'
  | 'partly-cloudy-night'
  | 'overcast'
  | 'drizzle'
  | 'rain'
  | 'monsoon'
  | 'thunderstorm'
  | 'snow'
  | 'fog'
  | 'heat'
  | 'fallback';

export type TimeOverride = 'auto' | 'day' | 'night';

export const SCENE_OPTIONS: Array<{ value: SceneVariant | 'auto'; label: string }> = [
  { value: 'auto', label: 'Automatic' },
  { value: 'clear-day', label: 'Clear day' },
  { value: 'clear-night', label: 'Clear night' },
  { value: 'partly-cloudy-day', label: 'Partly cloudy day' },
  { value: 'partly-cloudy-night', label: 'Partly cloudy night' },
  { value: 'overcast', label: 'Overcast' },
  { value: 'drizzle', label: 'Light rain / drizzle' },
  { value: 'rain', label: 'Rain' },
  { value: 'monsoon', label: 'Heavy rain / monsoon' },
  { value: 'thunderstorm', label: 'Thunderstorm' },
  { value: 'snow', label: 'Snow / sleet' },
  { value: 'fog', label: 'Fog / mist / haze' },
  { value: 'heat', label: 'Extreme heat' },
  { value: 'fallback', label: 'Safe fallback' },
];

function parseClock(value: string): number | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3]?.toUpperCase();
  if (period === 'AM' && hour === 12) hour = 0;
  if (period === 'PM' && hour !== 12) hour += 12;
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
}

function indiaMinutesForDate(date: Date = new Date()): number {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
    const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 12);
    const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0);
    return hour * 60 + minute;
  } catch {
    return 12 * 60;
  }
}

export function isWeatherDaytime(weather?: WeatherData | null, override: TimeOverride = 'auto', now: Date = new Date()) {
  if (override !== 'auto') return override === 'day';
  const icon = weather?.icon.toLowerCase() ?? '';
  if (icon.includes('night') || icon.includes('moon')) return false;
  const sunrise = weather ? parseClock(weather.sunrise) : null;
  const sunset = weather ? parseClock(weather.sunset) : null;
  if (sunrise !== null && sunset !== null) {
    const currentMinutes = indiaMinutesForDate(now);
    return currentMinutes >= sunrise && currentMinutes < sunset;
  }
  const hour = now.getHours();
  return hour >= 6 && hour < 18;
}

export function normalizeWeatherScene(
  weather?: WeatherData | null,
  timeOverride: TimeOverride = 'auto',
  now: Date = new Date()
): SceneVariant {
  if (!weather) return 'fallback';
  const descriptor = `${weather.condition} ${weather.icon}`.toLowerCase();
  const daytime = isWeatherDaytime(weather, timeOverride, now);

  if (/thunder|lightning|storm/.test(descriptor)) return 'thunderstorm';
  if (/monsoon|torrential|downpour|heavy rain/.test(descriptor)) return 'monsoon';
  if (/drizzle|light rain|sprinkle/.test(descriptor)) return 'drizzle';
  if (/rain|shower/.test(descriptor)) return 'rain';
  if (/snow|sleet|flurr/.test(descriptor)) return 'snow';
  if (/fog|mist|haze|smog/.test(descriptor)) return 'fog';
  if (/heat|hot|scorch/.test(descriptor) || weather.currentTemp >= 40) return 'heat';
  if (/partly|mostly sunny|cloud-sun|cloud-moon/.test(descriptor)) {
    return daytime ? 'partly-cloudy-day' : 'partly-cloudy-night';
  }
  if (/overcast|cloud/.test(descriptor)) return 'overcast';
  if (/clear|sunny|sun|moon/.test(descriptor)) return daytime ? 'clear-day' : 'clear-night';
  return 'fallback';
}

export function getWeatherIconComponent(
  icon = '',
  condition = '',
): ComponentType<{ className?: string; 'aria-hidden'?: boolean; 'aria-label'?: string }> {
  const descriptor = `${icon} ${condition}`.toLowerCase();
  if (/thunder|lightning|storm/.test(descriptor)) return CloudLightning;
  if (/drizzle|light rain/.test(descriptor)) return CloudDrizzle;
  if (/rain|shower|monsoon/.test(descriptor)) return CloudRain;
  if (/snow|sleet/.test(descriptor)) return Snowflake;
  if (/fog|mist|haze/.test(descriptor)) return CloudFog;
  if (/heat|hot/.test(descriptor)) return ThermometerSun;
  if (/cloud-moon|partly.*night/.test(descriptor)) return CloudMoon;
  if (/cloud-sun|partly/.test(descriptor)) return CloudSun;
  if (/cloud|overcast/.test(descriptor)) return Cloud;
  if (/moon|night/.test(descriptor)) return Moon;
  return Sun;
}

export const severityOrder: WeatherAlert['severity'][] = ['Extreme', 'Severe', 'Moderate', 'Minor'];

export function severityClass(severity: WeatherAlert['severity']) {
  return `severity-${severity.toLowerCase()}`;
}

export function celsiusToDisplay(value: number, unit: 'c' | 'f') {
  return unit === 'f' ? Math.round((value * 9) / 5 + 32) : Math.round(value);
}

export function temperatureSuffix(unit: 'c' | 'f') {
  return unit === 'f' ? '°F' : '°C';
}

export function windToDisplay(value: number, unit: 'kmh' | 'mph' | 'knots') {
  if (unit === 'mph') return Math.round(value * 0.621371);
  if (unit === 'knots') return Math.round(value * 0.539957);
  return Math.round(value);
}

export function windUnitLabel(unit: 'kmh' | 'mph' | 'knots') {
  if (unit === 'mph') return 'mph';
  if (unit === 'knots') return 'kt';
  return 'km/h';
}

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}
