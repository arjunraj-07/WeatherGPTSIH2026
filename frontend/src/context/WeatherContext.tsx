import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import useSWR from 'swr';
import { WeatherContext } from './weather-context';
import { mockWeatherData } from '../data/mockData';
import type { Location, WeatherData } from '../types/models';
import { WeatherService } from '../services/api';
import { isWeatherDaytime, type SceneVariant, type TimeOverride } from '../lib/weather';

export function WeatherProvider({ children }: { children: ReactNode }) {
  const [selectedCity, setSelectedCity] = useState<string>();
  const [sceneOverride, setSceneOverride] = useState<SceneVariant | 'auto'>('auto');
  const [timeOverride, setTimeOverride] = useState<TimeOverride>('auto');
  const [now, setNow] = useState(new Date());

  const { data, error, isLoading, mutate } = useSWR<WeatherData>(
    ['current-weather', selectedCity ?? 'current'],
    () => WeatherService.getCurrentWeather(selectedCity),
    { fallbackData: mockWeatherData, revalidateOnFocus: false },
  );

  useEffect(() => {
    const handleTimeCheck = () => {
      if (timeOverride === 'auto') {
        setNow(new Date());
      }
    };

    document.addEventListener('visibilitychange', handleTimeCheck);
    window.addEventListener('focus', handleTimeCheck);
    const interval = window.setInterval(handleTimeCheck, 60000);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleTimeCheck);
      window.removeEventListener('focus', handleTimeCheck);
    };
  }, [timeOverride]);

  const isDaytime = useMemo(() => isWeatherDaytime(data ?? null, timeOverride, now), [data, timeOverride, now]);

  const selectLocation = useCallback((location: Location) => setSelectedCity(location.city), []);
  const retry = useCallback(() => {
    void mutate();
  }, [mutate]);

  const value = useMemo(
    () => ({
      weather: data ?? null,
      isLoading,
      error,
      retry,
      selectLocation,
      selectedCity,
      sceneOverride,
      setSceneOverride,
      timeOverride,
      setTimeOverride,
      now,
      isDaytime,
    }),
    [data, error, isLoading, retry, sceneOverride, selectLocation, selectedCity, timeOverride, now, isDaytime],
  );

  return <WeatherContext.Provider value={value}>{children}</WeatherContext.Provider>;
}
