import { useState, type FormEvent } from 'react';
import {
  Check,
  Clipboard,
  Cloud,
  Compass,
  Eye,
  Gauge,
  LoaderCircle,
  PlaneTakeoff,
  Search,
  ShieldAlert,
  Thermometer,
  Wind,
} from 'lucide-react';
import { AviationService } from '../../services/api';
import { cn } from '../../lib/weather';

interface MetarData {
  rawText: string;
  observationTime: string;
  temperature: number;
  dewpoint: number;
  wind: string;
  visibility: string;
  altimeter: string;
  clouds: string;
}

interface TafData {
  rawText: string;
  issueTime: string;
  validTime: string;
}

const AIRPORTS = [
  { code: 'VOMM', city: 'Chennai', name: 'Chennai International' },
  { code: 'VABB', city: 'Mumbai', name: 'Chhatrapati Shivaji Maharaj' },
  { code: 'VIDP', city: 'Delhi', name: 'Indira Gandhi International' },
  { code: 'VOBL', city: 'Bengaluru', name: 'Kempegowda International' },
] as const;

function formatTafValidity(value: string) {
  const match = value.match(/^(\d{2})(\d{2})\/(\d{2})(\d{2})$/);
  if (!match) return { start: value, end: 'See raw TAF' };
  return {
    start: `Day ${match[1]} · ${match[2]}:00 UTC`,
    end: `Day ${match[3]} · ${match[4]}:00 UTC`,
  };
}

export default function AviationView() {
  const [icao, setIcao] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metar, setMetar] = useState<MetarData | null>(null);
  const [taf, setTaf] = useState<TafData | null>(null);
  const [presentation, setPresentation] = useState<'decoded' | 'raw'>('decoded');
  const [copied, setCopied] = useState<'metar' | 'taf' | null>(null);

  async function searchAirport(code: string) {
    const normalized = code.trim().toUpperCase();
    if (!/^[A-Z]{4}$/.test(normalized)) {
      setError('Enter a valid four-letter ICAO code, such as VOMM or VABB.');
      return;
    }

    setIcao(normalized);
    setLoading(true);
    setError(null);
    setMetar(null);
    setTaf(null);
    setCopied(null);

    try {
      const [nextMetar, nextTaf] = await Promise.all([
        AviationService.getMETAR(normalized) as Promise<MetarData>,
        AviationService.getTAF(normalized) as Promise<TafData>,
      ]);
      setMetar(nextMetar);
      setTaf(nextTaf);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Aviation demonstration data could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void searchAirport(icao);
  }

  async function copyReport(kind: 'metar' | 'taf', value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
    } catch {
      setError('Clipboard access is unavailable. Select and copy the raw report manually.');
    }
  }

  const validity = taf ? formatTafValidity(taf.validTime) : null;
  const airport = AIRPORTS.find((item) => item.code === icao);

  return (
    <div className="aviation-view">
      <header className="aviation-hero">
        <div className="aviation-hero__copy">
          <span className="eyebrow">Aerodrome observation desk</span>
          <h1>Weather, decoded for the flight line</h1>
          <p>Inspect demonstration METAR and TAF reports with the original coded strings kept intact.</p>
        </div>
        <div className="aviation-disclaimer" role="note">
          <ShieldAlert className="h-5 w-5" />
          <span><strong>Non-operational demo</strong>Do not use this workspace for flight-safety decisions.</span>
        </div>
      </header>

      <section className="aviation-search-panel" aria-labelledby="airport-search-title">
        <div>
          <span className="eyebrow">Station lookup</span>
          <h2 id="airport-search-title">Choose an ICAO station</h2>
        </div>
        <form className="icao-search" onSubmit={handleSubmit}>
          <PlaneTakeoff className="h-5 w-5" aria-hidden="true" />
          <label className="sr-only" htmlFor="icao-code">Four-letter ICAO airport code</label>
          <input
            id="icao-code"
            value={icao}
            onChange={(event) => {
              setIcao(event.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4));
              setError(null);
            }}
            placeholder="VOMM"
            autoComplete="off"
            inputMode="text"
            maxLength={4}
            spellCheck={false}
          />
          <button type="submit" disabled={loading || icao.length !== 4} aria-label="Load aviation weather">
            {loading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
            <span>Load station</span>
          </button>
        </form>
        <div className="airport-chips" aria-label="Supported example airports">
          {AIRPORTS.map((item) => (
            <button type="button" key={item.code} onClick={() => void searchAirport(item.code)} aria-pressed={icao === item.code && Boolean(metar)}>
              <strong>{item.code}</strong><span>{item.city}</span>
            </button>
          ))}
        </div>
      </section>

      {error && <div className="aviation-error" role="alert"><ShieldAlert className="h-4 w-4" /><span>{error}</span></div>}

      {loading && (
        <div className="aviation-loading" role="status" aria-label="Loading aviation reports">
          <div className="skeleton" /><div className="skeleton" />
        </div>
      )}

      {!loading && metar && taf && (
        <div className="aviation-results">
          <section className="metar-console" aria-labelledby="metar-title">
            <div className="report-heading">
              <div>
                <span className="report-label">METAR</span>
                <div><h2 id="metar-title">{airport?.name ?? icao}</h2><p>{metar.observationTime} · Demonstration observation</p></div>
              </div>
              <div className="report-tabs" role="group" aria-label="METAR presentation">
                <button type="button" aria-pressed={presentation === 'decoded'} onClick={() => setPresentation('decoded')}>Decoded</button>
                <button type="button" aria-pressed={presentation === 'raw'} onClick={() => setPresentation('raw')}>Raw</button>
              </div>
            </div>

            {presentation === 'decoded' ? (
              <div className="instrument-grid">
                <article><span><Thermometer className="h-4 w-4" />Temperature</span><strong>{metar.temperature}°C</strong><small>Dew point {metar.dewpoint}°C</small></article>
                <article><span><Wind className="h-4 w-4" />Surface wind</span><strong>{metar.wind}</strong><small>Direction and speed</small></article>
                <article><span><Eye className="h-4 w-4" />Visibility</span><strong>{metar.visibility}</strong><small>Horizontal visibility</small></article>
                <article><span><Gauge className="h-4 w-4" />Pressure</span><strong>{metar.altimeter}</strong><small>QNH / altimeter</small></article>
                <article className="instrument-grid__wide"><span><Cloud className="h-4 w-4" />Cloud layers</span><strong>{metar.clouds}</strong><small>Decoded from the example report</small></article>
              </div>
            ) : (
              <div className="raw-report">
                <div><span>Original coded observation</span><button type="button" onClick={() => void copyReport('metar', metar.rawText)}>{copied === 'metar' ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}{copied === 'metar' ? 'Copied' : 'Copy'}</button></div>
                <code>{metar.rawText}</code>
              </div>
            )}
          </section>

          <section className="taf-console" aria-labelledby="taf-title">
            <div className="report-heading">
              <div>
                <span className="report-label report-label--taf">TAF</span>
                <div><h2 id="taf-title">Terminal forecast</h2><p>Issued {taf.issueTime}</p></div>
              </div>
              <button type="button" className="copy-button" onClick={() => void copyReport('taf', taf.rawText)}>{copied === 'taf' ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}{copied === 'taf' ? 'Copied' : 'Copy raw TAF'}</button>
            </div>

            <div className="taf-validity" aria-label={`TAF valid from ${validity?.start} to ${validity?.end}`}>
              <div><span className="taf-validity__marker"><Compass className="h-4 w-4" /></span><small>Begins</small><strong>{validity?.start}</strong></div>
              <span className="taf-validity__track"><i /></span>
              <div><span className="taf-validity__marker"><PlaneTakeoff className="h-4 w-4" /></span><small>Ends</small><strong>{validity?.end}</strong></div>
            </div>
            <div className="raw-report raw-report--compact"><div><span>Original coded forecast · validity {taf.validTime}</span></div><code>{taf.rawText}</code></div>
          </section>
        </div>
      )}

      {!loading && !metar && !error && (
        <section className="aviation-empty atmo-panel">
          <span><PlaneTakeoff className="h-8 w-8" /></span>
          <h2>Flight weather starts with a station</h2>
          <p>Enter one of the supported demonstration codes, or select an airport above.</p>
          <div>{AIRPORTS.map((item) => <span key={item.code}>{item.code}</span>)}</div>
        </section>
      )}

      <footer className={cn('aviation-source-note', metar && 'aviation-source-note--visible')}>
        <ShieldAlert className="h-4 w-4" />
        <span>Simulated records are provided only to demonstrate interface behaviour. Consult authorized aviation weather sources before any operation.</span>
      </footer>
    </div>
  );
}
