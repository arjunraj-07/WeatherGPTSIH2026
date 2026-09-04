import { useState, type ComponentType, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  Check,
  ChevronRight,
  CloudSun,
  FileText,
  Gauge,
  Globe2,
  Info,
  Languages,
  Monitor,
  Moon,
  Move,
  ShieldCheck,
  Sun,
  Thermometer,
  Wind,
  X,
} from 'lucide-react';
import { usePreferences } from '../../hooks/usePreferences';
import { useWeather } from '../../hooks/useWeather';
import type { MotionIntensity, TemperatureUnit, ThemeMode, WindUnit } from '../../context/preferences-context';
import type { SceneVariant, TimeOverride } from '../../lib/weather';
import { cn } from '../../lib/weather';

interface SettingsSectionProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}

function SettingsSection({ eyebrow, title, description, children }: SettingsSectionProps) {
  return (
    <section className="settings-section">
      <div className="settings-section__intro"><span className="eyebrow">{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>
      <div className="settings-section__body">{children}</div>
    </section>
  );
}

interface PreferenceRowProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: ReactNode;
}

function PreferenceRow({ icon: Icon, title, description, children }: PreferenceRowProps) {
  return (
    <div className="preference-row">
      <span className="preference-row__icon"><Icon className="h-5 w-5" /></span>
      <span className="preference-row__copy"><strong>{title}</strong><small>{description}</small></span>
      <div className="preference-row__control">{children}</div>
    </div>
  );
}

function SegmentedControl<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Array<{ value: T; label: string; icon?: ComponentType<{ className?: string }> }>; onChange: (value: T) => void }) {
  return (
    <div className="segmented-control" role="group" aria-label={label}>
      {options.map((option) => (
        <button type="button" key={option.value} aria-pressed={value === option.value} onClick={() => onChange(option.value)}>
          {option.icon && <option.icon className="h-4 w-4" />}<span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return <button type="button" className={cn('preference-toggle', checked && 'preference-toggle--on')} role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}><span /></button>;
}

const SCENES: Array<{ value: SceneVariant | 'auto'; label: string }> = [
  { value: 'auto', label: 'Automatic' },
  { value: 'clear-day', label: 'Clear day' },
  { value: 'clear-night', label: 'Clear night' },
  { value: 'partly-cloudy-day', label: 'Partly cloudy day' },
  { value: 'partly-cloudy-night', label: 'Partly cloudy night' },
  { value: 'overcast', label: 'Overcast' },
  { value: 'drizzle', label: 'Drizzle' },
  { value: 'rain', label: 'Rain' },
  { value: 'monsoon', label: 'Heavy rain / monsoon' },
  { value: 'thunderstorm', label: 'Thunderstorm' },
  { value: 'snow', label: 'Snow / sleet' },
  { value: 'fog', label: 'Fog / haze' },
  { value: 'heat', label: 'Extreme heat' },
  { value: 'fallback', label: 'Safe fallback' },
];

export default function SettingsView() {
  const { i18n } = useTranslation();
  const {
    theme,
    setTheme,
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
  } = usePreferences();
  const { sceneOverride, setSceneOverride, timeOverride, setTimeOverride } = useWeather();
  const [notice, setNotice] = useState<string | null>(null);

  function changeLanguage(language: string) {
    void i18n.changeLanguage(language);
    localStorage.setItem('language', language);
  }

  return (
    <div className="settings-view">
      <header className="page-heading settings-heading">
        <div><span className="eyebrow">A weather workspace that adapts</span><h1>Preferences &amp; scene controls</h1><p>Choose comfortable units, motion, language and notification defaults. All preferences remain on this device.</p></div>
        <span className="settings-saved"><Check className="h-4 w-4" />Saved locally</span>
      </header>

      <SettingsSection eyebrow="General" title="Appearance & language" description="Tune the chrome without changing the underlying weather records.">
        <PreferenceRow icon={theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor} title="Appearance" description="Follow the operating system or choose a fixed mode.">
          <SegmentedControl<ThemeMode> label="Appearance" value={theme} onChange={setTheme} options={[{ value: 'system', label: 'System', icon: Monitor }, { value: 'light', label: 'Light', icon: Sun }, { value: 'dark', label: 'Dark', icon: Moon }]} />
        </PreferenceRow>
        <PreferenceRow icon={Languages} title="Language" description="Navigation labels support English, Hindi and Tamil.">
          <div className="language-control">
            <Globe2 className="h-4 w-4" />
            <label className="sr-only" htmlFor="language-select">Application language</label>
            <select id="language-select" value={i18n.language.split('-')[0]} onChange={(event) => changeLanguage(event.target.value)}>
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
              <option value="ta">தமிழ்</option>
            </select>
          </div>
        </PreferenceRow>
        <PreferenceRow icon={Move} title="Weather animation" description="Reduced-motion preferences always take precedence.">
          <SegmentedControl<MotionIntensity> label="Weather animation intensity" value={motionIntensity} onChange={setMotionIntensity} options={[{ value: 'full', label: 'Full' }, { value: 'subtle', label: 'Subtle' }, { value: 'off', label: 'Off' }]} />
        </PreferenceRow>
      </SettingsSection>

      <SettingsSection eyebrow="Display" title="Weather units" description="These are display-only transformations; service data remains unchanged.">
        <PreferenceRow icon={Thermometer} title="Temperature" description="Current, hourly and daily temperatures.">
          <SegmentedControl<TemperatureUnit> label="Temperature unit" value={temperatureUnit} onChange={setTemperatureUnit} options={[{ value: 'c', label: '°C' }, { value: 'f', label: '°F' }]} />
        </PreferenceRow>
        <PreferenceRow icon={Wind} title="Wind speed" description="Convert the supplied kilometres-per-hour value for display.">
          <SegmentedControl<WindUnit> label="Wind speed unit" value={windUnit} onChange={setWindUnit} options={[{ value: 'kmh', label: 'km/h' }, { value: 'mph', label: 'mph' }, { value: 'knots', label: 'knots' }]} />
        </PreferenceRow>
      </SettingsSection>

      <SettingsSection eyebrow="Notifications" title="Local notification choices" description="These preferences are saved on this device; push delivery is not enabled in demo mode.">
        <PreferenceRow icon={Bell} title="Severe alerts" description="Remember whether urgent alert notifications are preferred."><Toggle checked={severeAlerts} onChange={setSevereAlerts} label="Severe alert notifications" /></PreferenceRow>
        <PreferenceRow icon={FileText} title="Daily summary" description="Remember whether a morning forecast summary is preferred."><Toggle checked={dailySummary} onChange={setDailySummary} label="Daily summary notifications" /></PreferenceRow>
      </SettingsSection>

      <SettingsSection eyebrow="Development tool · Demo only" title="Weather Scene Lab" description="Override automatic weather normalization to review each safe, code-driven atmosphere.">
        <div className="scene-lab">
          <div className="scene-lab__status"><CloudSun className="h-6 w-6" /><span><strong>{SCENES.find((scene) => scene.value === sceneOverride)?.label ?? 'Automatic'}</strong>{sceneOverride === 'auto' ? 'Following current demonstration weather' : 'Manual visual override is active'}</span></div>
          <div className="scene-lab__controls">
            <label htmlFor="scene-select"><span>Scene condition</span><select id="scene-select" value={sceneOverride} onChange={(event) => setSceneOverride(event.target.value as SceneVariant | 'auto')}>{SCENES.map((scene) => <option key={scene.value} value={scene.value}>{scene.label}</option>)}</select></label>
            <div><span>Day / night signal</span><SegmentedControl<TimeOverride> label="Scene time override" value={timeOverride} onChange={setTimeOverride} options={[{ value: 'auto', label: 'Auto' }, { value: 'day', label: 'Day' }, { value: 'night', label: 'Night' }]} /></div>
          </div>
          <p><Info className="h-4 w-4" />The Scene Lab changes atmosphere only. It never changes weather values or claims to show live conditions.</p>
        </div>
      </SettingsSection>

      <SettingsSection eyebrow="About" title="WeatherGPT platform" description="Product information and legal placeholders.">
        <PreferenceRow icon={ShieldCheck} title="Privacy policy" description="A legal policy has not been connected to this demonstration."><button type="button" className="settings-link" onClick={() => setNotice('Privacy policy placeholder · legal review is still required.')}>Details<ChevronRight className="h-4 w-4" /></button></PreferenceRow>
        <PreferenceRow icon={FileText} title="Terms of service" description="Terms are not published from this demonstration build."><button type="button" className="settings-link" onClick={() => setNotice('Terms of service placeholder · legal review is still required.')}>Details<ChevronRight className="h-4 w-4" /></button></PreferenceRow>
        <div className="version-row"><Gauge className="h-5 w-5" /><span><strong>Version 2.0.0</strong>Atmospheric Intelligence redesign · React 19</span></div>
      </SettingsSection>

      {notice && <div className="settings-toast" role="status"><Info className="h-4 w-4" /><span>{notice}</span><button type="button" onClick={() => setNotice(null)} aria-label="Dismiss notice"><X className="h-4 w-4" /></button></div>}
    </div>
  );
}
