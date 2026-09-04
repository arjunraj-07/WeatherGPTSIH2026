import { createContext } from 'react';

export type ThemeMode = 'auto' | 'system' | 'light' | 'dark';
export type MotionIntensity = 'full' | 'subtle' | 'off';
export type TemperatureUnit = 'c' | 'f';
export type WindUnit = 'kmh' | 'mph' | 'knots';

export interface PreferencesContextValue {
  isDark: boolean;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  motionIntensity: MotionIntensity;
  setMotionIntensity: (value: MotionIntensity) => void;
  temperatureUnit: TemperatureUnit;
  setTemperatureUnit: (value: TemperatureUnit) => void;
  windUnit: WindUnit;
  setWindUnit: (value: WindUnit) => void;
  severeAlerts: boolean;
  setSevereAlerts: (value: boolean) => void;
  dailySummary: boolean;
  setDailySummary: (value: boolean) => void;
}

export const PreferencesContext = createContext<PreferencesContextValue | null>(null);
