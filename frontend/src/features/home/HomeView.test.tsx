import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import HomeView from './HomeView';
import { MemoryRouter } from 'react-router-dom';
import * as useWeatherHook from '../../hooks/useWeather';
import * as usePreferencesHook from '../../hooks/usePreferences';
import { mockWeatherData } from '../../data/mockData';

// Mock the Lucide icons to verify which one is rendered
vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react');
  return {
    ...actual,
    CloudSun: (props: any) => <svg data-testid="icon-cloud-sun" {...props} />,
    CloudMoon: (props: any) => <svg data-testid="icon-cloud-moon" {...props} />,
    Sun: (props: any) => <svg data-testid="icon-sun" {...props} />,
    Moon: (props: any) => <svg data-testid="icon-moon" {...props} />,
  };
});

describe('HomeView icon integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    
    // Mock usePreferences so HomeView can render without ThemeProvider throwing
    vi.spyOn(usePreferencesHook, 'usePreferences').mockReturnValue({
      temperatureUnit: 'c',
      windUnit: 'kmh',
    } as any);
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const renderWithWeather = (icon: string, condition: string, isDaytime: boolean) => {
    vi.spyOn(useWeatherHook, 'useWeather').mockReturnValue({
      weather: { ...mockWeatherData, icon, condition },
      isDaytime,
      isLoading: false,
      error: undefined,
      retry: vi.fn(),
      selectLocation: vi.fn(),
      sceneOverride: 'auto',
      setSceneOverride: vi.fn(),
      timeOverride: 'auto',
      setTimeOverride: vi.fn(),
      now: new Date()
    } as any);

    const { unmount } = render(
      <MemoryRouter>
        <HomeView />
      </MemoryRouter>
    );
    
    return { unmount };
  };

  it('uses CloudSun for partly cloudy daytime', () => {
    const { unmount } = renderWithWeather('cloud-sun', 'Partly Cloudy', true);
    // Since there are multiple icons on the page (hourly forecast), we check the main one.
    // The main one is inside .current-weather__condition.
    const container = document.querySelector('.current-weather__condition');
    expect(container?.querySelector('[data-testid="icon-cloud-sun"]')).not.toBeNull();
    unmount();
  });

  it('uses CloudMoon for partly cloudy nighttime', () => {
    const { unmount } = renderWithWeather('cloud-sun', 'Partly Cloudy', false);
    const container = document.querySelector('.current-weather__condition');
    expect(container?.querySelector('[data-testid="icon-cloud-moon"]')).not.toBeNull();
    unmount();
  });

  it('uses Sun for clear daytime', () => {
    const { unmount } = renderWithWeather('sun', 'Clear', true);
    const container = document.querySelector('.current-weather__condition');
    expect(container?.querySelector('[data-testid="icon-sun"]')).not.toBeNull();
    unmount();
  });

  it('uses Moon for clear nighttime', () => {
    const { unmount } = renderWithWeather('sun', 'Clear', false);
    const container = document.querySelector('.current-weather__condition');
    expect(container?.querySelector('[data-testid="icon-moon"]')).not.toBeNull();
    unmount();
  });
});
