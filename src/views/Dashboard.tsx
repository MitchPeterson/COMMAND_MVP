import React, { useMemo } from 'react';
import { useHousehold } from '../useHousehold';
import { UploadDropzone } from '../components/UploadDropzone';
import { DocumentExtractionReview } from '../components/DocumentExtractionReview';
import { uploadDocumentAsset, invokeDocumentExtraction } from '../lib/supabase';
import {
  Shield,
  FileText,
  Home,
  Wallet,
  Receipt,
  Users,
  CreditCard,
  Calendar,
  Clock,
  AlertTriangle,
} from 'lucide-react';

const severityOrder = ['critical', 'high', 'medium', 'low'] as const;
const severityLabels = {
  critical: { label: 'Critical', accent: 'bg-red-500/10 text-red-300 border-red-500/20' },
  high: { label: 'High', accent: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20' },
  medium: { label: 'Review', accent: 'bg-slate-500/10 text-slate-300 border-slate-500/20' },
  low: { label: 'Low', accent: 'bg-slate-700/10 text-slate-300 border-slate-700/20' },
};

const sectionLabels: Record<string, string> = {
  insurance: 'Insurance',
  legal: 'Legal',
  credit: 'Credit',
  home: 'Home',
  taxes: 'Taxes',
  finances: 'Finances',
  family: 'Family',
  advisory: 'Advisory',
  health: 'Health',
};

const sectionIcons: Record<string, React.ElementType> = {
  insurance: Shield,
  legal: FileText,
  home: Home,
  finances: Wallet,
  taxes: Receipt,
  family: Users,
  credit: CreditCard,
};

function formatDateLabel(dateString?: string | null) {
  if (!dateString) return 'No date';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
}

function formatTimelineDate(dateString?: string | null) {
  if (!dateString) return 'TBD';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
}

function formatScore(score: number | null | undefined) {
  if (score == null) return '--';
  return score.toFixed(1);
}

function getScoreState(score: number | null | undefined) {
  if (score == null) return { label: 'No score', className: 'text-cmd-muted', borderClass: 'border-cmd-border' };
  if (score < 60) return { label: 'Needs attention', className: 'text-red-400', borderClass: 'border-red-500' };
  if (score < 75) return { label: 'At risk', className: 'text-cmd-gold', borderClass: 'border-cmd-gold' };
  return { label: 'On track', className: 'text-emerald-400', borderClass: 'border-emerald-500' };
}

export function DashboardView() {
  const { data, refresh } = useHousehold();

  const healthScore = data?.household?.health_score ?? null;
  const sectionScores = useMemo(
    () => (data?.sectionScores ?? []).slice().sort((a, b) => a.score - b.score),
    [data?.sectionScores]
  );

  const priorityActions = useMemo(
    () => (data?.priorityActions ?? []).filter((item) => item.status !== 'dismissed'),
    [data?.priorityActions]
  );

  const groupedPriorities = useMemo(() => {
    const groups: Record<string, typeof priorityActions> = {
      critical: [],
      high: [],
      medium: [],
      low: [],
    };
    priorityActions.forEach((item) => {
      groups[item.severity]?.push(item);
    });
    return groups;
  }, [priorityActions]);

  const timelineEvents = useMemo(() => {
    const today = new Date();
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + 90);

    return (data?.timelineEvents ?? [])
      .filter((event) => {
        if (!event.event_date) return false;
        const eventDate = new Date(event.event_date);
        return !Number.isNaN(eventDate.getTime()) && eventDate >= today && eventDate <= maxDate;
      })
      .sort((a, b) => {
        const aDate = new Date(a.event_date ?? '');
        const bDate = new Date(b.event_date ?? '');
        return aDate.getTime() - bDate.getTime();
      });
  }, [data?.timelineEvents]);

  const scoreState = getScoreState(healthScore);
  const openPriorityCount = priorityActions.length;

  return (
    <div className="min-h-screen bg-cmd-black p-6 text-cmd-offwhite">
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-8 shadow-sm shadow-black/10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Household Health Score</div>
                <div className="mt-4 flex items-end gap-6">
                  <span className="text-[80px] font-bold leading-none font-mono text-cmd-offwhite">
                    {healthScore ?? '--'}
                  </span>
                  <div className="space-y-2">
                    <div className={`text-sm font-semibold uppercase tracking-[0.2em] ${scoreState.className}`}>
                      {scoreState.label}
                    </div>
                    <div className="max-w-md text-sm text-cmd-muted">
                      {healthScore != null
                        ? `${sectionScores.length} sections analyzed • ${openPriorityCount} open action${openPriorityCount === 1 ? '' : 's'}`
                        : 'No health score data available yet.'}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {['60', '70', '80', '90', '100'].map((label) => (
                  <div
                    key={label}
                    className={`h-1 w-10 rounded-full ${
                      Number(label) <= (healthScore ?? 0)
                        ? healthScore && healthScore < 60
                          ? 'bg-red-500'
                          : healthScore && healthScore < 75
                          ? 'bg-cmd-gold'
                          : 'bg-emerald-500'
                        : 'bg-cmd-border'
                    }`}
                  />
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-6">
            <UploadDropzone
              contextLabel="Global document upload"
              buttonLabel="Add a document"
              className="mb-6"
              onUpload={async (file) => {
                if (!data?.household?.id) return;
                const document = await uploadDocumentAsset(data.household.id, file, 'general');
                if (document) {
                  await invokeDocumentExtraction(document.id);
                  await refresh();
                }
              }}
            />
            <DocumentExtractionReview
              householdId={data?.household?.id ?? ''}
              extractions={data?.documentExtractions ?? []}
              onChange={refresh}
            />
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Section status</p>
                <h2 className="mt-3 text-2xl font-semibold text-cmd-offwhite">Ranked by score</h2>
              </div>
              <span className="rounded-full border border-cmd-border bg-cmd-black/60 px-3 py-1 text-xs uppercase tracking-[0.16em] text-cmd-muted">
                {sectionScores.length} sections
              </span>
            </div>
            {sectionScores.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-cmd-border bg-cmd-black/50 p-8 text-center text-cmd-muted">
                No section scores available yet.
              </div>
            ) : (
              <div className="space-y-3">
                {sectionScores.map((section) => {
                  const Icon = sectionIcons[section.section] ?? FileText;
                  const isCritical = section.status === 'action_needed';
                  const isWarning = section.status === 'review';
                  return (
                    <div
                      key={section.id}
                      className={`flex flex-col gap-3 rounded-3xl border ${isCritical ? 'border-red-500/20' : 'border-cmd-border'} bg-cmd-black/40 p-4 xl:flex-row xl:items-center xl:justify-between`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-white/5 p-3 text-cmd-gold">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-cmd-offwhite">{sectionLabels[section.section] ?? section.section}</p>
                          <p className="mt-1 text-sm text-cmd-muted">{section.summary ?? 'No summary available'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="font-mono text-base font-semibold text-cmd-offwhite">{formatScore(section.score)}</span>
                        <span className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.16em] ${
                          isCritical
                            ? 'bg-red-500/10 text-red-300'
                            : isWarning
                            ? 'bg-cmd-gold/10 text-cmd-gold'
                            : 'bg-emerald-500/10 text-emerald-300'
                        }`}> 
                          {section.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-6">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Priority actions</p>
                <h2 className="mt-3 text-2xl font-semibold text-cmd-offwhite">Action items</h2>
              </div>
              <span className="rounded-full border border-cmd-border bg-cmd-black/60 px-3 py-1 text-xs uppercase tracking-[0.16em] text-cmd-muted">
                {openPriorityCount} open
              </span>
            </div>
            {openPriorityCount === 0 ? (
              <div className="rounded-3xl border border-dashed border-cmd-border bg-cmd-black/50 p-8 text-center text-cmd-muted">
                No active priority actions. Everything looks up to date.
              </div>
            ) : (
              <div className="space-y-4">
                {severityOrder.map((severity) => {
                  const items = groupedPriorities[severity] ?? [];
                  if (!items.length) return null;
                  const { label, accent } = severityLabels[severity];
                  return (
                    <div key={severity} className="space-y-3">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-cmd-muted">
                        <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] ${accent}`}>{label}</span>
                        <span>{items.length} item{items.length === 1 ? '' : 's'}</span>
                      </div>
                      <div className="space-y-3">
                        {items.map((item) => (
                          <div key={item.id} className="rounded-3xl border border-cmd-border bg-cmd-black/40 p-4">
                            <div className="mb-3 flex items-center justify-between gap-4">
                              <div className="text-sm font-semibold text-cmd-offwhite">{item.title}</div>
                              <div className="font-mono text-xs uppercase tracking-[0.2em] text-cmd-muted">
                                {formatDateLabel(item.due_date)}
                              </div>
                            </div>
                            <p className="text-sm leading-6 text-cmd-muted">{item.description ?? 'No additional detail available.'}</p>
                            {item.estimated_value != null ? (
                              <div className="mt-4 flex items-center justify-between rounded-3xl bg-white/5 px-4 py-3 text-sm">
                                <span className="text-cmd-gold">Estimated value</span>
                                <span className="font-mono text-cmd-offwhite">${item.estimated_value.toLocaleString()}</span>
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-cmd-border bg-cmd-charcoal p-6">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Timeline</p>
                <h2 className="mt-3 text-2xl font-semibold text-cmd-offwhite">Next 90 days</h2>
              </div>
              <div className="rounded-full border border-cmd-border bg-cmd-black/60 px-3 py-1 text-xs uppercase tracking-[0.16em] text-cmd-muted">
                {timelineEvents.length} events
              </div>
            </div>
            {timelineEvents.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-cmd-border bg-cmd-black/50 p-8 text-center text-cmd-muted">
                No upcoming events in the next 90 days.
              </div>
            ) : (
              <div className="space-y-3">
                {timelineEvents.map((event) => {
                  const date = formatTimelineDate(event.event_date);
                  const isUrgent = event.event_type === 'deadline' || event.event_type === 'renewal';
                  return (
                    <div key={event.id} className="flex items-start justify-between gap-4 rounded-3xl border border-cmd-border bg-cmd-black/40 p-4">
                      <div className="min-w-[72px] text-sm font-mono text-cmd-gold">{date}</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-cmd-offwhite">{event.title}</p>
                        <p className="mt-1 text-sm text-cmd-muted">{event.category ?? 'General'}</p>
                      </div>
                      <div className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${
                        isUrgent ? 'bg-cmd-gold text-cmd-black' : 'bg-cmd-border text-cmd-muted'
                      }`}>{event.event_type.replace('_', ' ')}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
