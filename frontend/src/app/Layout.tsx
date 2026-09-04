import { useEffect, useRef, useState, type ComponentType } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  ChevronLeft,
  ChevronRight,
  CloudSun,
  Home,
  Map as MapIcon,
  Menu,
  Moon,
  PlaneTakeoff,
  Settings,
  Sun,
  X,
} from 'lucide-react';
import WeatherScene from '../components/WeatherScene';
import LocationSearch from '../components/LocationSearch';
import { AlertService } from '../services/api';
import { mockAlerts } from '../data/mockData';
import { usePreferences } from '../hooks/usePreferences';
import { cn, severityClass } from '../lib/weather';

interface NavigationItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const pageTitles: Record<string, string> = {
  '/': 'Weather at a glance',
  '/map': 'Weather exploration',
  '/forecast': 'Forecast',
  '/alerts': 'Weather alerts',
  '/aviation': 'Aviation weather',
  '/climate': 'Climate trends',
  '/advisories': 'Sector advisories',
  '/settings': 'Settings',
  '/chat': 'Ask WeatherGPT',
};

export default function Layout() {
  const { t } = useTranslation();
  const location = useLocation();
  const { isDark, toggleTheme } = usePreferences();
  const [railExpanded, setRailExpanded] = useState(true);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreCloseRef = useRef<HTMLButtonElement>(null);
  const isDemo = import.meta.env.VITE_DATA_MODE !== 'api';
  const { data: alerts = mockAlerts } = useSWR('shell-alerts', () => AlertService.getAlerts(), {
    fallbackData: mockAlerts,
    revalidateOnFocus: false,
  });
  const activeAlerts = alerts.filter((alert) => alert.status === 'Active');
  const isImmersive = location.pathname === '/map' || location.pathname === '/chat';

  const navItems: NavigationItem[] = [
    { to: '/', icon: Home, label: t('home') },
    { to: '/map', icon: MapIcon, label: t('maps') },
    { to: '/forecast', icon: CloudSun, label: t('forecast') },
    { to: '/alerts', icon: AlertTriangle, label: t('alerts') },
    { to: '/aviation', icon: PlaneTakeoff, label: t('aviation') },
    { to: '/climate', icon: BarChart3, label: t('climate') },
    { to: '/advisories', icon: BookOpen, label: t('advisories') },
    { to: '/chat', icon: Bot, label: t('askWeather') },
    { to: '/settings', icon: Settings, label: t('settings') },
  ];

  const primaryMobile = navItems.filter((item) => ['/', '/map', '/forecast', '/alerts', '/chat'].includes(item.to));
  const moreItems = navItems.filter((item) => ['/aviation', '/climate', '/advisories', '/settings'].includes(item.to));

  function closeOverlays() {
    setAlertsOpen(false);
    setMoreOpen(false);
  }

  useEffect(() => {
    document.title = `${pageTitles[location.pathname] ?? 'WeatherGPT'} · WeatherGPT`;
  }, [location.pathname]);

  useEffect(() => {
    if (!alertsOpen && !moreOpen) return undefined;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAlertsOpen(false);
        setMoreOpen(false);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [alertsOpen, moreOpen]);

  useEffect(() => {
    if (moreOpen) moreCloseRef.current?.focus();
  }, [moreOpen]);

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <WeatherScene />

      <aside className={cn('atmo-rail', !railExpanded && 'atmo-rail--collapsed')} aria-label="Primary navigation">
        <div className="atmo-rail__brand">
          <Link to="/" className="brand-mark" aria-label="WeatherGPT home" onClick={closeOverlays}>
            <span className="brand-mark__symbol"><CloudSun className="h-5 w-5" /></span>
            <span className="brand-mark__copy">
              <strong>WeatherGPT</strong>
              <small>Atmospheric intelligence</small>
            </span>
          </Link>
        </div>

        <nav className="atmo-rail__nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              title={!railExpanded ? item.label : undefined}
              className={({ isActive }) => cn('rail-link', isActive && 'rail-link--active')}
              onClick={closeOverlays}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          className="rail-toggle"
          onClick={() => setRailExpanded((value) => !value)}
          aria-label={railExpanded ? 'Collapse navigation rail' : 'Expand navigation rail'}
          aria-expanded={railExpanded}
        >
          {railExpanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span>{railExpanded ? 'Collapse' : 'Expand'}</span>
        </button>
      </aside>

      <div className="app-frame">
        <header className="command-bar">
          <Link to="/" className="command-bar__mobile-brand" aria-label="WeatherGPT home" onClick={closeOverlays}>
            <CloudSun className="h-5 w-5" />
          </Link>
          <div className="command-bar__search">
            <LocationSearch compact />
          </div>
          <div className="command-bar__actions">
            <span className="data-status" title={isDemo ? 'Self-contained sample weather data' : 'Connected to configured API'}>
              <span className="data-status__pulse" />
              <span>{isDemo ? 'Demo data' : 'API data'}</span>
            </span>
            <div className="command-popover">
              <button
                type="button"
                className="icon-button"
                onClick={() => setAlertsOpen((value) => !value)}
                aria-label={`${activeAlerts.length} active weather alerts`}
                aria-expanded={alertsOpen}
                aria-haspopup="true"
              >
                <Bell className="h-5 w-5" />
                {activeAlerts.length > 0 && <span className="notification-count">{activeAlerts.length}</span>}
              </button>
              <AnimatePresence>
                {alertsOpen && (
                  <motion.div
                    className="alert-popover"
                    role="region"
                    aria-label="Active alert summary"
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                  >
                    <div className="alert-popover__header">
                      <div>
                        <strong>Active alerts</strong>
                        <span>{activeAlerts.length} for monitored areas</span>
                      </div>
                      <button type="button" className="icon-button icon-button--small" onClick={() => setAlertsOpen(false)} aria-label="Close alerts popover">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="alert-popover__list">
                      {activeAlerts.slice(0, 2).map((alert) => (
                        <Link key={alert.id} to="/alerts" className="alert-popover__item" onClick={closeOverlays}>
                          <span className={cn('severity-dot', severityClass(alert.severity))} />
                          <span><strong>{alert.type}</strong><small>{alert.location}</small></span>
                        </Link>
                      ))}
                      {activeAlerts.length === 0 && <p className="alert-popover__empty">No active warnings for monitored areas.</p>}
                    </div>
                    <Link to="/alerts" className="text-link" onClick={closeOverlays}>Open alert centre <ChevronRight className="h-4 w-4" /></Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button type="button" className="icon-button" onClick={toggleTheme} aria-label={`Switch to ${isDark ? 'light' : 'dark'} appearance`} title="Change appearance">
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
        </header>

        <main id="main-content" className={cn('main-content', isImmersive && 'main-content--immersive')} tabIndex={-1}>
          <Outlet />
        </main>
      </div>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {primaryMobile.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => cn('mobile-nav__link', isActive && 'mobile-nav__link--active')}
            onClick={closeOverlays}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.to === '/chat' ? 'Ask' : item.label}</span>
          </NavLink>
        ))}
        <button type="button" className={cn('mobile-nav__link', moreOpen && 'mobile-nav__link--active')} onClick={() => setMoreOpen(true)} aria-haspopup="dialog" aria-expanded={moreOpen}>
          <Menu className="h-5 w-5" />
          <span>{t('more')}</span>
        </button>
      </nav>

      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.button
              type="button"
              className="sheet-backdrop"
              aria-label="Close more navigation"
              onClick={() => setMoreOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="more-sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby="more-sheet-title"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="more-sheet__handle" />
              <div className="more-sheet__header">
                <div>
                  <span className="eyebrow">Navigation</span>
                  <h2 id="more-sheet-title">More weather tools</h2>
                </div>
                <button ref={moreCloseRef} type="button" className="icon-button" onClick={() => setMoreOpen(false)} aria-label="Close more menu">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="more-sheet__links">
                {moreItems.map((item) => (
                  <NavLink key={item.to} to={item.to} className="more-sheet__link" onClick={closeOverlays}>
                    <span><item.icon className="h-5 w-5" /></span>
                    <strong>{item.label}</strong>
                    <ChevronRight className="h-4 w-4" />
                  </NavLink>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
