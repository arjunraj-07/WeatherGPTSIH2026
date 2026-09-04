import { useCallback, useMemo, useState, type ReactNode } from 'react';
import useSWR from 'swr';
import { WeatherContext } from './weather-context';
import { mockWeatherData } from '../data/mockData';
import type { Location, WeatherData } from '../types/models';
import { WeatherService } from '../services/api';
import type { SceneVariant, TimeOverride } from '../lib/weather';

export function WeatherProvider({ children }: { children: ReactNode }) {
  const [selectedCity, setSelectedCity] = useState<string>();
  const [sceneOverride, setSceneOverride] = useState<SceneVariant | 'auto'>('auto');
  const [timeOverride, setTimeOverride] = useState<TimeOverride>('auto');
  const { data, error, isLoading, mutate } = useSWR<WeatherData>(
    ['current-weather', selectedCity ?? 'current'],
    () => WeatherService.getCurrentWeather(selectedCity),
    { fallbackData: mockWeatherData, revalidateOnFocus: false },
  );

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
    }),
    [data, error, isLoading, retry, sceneOverride, selectLocation, selectedCity, timeOverride],
  );

  return <WeatherContext.Provider value={value}>{children}</WeatherContext.Provider>;
}
