import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n/config';
import Layout from './Layout';
import { ThemeProvider } from '../context/ThemeContext';
import { WeatherProvider } from '../context/WeatherContext';

const HomeView = lazy(() => import('../features/home/HomeView'));
const MapView = lazy(() => import('../features/map/MapView'));
const ForecastView = lazy(() => import('../features/forecast/ForecastView'));
const AlertsView = lazy(() => import('../features/alerts/AlertsView'));
const AviationView = lazy(() => import('../features/aviation/AviationView'));
const ClimateView = lazy(() => import('../features/climate/ClimateView'));
const AdvisoriesView = lazy(() => import('../features/advisories/AdvisoriesView'));
const SettingsView = lazy(() => import('../features/settings/SettingsView'));
const ChatView = lazy(() => import('../features/chat/ChatView'));

function RouteFallback() {
  return (
    <div className="route-fallback" role="status" aria-label="Loading weather workspace">
      <span className="skeleton" /><span className="skeleton" /><span className="skeleton" />
    </div>
  );
}

export default function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <WeatherProvider>
        <ThemeProvider>
          <BrowserRouter>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<Layout />}>
                  <Route index element={<HomeView />} />
                  <Route path="map" element={<MapView />} />
                  <Route path="forecast" element={<ForecastView />} />
                  <Route path="alerts" element={<AlertsView />} />
                  <Route path="aviation" element={<AviationView />} />
                  <Route path="climate" element={<ClimateView />} />
                  <Route path="advisories" element={<AdvisoriesView />} />
                  <Route path="settings" element={<SettingsView />} />
                  <Route path="chat" element={<ChatView />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ThemeProvider>
      </WeatherProvider>
    </I18nextProvider>
  );
}
