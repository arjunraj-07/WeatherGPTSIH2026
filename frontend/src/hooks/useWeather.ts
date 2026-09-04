import { useContext } from 'react';
import { WeatherContext } from '../context/weather-context';

export function useWeather() {
  const context = useContext(WeatherContext);
  if (!context) throw new Error('useWeather must be used within WeatherProvider');
  return context;
}
