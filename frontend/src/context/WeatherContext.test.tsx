import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WeatherProvider } from './WeatherContext';
import { ThemeProvider } from './ThemeContext';
import WeatherScene from '../components/WeatherScene';
import { MemoryRouter } from 'react-router-dom';

describe('WeatherContext integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
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

  it('automatically transitions from day to night while mounted', () => {
    // Simulated sunset is 06:22 PM (18:22)
    // Start at 18:21 (06:21 PM)
    vi.setSystemTime(new Date('2026-01-01T18:21:00+05:30'));

    const { container, unmount } = render(
      <MemoryRouter>
        <WeatherProvider>
          <ThemeProvider>
            <WeatherScene />
          </ThemeProvider>
        </WeatherProvider>
      </MemoryRouter>
    );

    const scene = container.querySelector('.weather-scene');
    expect(scene?.getAttribute('data-scene')).toBe('partly-cloudy-day');
    expect(document.documentElement.getAttribute('data-weather-phase')).toBe('day');

    // Advance by 1 minute
    act(() => {
      vi.advanceTimersByTime(60000);
    });

    expect(scene?.getAttribute('data-scene')).toBe('partly-cloudy-night');
    expect(document.documentElement.getAttribute('data-weather-phase')).toBe('night');
    
    unmount();
  });

  it('recovers visibility and immediately updates phase', () => {
    // Start at day
    vi.setSystemTime(new Date('2026-01-01T12:00:00+05:30'));

    const { unmount } = render(
      <MemoryRouter>
        <WeatherProvider>
          <ThemeProvider>
            <WeatherScene />
          </ThemeProvider>
        </WeatherProvider>
      </MemoryRouter>
    );

    expect(document.documentElement.getAttribute('data-weather-phase')).toBe('day');

    // Simulate document hidden
    let isHidden = true;
    vi.spyOn(document, 'hidden', 'get').mockImplementation(() => isHidden);
    
    // Advance time beyond sunset (18:22) -> let's say 20:00
    vi.setSystemTime(new Date('2026-01-01T20:00:00+05:30'));
    
    // During this time, the interval in WeatherProvider might not update or might be ignored
    // Let's explicitly trigger the visibility change event.
    isHidden = false;
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Verify the phase immediately updates to night
    expect(document.documentElement.getAttribute('data-weather-phase')).toBe('night');
    
    unmount();
  });
});
