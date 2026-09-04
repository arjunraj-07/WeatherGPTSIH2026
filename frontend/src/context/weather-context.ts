import { createContext } from 'react';
import type { SceneVariant, TimeOverride } from '../lib/weather';
import type { Location, WeatherData } from '../types/models';

export interface WeatherContextValue {
  weather: WeatherData | null;
  isLoading: boolean;
  error: Error | undefined;
  retry: () => void;
  selectLocation: (location: Location) => void;
  selectedCity?: string;
  sceneOverride: SceneVariant | 'auto';
  setSceneOverride: (scene: SceneVariant | 'auto') => void;
  timeOverride: TimeOverride;
  setTimeOverride: (value: TimeOverride) => void;
  now: Date;
  isDaytime: boolean;
}

export const WeatherContext = createContext<WeatherContextValue | null>(null);
