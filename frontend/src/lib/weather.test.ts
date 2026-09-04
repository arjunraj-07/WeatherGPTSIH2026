import { describe, expect, it } from 'vitest';
import { isWeatherDaytime, normalizeWeatherScene, getWeatherIconComponent } from './weather';
import { CloudMoon, CloudSun, Moon, Sun } from 'lucide-react';

describe('weather.ts time and scene logic', () => {
  const mockWeather: any = {
    location: 'Test',
    currentTemp: 25,
    high: 30,
    low: 20,
    condition: 'Clear',
    icon: 'Sun',
    sunrise: '06:30 AM',
    sunset: '06:45 PM',
    precipitation: 0,
    humidity: 50,
    wind: 10,
    uvIndex: 5,
    visibility: 10,
    hourly: [],
    daily: []
  };

  const createKolkataTime = (timeString: string) => new Date(`2026-01-01T${timeString}+05:30`);

  it('identifies before sunrise as night', () => {
    const beforeSunrise = createKolkataTime('05:30:00');
    expect(isWeatherDaytime(mockWeather, 'auto', beforeSunrise)).toBe(false);
  });

  it('identifies after sunrise as day', () => {
    const afterSunrise = createKolkataTime('07:30:00');
    expect(isWeatherDaytime(mockWeather, 'auto', afterSunrise)).toBe(true);
  });

  it('identifies after sunset as night', () => {
    const afterSunset = createKolkataTime('19:30:00');
    expect(isWeatherDaytime(mockWeather, 'auto', afterSunset)).toBe(false);
  });

  it('identifies midnight as night', () => {
    const midnight = createKolkataTime('00:00:00');
    expect(isWeatherDaytime(mockWeather, 'auto', midnight)).toBe(false);
  });

  it('clear changes to clear-night after sunset', () => {
    const day = createKolkataTime('12:00:00');
    const night = createKolkataTime('20:00:00');
    
    expect(normalizeWeatherScene({ ...mockWeather, condition: 'Clear', icon: 'Sun' }, 'auto', day)).toBe('clear-day');
    expect(normalizeWeatherScene({ ...mockWeather, condition: 'Clear', icon: 'Sun' }, 'auto', night)).toBe('clear-night');
  });

  it('partly-cloudy changes to partly-cloudy-night after sunset', () => {
    const day = createKolkataTime('12:00:00');
    const night = createKolkataTime('20:00:00');
    
    expect(normalizeWeatherScene({ ...mockWeather, condition: 'Partly Cloudy', icon: 'Cloud-Sun' }, 'auto', day)).toBe('partly-cloudy-day');
    expect(normalizeWeatherScene({ ...mockWeather, condition: 'Partly Cloudy', icon: 'Cloud-Sun' }, 'auto', night)).toBe('partly-cloudy-night');
  });

  it('manual day/night overrides still work regardless of time', () => {
    const midnight = createKolkataTime('00:00:00');
    const noon = createKolkataTime('12:00:00');
    
    expect(isWeatherDaytime(mockWeather, 'day', midnight)).toBe(true);
    expect(normalizeWeatherScene({ ...mockWeather, condition: 'Clear', icon: 'Sun' }, 'day', midnight)).toBe('clear-day');
    
    expect(isWeatherDaytime(mockWeather, 'night', noon)).toBe(false);
    expect(normalizeWeatherScene({ ...mockWeather, condition: 'Clear', icon: 'Sun' }, 'night', noon)).toBe('clear-night');
  });

  it('maps weather icons based on daytime correctly', () => {
    expect(getWeatherIconComponent('Sun', 'Clear', true)).toBe(Sun);
    expect(getWeatherIconComponent('Sun', 'Clear', false)).toBe(Moon);
    expect(getWeatherIconComponent('Cloud-Sun', 'Partly Cloudy', true)).toBe(CloudSun);
    expect(getWeatherIconComponent('Cloud-Sun', 'Partly Cloudy', false)).toBe(CloudMoon);
  });
});
