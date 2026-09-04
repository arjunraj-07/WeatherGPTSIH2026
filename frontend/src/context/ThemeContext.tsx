import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  PreferencesContext,
  type MotionIntensity,
  type TemperatureUnit,
  type ThemeMode,
  type WindUnit,
} from './preferences-context';

function storedValue<T extends string>(key: string, options: readonly T[], fallback: T): T {
  const value = localStorage.getItem(key) as T | null;
  return value && options.includes(value) ? value : fallback;
}

function storedBoolean(key: string, fallback: boolean) {
  const value = localStorage.getItem(key);
  if (value === null) return fallback;
  return value === 'true';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() =>
    storedValue('theme', ['system', 'light', 'dark'] as const, 'system'),
  );
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  const [motionIntensity, setMotionState] = useState<MotionIntensity>(() =>
    storedValue('weather-motion', ['full', 'subtle', 'off'] as const, 'full'),
  );
  const [temperatureUnit, setTemperatureState] = useState<TemperatureUnit>(() =>
    storedValue('temperature-unit', ['c', 'f'] as const, 'c'),
  );
  const [windUnit, setWindState] = useState<WindUnit>(() =>
    storedValue('wind-unit', ['kmh', 'mph', 'knots'] as const, 'kmh'),
  );
  const [severeAlerts, setSevereAlertsState] = useState(() => storedBoolean('severe-alerts', true));
  const [dailySummary, setDailySummaryState] = useState(() => storedBoolean('daily-summary', false));

  const isDark = theme === 'dark' || (theme === 'system' && systemDark);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  }, [isDark]);

  const setTheme = useCallback((value: ThemeMode) => {
    setThemeState(value);
    localStorage.setItem('theme', value);
  }, []);

  const toggleTheme = useCallback(() => setTheme(isDark ? 'light' : 'dark'), [isDark, setTheme]);

  const setMotionIntensity = useCallback((value: MotionIntensity) => {
    setMotionState(value);
    localStorage.setItem('weather-motion', value);
  }, []);

  const setTemperatureUnit = useCallback((value: TemperatureUnit) => {
    setTemperatureState(value);
    localStorage.setItem('temperature-unit', value);
  }, []);

  const setWindUnit = useCallback((value: WindUnit) => {
    setWindState(value);
    localStorage.setItem('wind-unit', value);
  }, []);

  const setSevereAlerts = useCallback((value: boolean) => {
    setSevereAlertsState(value);
    localStorage.setItem('severe-alerts', String(value));
  }, []);

  const setDailySummary = useCallback((value: boolean) => {
    setDailySummaryState(value);
    localStorage.setItem('daily-summary', String(value));
  }, []);

  const value = useMemo(
    () => ({
      isDark,
      theme,
      setTheme,
      toggleTheme,
      motionIntensity,
      setMotionIntensity,
      temperatureUnit,
      setTemperatureUnit,
      windUnit,
      setWindUnit,
      severeAlerts,
      setSevereAlerts,
      dailySummary,
      setDailySummary,
    }),
    [
      dailySummary,
      isDark,
      motionIntensity,
      setDailySummary,
      setMotionIntensity,
      setSevereAlerts,
      setTemperatureUnit,
      setTheme,
      setWindUnit,
      severeAlerts,
      temperatureUnit,
      theme,
      toggleTheme,
      windUnit,
    ],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}
