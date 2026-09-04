import { memo, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useWeather } from '../hooks/useWeather';
import { usePreferences } from '../hooks/usePreferences';
import { normalizeWeatherScene, type SceneVariant } from '../lib/weather';

const sceneNames: Record<SceneVariant, string> = {
  'clear-day': 'Clear day',
  'clear-night': 'Clear night',
  'partly-cloudy-day': 'Partly cloudy day',
  'partly-cloudy-night': 'Partly cloudy night',
  overcast: 'Overcast',
  drizzle: 'Light rain',
  rain: 'Rain',
  monsoon: 'Heavy monsoon rain',
  thunderstorm: 'Thunderstorm',
  snow: 'Snow or sleet',
  fog: 'Fog, mist or haze',
  heat: 'Extreme heat',
  fallback: 'Atmospheric conditions',
};

function useSceneActivity() {
  const [hidden, setHidden] = useState(document.hidden);
  const [prefersReduced, setPrefersReduced] = useState(
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleVisibility = () => setHidden(document.hidden);
    const handleMotion = (event: MediaQueryListEvent) => setPrefersReduced(event.matches);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);
    media.addEventListener('change', handleMotion);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
      media.removeEventListener('change', handleMotion);
    };
  }, []);

  return { hidden, prefersReduced };
}

function Lightning({ active }: { active: boolean }) {
  const [illuminated, setIlluminated] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);
  const pulseRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!active) return undefined;
    let cancelled = false;
    const schedule = () => {
      const delay = 5200 + Math.round(Math.random() * 7200);
      timerRef.current = window.setTimeout(() => {
        if (cancelled || document.hidden) {
          schedule();
          return;
        }
        setIlluminated(true);
        pulseRef.current = window.setTimeout(() => {
          setIlluminated(false);
          if (!cancelled) schedule();
        }, 170);
      }, delay);
    };
    schedule();
    return () => {
      cancelled = true;
      window.clearTimeout(timerRef.current);
      window.clearTimeout(pulseRef.current);
      setIlluminated(false);
    };
  }, [active]);

  return (
    <div className={`scene-lightning ${illuminated ? 'scene-lightning--visible' : ''}`} aria-hidden="true">
      <div className="scene-bolt" />
    </div>
  );
}

function Clouds({ dense = false }: { dense?: boolean }) {
  return (
    <div className={`scene-cloud-field ${dense ? 'scene-cloud-field--dense' : ''}`} aria-hidden="true">
      <span className="scene-cloud scene-cloud--one" />
      <span className="scene-cloud scene-cloud--two" />
      <span className="scene-cloud scene-cloud--three" />
      <span className="scene-cloud scene-cloud--four" />
    </div>
  );
}

function Rain({ density }: { density: 'light' | 'normal' | 'heavy' }) {
  return (
    <div className={`scene-rain scene-rain--${density}`} aria-hidden="true">
      <span className="scene-rain-layer scene-rain-layer--far" />
      <span className="scene-rain-layer scene-rain-layer--mid" />
      <span className="scene-rain-layer scene-rain-layer--near" />
    </div>
  );
}

function Snow() {
  const flakes = useMemo(() => Array.from({ length: 28 }, (_, index) => index), []);
  return (
    <div className="scene-snow" aria-hidden="true">
      {flakes.map((flake) => {
        const style = {
          '--flake-x': `${(flake * 37) % 101}%`,
          '--flake-delay': `${-((flake * 0.63) % 9)}s`,
          '--flake-duration': `${7 + (flake % 6)}s`,
          '--flake-size': `${3 + (flake % 5)}px`,
          '--flake-drift': `${12 + (flake % 4) * 8}px`,
        } as CSSProperties;
        return <span key={flake} style={style} />;
      })}
    </div>
  );
}

function SceneContent({ scene, animate }: { scene: SceneVariant; animate: boolean }) {
  const cloudy = ['partly-cloudy-day', 'partly-cloudy-night', 'overcast', 'drizzle', 'rain', 'monsoon', 'thunderstorm'].includes(scene);
  const denseClouds = ['overcast', 'monsoon', 'thunderstorm'].includes(scene);

  return (
    <>
      {['clear-day', 'partly-cloudy-day', 'heat'].includes(scene) && <div className="scene-sun" aria-hidden="true" />}
      {['clear-night', 'partly-cloudy-night'].includes(scene) && (
        <>
          <div className="scene-stars" aria-hidden="true" />
          <div className="scene-moon" aria-hidden="true" />
        </>
      )}
      {cloudy && <Clouds dense={denseClouds} />}
      {scene === 'drizzle' && <Rain density="light" />}
      {scene === 'rain' && <Rain density="normal" />}
      {['monsoon', 'thunderstorm'].includes(scene) && <Rain density="heavy" />}
      {scene === 'thunderstorm' && <Lightning active={animate} />}
      {scene === 'snow' && <Snow />}
      {scene === 'fog' && (
        <div className="scene-fog" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      )}
      {scene === 'heat' && <div className="scene-heat-shimmer" aria-hidden="true" />}
      <div className="scene-horizon" aria-hidden="true" />
      <div className="scene-vignette" aria-hidden="true" />
    </>
  );
}

function WeatherScene() {
  const location = useLocation();
  const { weather, sceneOverride, timeOverride, now, isDaytime } = useWeather();
  const { motionIntensity } = usePreferences();
  const { hidden, prefersReduced } = useSceneActivity();

  const automaticScene = useMemo(() => normalizeWeatherScene(weather, timeOverride, now), [weather, timeOverride, now]);
  const scene = sceneOverride === 'auto' ? automaticScene : sceneOverride;

  useEffect(() => {
    document.documentElement.setAttribute('data-weather-phase', isDaytime ? 'day' : 'night');
  }, [isDaytime]);

  const isMapActive = location.pathname === '/map';
  const effectiveMotion = prefersReduced ? 'off' : motionIntensity;
  const animate = effectiveMotion !== 'off' && !hidden && !isMapActive;

  return (
    <div
      className="weather-scene"
      data-scene={scene}
      data-motion={effectiveMotion}
      data-paused={!animate}
      aria-hidden="true"
    >
      <AnimatePresence initial={false} mode="sync">
        <motion.div
          key={scene}
          className={`weather-scene__state weather-scene__state--${scene}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: effectiveMotion === 'off' ? 0.25 : 1.1, ease: 'easeInOut' }}
        >
          <SceneContent scene={scene} animate={animate} />
        </motion.div>
      </AnimatePresence>
      <span className="sr-only">{sceneNames[scene]}</span>
    </div>
  );
}

export default memo(WeatherScene);

