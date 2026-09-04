import { useMemo, useState, useRef, useEffect, useCallback, type ComponentType } from 'react';
import useSWR from 'swr';
import { GeoJSON, MapContainer, TileLayer, ZoomControl } from 'react-leaflet';
import type { PathOptions } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Activity,
  ChevronDown,
  CloudRain,
  Layers3,
  LocateFixed,
  Map as MapIcon,
  Radar,
  RefreshCw,
  ThermometerSun,
  Waves,
  Wind,
  X,
} from 'lucide-react';
import { cn } from '../../lib/weather';

type LayerName = 'Base Map' | 'Temperature' | 'Rainfall / Precipitation' | 'Weather Radar' | 'Cyclone Tracking' | 'Flood Risk' | 'Wind';

interface LayerDefinition {
  name: LayerName;
  shortName: string;
  icon: ComponentType<{ className?: string }>;
  description: string;
  legend: Array<{ label: string; color: string }>;
}

const LAYERS: LayerDefinition[] = [
  { name: 'Base Map', shortName: 'Base', icon: MapIcon, description: 'State boundaries and place context', legend: [{ label: 'Selected state', color: '#0c717c' }, { label: 'State boundary', color: '#6f858b' }] },
  { name: 'Temperature', shortName: 'Temp', icon: ThermometerSun, description: 'Simulated surface temperature', legend: [{ label: 'Hot', color: '#c96c32' }, { label: 'Warm', color: '#d9a542' }, { label: 'Mild', color: '#64a7a9' }] },
  { name: 'Rainfall / Precipitation', shortName: 'Rain', icon: CloudRain, description: 'Simulated precipitation intensity', legend: [{ label: 'Heavy', color: '#245b86' }, { label: 'Moderate', color: '#3d8cab' }, { label: 'Light', color: '#91c6ce' }] },
  { name: 'Weather Radar', shortName: 'Radar', icon: Radar, description: 'Simulated radar composite', legend: [{ label: 'Strong return', color: '#476c47' }, { label: 'Moderate return', color: '#80a460' }, { label: 'Light return', color: '#b9ca88' }] },
  { name: 'Cyclone Tracking', shortName: 'Cyclone', icon: Activity, description: 'Demonstration cyclone awareness layer', legend: [{ label: 'Elevated watch', color: '#986244' }, { label: 'Monitor', color: '#c59a6d' }, { label: 'No signal', color: '#9bb4b2' }] },
  { name: 'Flood Risk', shortName: 'Flood', icon: Waves, description: 'Simulated contextual flood risk', legend: [{ label: 'Higher risk', color: '#356b88' }, { label: 'Moderate risk', color: '#5c9dad' }, { label: 'Lower risk', color: '#a2c8ca' }] },
  { name: 'Wind', shortName: 'Wind', icon: Wind, description: 'Simulated surface wind speed', legend: [{ label: 'Stronger', color: '#5d5487' }, { label: 'Moderate', color: '#7b77a6' }, { label: 'Lighter', color: '#aaa7c5' }] },
];

function stateScore(name: string) {
  return [...name].reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % 100;
}

function layerValue(layer: LayerName, state: string) {
  const score = stateScore(state);
  if (layer === 'Base Map') return { value: 'State boundary', status: 'Reference layer' };
  if (layer === 'Temperature') return { value: `${24 + (score % 15)}°C`, status: score > 62 ? 'Hot' : score > 30 ? 'Warm' : 'Mild' };
  if (layer === 'Rainfall / Precipitation') return { value: `${score % 81} mm`, status: score > 58 ? 'Heavy' : score > 26 ? 'Moderate' : 'Light' };
  if (layer === 'Weather Radar') return { value: `${18 + (score % 48)} dBZ`, status: score > 64 ? 'Strong return' : score > 32 ? 'Moderate return' : 'Light return' };
  if (layer === 'Cyclone Tracking') return { value: score > 74 ? 'Watch' : 'No tracked signal', status: score > 74 ? 'Elevated watch' : 'Monitor official bulletins' };
  if (layer === 'Flood Risk') return { value: `${score % 100}% index`, status: score > 66 ? 'Higher risk' : score > 33 ? 'Moderate risk' : 'Lower risk' };
  return { value: `${8 + (score % 29)} km/h`, status: score > 65 ? 'Stronger' : score > 30 ? 'Moderate' : 'Lighter' };
}

function fillForLayer(layer: LayerName, state: string) {
  const score = stateScore(state);
  if (layer === 'Base Map') return '#9bb4b2';
  const palette = LAYERS.find((item) => item.name === layer)?.legend.map((item) => item.color) ?? ['#0c717c'];
  return score > 66 ? palette[0] : score > 33 ? palette[1] ?? palette[0] : palette[2] ?? palette.at(-1) ?? palette[0];
}

async function loadIndiaGeoJSON() {
  const response = await fetch('/data/india_states.geojson');
  if (!response.ok) throw new Error('India state boundaries could not be loaded.');
  return response.json();
}

export default function MapView() {
  const [activeLayer, setActiveLayer] = useState<LayerName>('Temperature');
  const [selectedState, setSelectedState] = useState('Tamil Nadu');
  const [layerDockOpen, setLayerDockOpen] = useState(true);
  const [mapStatus, setMapStatus] = useState<string>();
  const [tilesAvailable, setTilesAvailable] = useState(true);
  const geoJsonRef = useRef<L.GeoJSON>(null);
  const { data: geoData, error, isLoading, mutate } = useSWR('india-states-geojson', loadIndiaGeoJSON, { revalidateOnFocus: false });
  const definition = LAYERS.find((layer) => layer.name === activeLayer) ?? LAYERS[0];
  const selectedValue = useMemo(() => layerValue(activeLayer, selectedState), [activeLayer, selectedState]);

  const getStyle = useCallback((feature?: { properties?: { NAME_1?: string } }): PathOptions => {
    const stateName = feature?.properties?.NAME_1 ?? 'Unknown';
    const selected = stateName === selectedState;
    return {
      color: selected ? '#073f46' : '#f5fbfa',
      weight: selected ? 3 : 1,
      opacity: selected ? 1 : 0.72,
      fillColor: fillForLayer(activeLayer, stateName),
      fillOpacity: activeLayer === 'Base Map' ? (selected ? 0.35 : 0.12) : selected ? 0.76 : 0.54,
    };
  }, [activeLayer, selectedState]);

  useEffect(() => {
    if (geoJsonRef.current) {
      geoJsonRef.current.setStyle(getStyle as any);
    }
  }, [activeLayer, selectedState, getStyle]);

  const onEachFeature = (feature: { properties?: { NAME_1?: string } }, layer: L.Layer) => {
    const name = feature.properties?.NAME_1;
    if (!name) return;
    layer.on({ click: () => setSelectedState(name) });
    layer.bindTooltip(name, { sticky: true, direction: 'top' });
  };

  return (
    <section className="map-workspace" aria-labelledby="map-title">
      <div className="map-workspace__canvas">
        <MapContainer center={[20.5937, 78.9629]} zoom={5} minZoom={4} maxZoom={9} zoomControl={false} preferCanvas={true} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution="&copy; OpenStreetMap contributors &copy; CARTO"
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            eventHandlers={{ tileerror: () => setTilesAvailable(false), load: () => setTilesAvailable(true) }}
          />
          <ZoomControl position="bottomright" />
          {geoData && (
            <GeoJSON
              ref={geoJsonRef}
              data={geoData}
              style={getStyle}
              onEachFeature={onEachFeature}
            />
          )}
        </MapContainer>

        <header className="map-title-card">
          <span className="eyebrow">India weather canvas</span>
          <h1 id="map-title">Explore conditions spatially</h1>
          <p>{definition.description}</p>
        </header>

        <div className={cn('layer-dock', !layerDockOpen && 'layer-dock--closed')}>
          <button type="button" className="layer-dock__toggle" onClick={() => setLayerDockOpen((value) => !value)} aria-expanded={layerDockOpen}>
            <Layers3 className="h-4 w-4" />
            <span>Layers</span>
            <ChevronDown className="h-4 w-4" />
          </button>
          {layerDockOpen && (
            <div className="layer-dock__options" role="group" aria-label="Map weather layers">
              {LAYERS.map((layer) => (
                <button
                  type="button"
                  key={layer.name}
                  onClick={() => setActiveLayer(layer.name)}
                  aria-pressed={activeLayer === layer.name}
                  title={layer.name}
                >
                  <layer.icon className="h-4 w-4" />
                  <span>{layer.shortName}</span>
                </button>
              ))}
            </div>
          )}
          <p><span /> Simulated layer · not live radar</p>
        </div>

        <aside className="map-info-sheet" aria-live="polite">
          <div className="map-info-sheet__top">
            <div><span className="eyebrow">Selected state</span><h2>{selectedState}</h2></div>
            <span className="map-demo-chip">Simulated</span>
          </div>
          <div className="map-info-sheet__reading"><strong>{selectedValue.value}</strong><span>{selectedValue.status}</span></div>
          <div className="map-info-sheet__legend" aria-label={`${activeLayer} legend`}>
            {definition.legend.map((item) => (
              <span key={item.label}><i style={{ backgroundColor: item.color }} />{item.label}</span>
            ))}
          </div>
          <p>Values illustrate the interface only. Use official IMD bulletins for operational decisions.</p>
        </aside>

        <button
          type="button"
          className="map-locate"
          onClick={() => {
            setSelectedState('Tamil Nadu');
            setMapStatus('Map centred conceptually on the Chennai demo location.');
          }}
          aria-label="Use current demo location"
        >
          <LocateFixed className="h-5 w-5" />
        </button>

        {(isLoading || error || !tilesAvailable) && (
          <div className={cn('map-notice', error && 'map-notice--error')} role={error ? 'alert' : 'status'}>
            {isLoading && <><RefreshCw className="h-4 w-4 animate-spin" /> Loading state boundaries…</>}
            {error && <><span>Boundary data unavailable. The base map remains usable.</span><button type="button" onClick={() => void mutate()}>Retry</button></>}
            {!tilesAvailable && !error && <span>Map tiles are unavailable. State boundary overlays can still be explored.</span>}
          </div>
        )}

        {mapStatus && (
          <div className="map-toast" role="status">
            <LocateFixed className="h-4 w-4" />
            <span>{mapStatus}</span>
            <button type="button" onClick={() => setMapStatus(undefined)} aria-label="Dismiss map status"><X className="h-4 w-4" /></button>
          </div>
        )}
      </div>
    </section>
  );
}
