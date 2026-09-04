import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ThemeProvider } from './ThemeContext';
import { WeatherProvider } from './WeatherContext';
import { MemoryRouter } from 'react-router-dom';
import WeatherScene from '../components/WeatherScene';
import { useWeather } from '../hooks/useWeather';

describe('ThemeContext integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    // mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query.includes('dark') ? false : true, // default to light for system
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('defaults to auto appearance and reflects day/night correctly', () => {
    // Day
    vi.setSystemTime(new Date('2026-01-01T12:00:00+05:30'));
    
    const { unmount } = render(
      <WeatherProvider>
        <ThemeProvider>
          <div />
        </ThemeProvider>
      </WeatherProvider>
    );

    // Initial default is 'auto' and day time -> light theme
    expect(localStorage.getItem('theme')).toBeNull(); // not saved initially, implies auto
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    // Change to night
    vi.setSystemTime(new Date('2026-01-01T20:00:00+05:30'));
    act(() => {
      vi.advanceTimersByTime(60000); // trigger interval
    });

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    
    unmount();
  });

  it('respects explicit appearance precedence over time-of-day', () => {
    // Night time
    vi.setSystemTime(new Date('2026-01-01T20:00:00+05:30'));
    localStorage.setItem('theme', 'light');

    const { unmount } = render(
      <WeatherProvider>
        <ThemeProvider>
          <div />
        </ThemeProvider>
      </WeatherProvider>
    );

    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    // Change to day time
    vi.setSystemTime(new Date('2026-01-01T12:00:00+05:30'));
    localStorage.setItem('theme', 'dark');

    // Unmount and remount to load from localStorage
    unmount();
    
    const { unmount: unmount2 } = render(
      <WeatherProvider>
        <ThemeProvider>
          <div />
        </ThemeProvider>
      </WeatherProvider>
    );
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    
    unmount2();
  });

  it('integrates with Scene Lab day/night overrides', () => {
    vi.setSystemTime(new Date('2026-01-01T12:00:00+05:30')); // Day

    let setTimeOverrideRef: any;

    const TestComponent = () => {
      const { setTimeOverride } = useWeather();
      // eslint-disable-next-line react/globals
      setTimeOverrideRef = setTimeOverride;
      return null;
    };

    const { unmount } = render(
      <MemoryRouter>
        <WeatherProvider>
          <ThemeProvider>
            <WeatherScene />
            <TestComponent />
          </ThemeProvider>
        </WeatherProvider>
      </MemoryRouter>
    );

    expect(document.documentElement.classList.contains('dark')).toBe(false);
    
    // Override to night
    act(() => {
      setTimeOverrideRef('night');
    });

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.getAttribute('data-weather-phase')).toBe('night');

    // Override to day
    act(() => {
      setTimeOverrideRef('day');
    });

    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.getAttribute('data-weather-phase')).toBe('day');

    // Back to auto (it is 12:00 PM, so day)
    act(() => {
      setTimeOverrideRef('auto');
    });

    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.getAttribute('data-weather-phase')).toBe('day');

    unmount();
  });
});
