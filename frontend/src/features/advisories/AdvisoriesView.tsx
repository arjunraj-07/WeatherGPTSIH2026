import { useMemo, useState, type ComponentType } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import useSWR from 'swr';
import {
  AlertTriangle,
  Anchor,
  Building2,
  ChevronDown,
  CloudRain,
  Info,
  Leaf,
  MapPin,
  Plane,
  RefreshCw,
  Thermometer,
} from 'lucide-react';
import { AdvisoryService } from '../../services/api';
import type { Advisory } from '../../types/models';
import { cn } from '../../lib/weather';

type Category = Advisory['category'];
type CategoryFilter = Category | 'All';

interface CategoryDefinition {
  name: Category;
  icon: ComponentType<{ className?: string }>;
  className: string;
  descriptor: string;
}

const CATEGORIES: CategoryDefinition[] = [
  { name: 'Agriculture', icon: Leaf, className: 'sector-agriculture', descriptor: 'Field and crop decisions' },
  { name: 'Aviation', icon: Plane, className: 'sector-aviation', descriptor: 'Airport and flight context' },
  { name: 'Marine', icon: Anchor, className: 'sector-marine', descriptor: 'Coastal and sea conditions' },
  { name: 'Urban', icon: Building2, className: 'sector-urban', descriptor: 'City operations and travel' },
  { name: 'Disaster', icon: AlertTriangle, className: 'sector-disaster', descriptor: 'Preparedness context' },
];

function categoryDefinition(category: Category) {
  return CATEGORIES.find((item) => item.name === category) ?? CATEGORIES[0];
}

export default function AdvisoriesView() {
  const [filter, setFilter] = useState<CategoryFilter>('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data: advisories = [], error, isLoading, mutate } = useSWR('sector-advisories', () => AdvisoryService.getAdvisories(), { revalidateOnFocus: false });

  const counts = useMemo(() => Object.fromEntries(CATEGORIES.map((category) => [category.name, advisories.filter((item) => item.category === category.name).length])) as Record<Category, number>, [advisories]);
  const filtered = filter === 'All' ? advisories : advisories.filter((item) => item.category === filter);

  return (
    <div className="advisories-view">
      <header className="page-heading advisories-heading">
        <div><span className="eyebrow">Actionable sector intelligence</span><h1>Weather guidance, in context</h1><p>Translate the forecast into clear demonstration guidance for farms, airports, coasts and cities.</p></div>
        <div className="advisory-demo-note"><Info className="h-4 w-4" /><span><strong>Demo guidance</strong>Not an official order</span></div>
      </header>

      <section className="sector-filter" aria-labelledby="sector-filter-title">
        <div><span className="eyebrow">Choose a sector</span><h2 id="sector-filter-title">Operational lens</h2></div>
        <div className="sector-filter__rail" role="group" aria-label="Filter advisories by category">
          <button type="button" onClick={() => setFilter('All')} aria-pressed={filter === 'All'}><span className="sector-all"><Info className="h-4 w-4" /></span><strong>All sectors</strong><small>{advisories.length}</small></button>
          {CATEGORIES.map((category) => (
            <button type="button" key={category.name} className={category.className} onClick={() => setFilter(category.name)} aria-pressed={filter === category.name}>
              <span><category.icon className="h-4 w-4" /></span><strong>{category.name}</strong><small>{counts[category.name]}</small>
            </button>
          ))}
        </div>
      </section>

      {error && <div className="inline-error" role="alert"><AlertTriangle className="h-4 w-4" /><span>Advisories could not be refreshed.</span><button type="button" onClick={() => void mutate()}><RefreshCw className="h-4 w-4" />Retry</button></div>}

      {isLoading && advisories.length === 0 ? (
        <div className="advisory-skeleton" role="status" aria-label="Loading sector advisories"><div className="skeleton" /><div className="skeleton" /></div>
      ) : filtered.length > 0 ? (
        <section className="advisory-list" aria-label={`${filter} advisories`}>
          {filtered.map((advisory) => {
            const definition = categoryDefinition(advisory.category);
            const Icon = definition.icon;
            const expanded = expandedId === advisory.id;
            return (
              <article key={advisory.id} className={cn('advisory-card', definition.className, expanded && 'advisory-card--expanded')}>
                <button type="button" className="advisory-card__summary" aria-expanded={expanded} aria-controls={`advisory-${advisory.id}`} onClick={() => setExpandedId(expanded ? null : advisory.id)}>
                  <span className="advisory-card__icon"><Icon className="h-6 w-6" /></span>
                  <span className="advisory-card__title"><small>{advisory.category} · {definition.descriptor}</small><strong>{advisory.title}</strong><span><MapPin className="h-4 w-4" />{advisory.location}</span></span>
                  <span className="advisory-card__conditions"><span><Thermometer className="h-4 w-4" /><small>Temperature</small><strong>{advisory.tempRange}</strong></span><span><CloudRain className="h-4 w-4" /><small>Rain chance</small><strong>{advisory.rainProbability}%</strong></span></span>
                  <ChevronDown className="advisory-card__chevron h-5 w-5" />
                </button>
                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.div id={`advisory-${advisory.id}`} className="advisory-card__detail" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
                      <div><span className="eyebrow">Full guidance</span><p>{advisory.details}</p></div>
                      <aside><Info className="h-4 w-4" /><p><strong>Demonstration advisory.</strong> Cross-check official IMD and local authority guidance before acting.</p></aside>
                    </motion.div>
                  )}
                </AnimatePresence>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="atmo-panel empty-state">
          <span className="empty-state__icon"><Info className="h-7 w-7" /></span>
          <h2>No {filter === 'All' ? '' : filter.toLowerCase()} advisories</h2>
          <p>No guidance records are available for this sector in the current demonstration set.</p>
          {filter !== 'All' && <button type="button" className="action-button action-button--quiet" onClick={() => setFilter('All')}>Show every sector</button>}
        </section>
      )}
    </div>
  );
}
