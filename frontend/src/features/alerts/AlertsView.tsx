import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import useSWR from 'swr';
import { AlertTriangle, Check, CheckCircle2, ChevronRight, Clock3, MapPin, ShieldAlert, X } from 'lucide-react';
import { AlertService } from '../../services/api';
import { mockAlerts } from '../../data/mockData';
import type { WeatherAlert } from '../../types/models';
import { cn, severityClass, severityOrder } from '../../lib/weather';

type StatusFilter = 'Active' | 'Resolved';
type SeverityFilter = WeatherAlert['severity'] | 'All';

export default function AlertsView() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Active');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('All');
  const [selectedAlert, setSelectedAlert] = useState<WeatherAlert | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const { data: alerts = mockAlerts, error, isLoading, mutate } = useSWR('alerts-page', () => AlertService.getAlerts(), {
    fallbackData: mockAlerts,
    revalidateOnFocus: false,
  });

  const counts = useMemo(() => Object.fromEntries(severityOrder.map((severity) => [severity, alerts.filter((alert) => alert.status === statusFilter && alert.severity === severity).length])) as Record<WeatherAlert['severity'], number>, [alerts, statusFilter]);
  const filtered = alerts.filter((alert) => alert.status === statusFilter && (severityFilter === 'All' || alert.severity === severityFilter));
  const statusCounts = {
    Active: alerts.filter((alert) => alert.status === 'Active').length,
    Resolved: alerts.filter((alert) => alert.status === 'Resolved').length,
  };

  function openAlert(alert: WeatherAlert) {
    previousFocusRef.current = document.activeElement as HTMLElement;
    setSelectedAlert(alert);
  }

  function closeAlert() {
    setSelectedAlert(null);
    window.requestAnimationFrame(() => previousFocusRef.current?.focus());
  }

  useEffect(() => {
    if (!selectedAlert) return undefined;
    closeRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeAlert();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [selectedAlert]);

  if (isLoading && alerts.length === 0) {
    return <div className="alerts-skeleton" role="status" aria-label="Loading weather alerts">{[0, 1, 2].map((item) => <div className="skeleton" key={item} />)}</div>;
  }

  return (
    <div className="alerts-view">
      <header className="page-heading alerts-heading">
        <div><span className="eyebrow">Safety before decoration</span><h1>Weather alert centre</h1><p>Scan active hazards by severity, review the affected area and read the source guidance without distraction.</p></div>
        <div className="alert-status-switch" role="group" aria-label="Alert status">
          {(['Active', 'Resolved'] as const).map((status) => <button key={status} type="button" aria-pressed={statusFilter === status} onClick={() => { setStatusFilter(status); setSeverityFilter('All'); }}>{status}<span>{statusCounts[status]}</span></button>)}
        </div>
      </header>

      {error && <div className="inline-error" role="status"><AlertTriangle className="h-4 w-4" /><span>Alerts could not refresh. Showing the latest available set.</span><button type="button" onClick={() => void mutate()}>Retry</button></div>}

      <section className="severity-filter" aria-labelledby="severity-filter-title">
        <div><span className="eyebrow">Filter the signal</span><h2 id="severity-filter-title">Severity</h2></div>
        <div role="group" aria-label="Filter by severity">
          <button type="button" aria-pressed={severityFilter === 'All'} onClick={() => setSeverityFilter('All')}><span className="severity-filter__all" />All<strong>{statusCounts[statusFilter]}</strong></button>
          {severityOrder.map((severity) => (
            <button type="button" key={severity} aria-pressed={severityFilter === severity} onClick={() => setSeverityFilter(severity)}><span className={cn('severity-filter__dot', severityClass(severity))} />{severity}<strong>{counts[severity]}</strong></button>
          ))}
        </div>
      </section>

      {filtered.length > 0 ? (
        <section className="alert-list" aria-label={`${statusFilter} weather alerts`}>
          {filtered.map((alert) => (
            <article key={alert.id} className={cn('alert-card', severityClass(alert.severity))}>
              <button type="button" className="alert-card__button" onClick={() => openAlert(alert)} aria-label={`View ${alert.severity} alert: ${alert.type}`}>
                <span className="alert-card__signal"><AlertTriangle className="h-6 w-6" /><small>{alert.severity}</small></span>
                <span className="alert-card__content">
                  <span className="alert-card__topline"><small>{alert.status} · {alert.source}</small><strong>{alert.time}</strong></span>
                  <span className="alert-card__title">{alert.type}</span>
                  <span className="alert-card__location"><MapPin className="h-4 w-4" />{alert.location}</span>
                  <span className="alert-card__description">{alert.description}</span>
                </span>
                <span className="alert-card__open">View details <ChevronRight className="h-4 w-4" /></span>
              </button>
            </article>
          ))}
        </section>
      ) : (
        <section className="atmo-panel empty-state">
          <span className="empty-state__icon">{statusFilter === 'Active' ? <CheckCircle2 className="h-7 w-7" /> : <Clock3 className="h-7 w-7" />}</span>
          <h2>{severityFilter === 'All' ? `No ${statusFilter.toLowerCase()} alerts` : `No ${severityFilter.toLowerCase()} ${statusFilter.toLowerCase()} alerts`}</h2>
          <p>{statusFilter === 'Active' ? 'There are no matching warnings in the monitored demo areas.' : 'Resolved alerts will appear here when supplied by the service.'}</p>
          {severityFilter !== 'All' && <button type="button" className="action-button action-button--quiet" onClick={() => setSeverityFilter('All')}>Clear severity filter</button>}
        </section>
      )}

      <AnimatePresence>
        {selectedAlert && (
          <div className="alert-dialog-layer">
            <motion.button type="button" className="alert-dialog-backdrop" aria-label="Close alert details" onClick={closeAlert} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.section
              className={cn('alert-dialog', severityClass(selectedAlert.severity))}
              role="dialog"
              aria-modal="true"
              aria-labelledby="alert-dialog-title"
              initial={{ opacity: 0, y: 28, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="alert-dialog__header">
                <span className="alert-dialog__icon"><ShieldAlert className="h-6 w-6" /></span>
                <div><span>{selectedAlert.severity} · {selectedAlert.status}</span><h2 id="alert-dialog-title">{selectedAlert.type}</h2></div>
                <button ref={closeRef} type="button" className="icon-button" onClick={closeAlert} aria-label="Close alert details"><X className="h-5 w-5" /></button>
              </div>
              <div className="alert-dialog__meta"><span><MapPin className="h-4 w-4" />{selectedAlert.location}</span><span><Clock3 className="h-4 w-4" />{selectedAlert.time}</span></div>
              <div className="alert-dialog__body">
                <section><span className="eyebrow">What is happening</span><p>{selectedAlert.description}</p></section>
                <section className="action-checklist"><span className="eyebrow">What should I do?</span><div>{selectedAlert.recommendedAction.split(/(?<=[.!?])\s+/).filter(Boolean).map((action, index) => <p key={`${index}-${action}`}><Check className="h-4 w-4" /><span>{action}</span></p>)}</div></section>
              </div>
              <footer className="alert-dialog__footer"><span>Source</span><strong>{selectedAlert.source}</strong><small>Guidance shown exactly as supplied by this demo record.</small></footer>
            </motion.section>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
