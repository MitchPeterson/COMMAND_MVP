// Something to take into the meeting.
//
// The first twenty minutes with a planner, a preparer or an agent are spent
// reciting facts the household already owns — balances, rates, limits, ages,
// last year's AGI. Command has read all of it, so the recitation is avoidable.
//
// Three reports rather than one, because the same facts are not equally useful
// to all three: a planner wants the balance sheet and every rate, a preparer
// wants last year's return and the ages at year end, an agent shopping a policy
// wants quotable limits and what an underwriter will ask. One combined document
// would be longer and worse for each of them.
//
// Saved through the browser's own print dialog. It costs nothing, produces a
// real PDF on every platform, and keeps the report as text a professional can
// copy figures out of rather than an image of a report.

import React, { useMemo, useState } from 'react';
import { FileDown, Printer, Check } from 'lucide-react';
import { useHousehold } from '../useHousehold';
import { AUDIENCES, buildReport, type Audience, type ReportSection } from '../lib/reportPack';
import { Logo } from '../components/Logo';

function SectionBlock({ section }: { section: ReportSection }) {
  const hasRows = (section.rows?.length ?? 0) > 0;
  const hasFields = (section.fields?.length ?? 0) > 0;

  return (
    <section className="print-section mt-8">
      <h2 className="border-b border-neutral-300 pb-1.5 text-[13px] font-semibold uppercase tracking-[0.14em] text-neutral-900">
        {section.title}
      </h2>
      {section.intro && (
        <p className="mt-2 text-[12px] leading-5 text-neutral-600">{section.intro}</p>
      )}

      {hasFields && (
        <dl className="mt-3 grid gap-x-8 gap-y-2 sm:grid-cols-2">
          {section.fields!.map((field) => (
            <div key={field.label} className="flex items-baseline justify-between gap-4 border-b border-neutral-100 pb-1">
              <dt className="text-[12px] text-neutral-600">
                {field.label}
                {field.source && (
                  <span className="block text-[10px] leading-4 text-neutral-400">{field.source}</span>
                )}
              </dt>
              <dd className="shrink-0 font-mono text-[12px] font-medium text-neutral-900">{field.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {hasRows && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr>
                {section.columns!.map((column) => (
                  <th
                    key={column}
                    className="border-b border-neutral-300 pb-1 pr-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-500"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.rows!.map((row, i) => (
                <tr key={i} className="align-top">
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className={`border-b border-neutral-100 py-1.5 pr-3 text-neutral-800 ${j > 0 ? 'font-mono' : ''}`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!hasRows && !hasFields && section.empty && (
        <p className="mt-3 text-[12px] italic leading-5 text-neutral-500">{section.empty}</p>
      )}
      {hasRows === false && section.columns && section.empty && (
        <p className="mt-3 text-[12px] italic leading-5 text-neutral-500">{section.empty}</p>
      )}
    </section>
  );
}

export function ReportsView() {
  const { data } = useHousehold();
  const [audience, setAudience] = useState<Audience>('planner');

  const report = useMemo(
    () => (data ? buildReport(audience, data) : null),
    [audience, data],
  );

  if (!report) return null;

  return (
    <div className="space-y-6">
      {/* The picker never prints. */}
      <section className="print-hide rounded-3xl border border-cmd-border bg-cmd-black/40 p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">Share</p>
        <h1 className="mt-2 text-2xl font-semibold text-cmd-offwhite">Take a snapshot to a meeting</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-cmd-muted">
          Command has already read your paperwork. Choose who you are meeting and it assembles what
          they will ask for, along with what it has not been able to see.
        </p>

        <div className="mt-6 grid gap-3 lg:grid-cols-3">
          {AUDIENCES.map((option) => {
            const active = option.id === audience;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setAudience(option.id)}
                className={`rounded-2xl border p-5 text-left transition ${
                  active
                    ? 'border-cmd-gold bg-cmd-gold/10'
                    : 'border-cmd-border bg-cmd-charcoal hover:border-cmd-gold/40'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className={`text-sm font-semibold ${active ? 'text-cmd-gold' : 'text-cmd-offwhite'}`}>
                    {option.label}
                  </p>
                  {active && <Check className="h-4 w-4 shrink-0 text-cmd-gold" />}
                </div>
                <p className="mt-1 text-xs text-cmd-muted">{option.who}</p>
                <ul className="mt-3 space-y-1.5">
                  {option.covers.map((line) => (
                    <li key={line} className="text-xs leading-5 text-cmd-muted">— {line}</li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-cmd-border pt-6">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-full bg-cmd-gold px-5 py-2.5 text-sm font-semibold text-cmd-black transition hover:bg-cmd-gold-hover"
          >
            <FileDown className="h-4 w-4" /> Save as PDF
          </button>
          <p className="inline-flex items-center gap-2 text-xs text-cmd-muted">
            <Printer className="h-3.5 w-3.5" />
            Opens your print dialog — choose “Save as PDF” as the destination.
          </p>
        </div>
      </section>

      {/* Everything below is the document itself, set light for paper. */}
      <div className="print-report rounded-3xl bg-white p-10 text-neutral-900 shadow-sm">
        <header className="print-section flex items-start justify-between gap-8 border-b-2 border-neutral-900 pb-5">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-neutral-900">{report.title}</h1>
            <p className="mt-1.5 text-[13px] text-neutral-700">
              {report.household}
              {report.location ? ` · ${report.location}` : ''}
            </p>
            <p className="mt-0.5 text-[11px] text-neutral-500">Prepared {report.generatedOn}</p>
          </div>
          <Logo tone="light" className="h-9 w-auto shrink-0 object-contain" />
        </header>

        <p className="mt-5 text-[11px] leading-5 text-neutral-500">
          Assembled by Command from the documents this household has uploaded. Figures are reported as
          the documents state them, or as the household entered them, and each is labeled accordingly.
          Command does not assess whether any position is adequate or advisable.
        </p>

        {report.sections.map((section) => (
          <SectionBlock key={section.title} section={section} />
        ))}

        <section className="print-section mt-10 rounded-lg border border-neutral-300 bg-neutral-50 p-5">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-neutral-900">
            What Command could not see
          </h2>
          <p className="mt-2 text-[12px] leading-5 text-neutral-600">
            Listed so nothing here is mistaken for a complete picture.
          </p>
          {report.gaps.length > 0 ? (
            <ul className="mt-3 space-y-1.5">
              {report.gaps.map((gap) => (
                <li key={gap} className="text-[12px] leading-5 text-neutral-800">— {gap}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[12px] italic text-neutral-500">
              Nothing further flagged for this report.
            </p>
          )}
        </section>

        {report.provenance.length > 0 && (
          <section className="print-section mt-8">
            <h2 className="border-b border-neutral-300 pb-1.5 text-[13px] font-semibold uppercase tracking-[0.14em] text-neutral-900">
              Documents on file
            </h2>
            {/* Not titled "read from": this is everything Command holds for the
                household, and a credit statement did not inform an insurance
                report. Saying so is cheaper than filtering it wrongly. */}
            <p className="mt-2 text-[11px] leading-5 text-neutral-500">
              Everything Command has read for this household, not only what this report draws on.
            </p>
            <ul className="mt-3 space-y-1">
              {report.provenance.map((line) => (
                <li key={line} className="text-[11px] leading-5 text-neutral-600">{line}</li>
              ))}
            </ul>
          </section>
        )}

        <footer className="mt-10 border-t border-neutral-300 pt-4 text-[10px] leading-4 text-neutral-500">
          Generated by Command · {report.generatedOn} · Social Security numbers, full account numbers
          and license numbers are not stored by Command and do not appear in this report.
        </footer>
      </div>
    </div>
  );
}
