import { useId, useState } from 'react';
import { Check, LoaderCircle, MapPin, Search, X } from 'lucide-react';
import { LocationService } from '../services/api';
import type { Location } from '../types/models';
import { useWeather } from '../hooks/useWeather';

interface LocationSearchProps {
  compact?: boolean;
  onSelected?: () => void;
}

export default function LocationSearch({ compact = false, onSelected }: LocationSearchProps) {
  const { selectLocation } = useWeather();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Location[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const listId = useId();
  const isDemo = import.meta.env.VITE_DATA_MODE !== 'api';

  async function search() {
    const value = query.trim();
    if (!value) return;
    setLoading(true);
    setError(undefined);
    setMessage(undefined);
    try {
      const locations = await LocationService.searchLocation(value);
      setResults(locations);
      setOpen(true);
      if (locations.length === 0) setMessage('No matching locations found.');
    } catch {
      setError('Location search is unavailable. Try again.');
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }

  function chooseLocation(location: Location) {
    selectLocation(location);
    setQuery(`${location.city}${location.state ? `, ${location.state}` : ''}`);
    setMessage(isDemo ? 'Demo mode is anchored to the Chennai sample dataset.' : `Weather updated for ${location.city}.`);
    setOpen(false);
    onSelected?.();
  }

  return (
    <div className={`location-command ${compact ? 'location-command--compact' : ''}`}>
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          void search();
        }}
        className="location-command__form"
      >
        <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
        <label htmlFor={listId} className="sr-only">Search city or district</label>
        <input
          id={listId}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${listId}-results`}
          aria-autocomplete="list"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(false);
          }}
          placeholder={compact ? 'Search location' : 'Search city or district'}
          autoComplete="off"
        />
        {query && !loading && (
          <button
            type="button"
            className="icon-button icon-button--small"
            onClick={() => {
              setQuery('');
              setOpen(false);
            }}
            aria-label="Clear location search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <button type="submit" className="location-command__submit" disabled={loading || !query.trim()} aria-label="Search locations">
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : compact ? <span>Go</span> : <span>Search</span>}
        </button>
      </form>

      {(open || message) && (
        <div id={`${listId}-results`} className="location-command__results" role="listbox" aria-label="Location results">
          {error && <p className="location-command__status location-command__status--error" role="alert">{error}</p>}
          {message && !open && (
            <p className="location-command__status" role="status">
              <Check className="h-4 w-4" aria-hidden="true" />
              {message}
            </p>
          )}
          {open && !error && results.map((location) => (
            <button
              key={location.id}
              type="button"
              role="option"
              aria-selected="false"
              onClick={() => chooseLocation(location)}
              className="location-command__result"
            >
              <MapPin className="h-4 w-4" aria-hidden="true" />
              <span>
                <strong>{location.city}</strong>
                <small>{[location.state, location.country].filter(Boolean).join(', ')}</small>
              </span>
            </button>
          ))}
          {open && message && <p className="location-command__status">{message}</p>}
        </div>
      )}
    </div>
  );
}
