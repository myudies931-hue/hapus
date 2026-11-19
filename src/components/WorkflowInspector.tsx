import React, { useState } from 'react';
import { WORKFLOW_STEPS } from '../data/workflowSteps';
import { WorkflowStep } from '../types';

interface WorkflowInspectorProps {
  dryRun: boolean;
}

export const WorkflowInspector: React.FC<WorkflowInspectorProps> = ({ dryRun }) => {
  const [selectedStep, setSelectedStep] = useState<WorkflowStep>(WORKFLOW_STEPS[0]);

  return (
    <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-900">
            Inspektor Alur Otomatisasi 12 Langkah
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Klik setiap langkah untuk melihat selector DOM, penanganan iframe, dan mekanisme fallback ID/EN yang tertanam di skrip.
          </p>
        </div>
        <span className="text-xs text-slate-500 font-mono tabular-nums whitespace-nowrap">
          12 Tahap · {dryRun ? 'Mode Dry Run Aktif' : 'Mode Eksekusi Penuh'}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Daftar 12 Langkah */}
        <div className="lg:col-span-7 divide-y divide-slate-200 border-b lg:border-b-0 lg:border-r border-slate-200">
          {WORKFLOW_STEPS.map((step) => {
            const isSelected = selectedStep.number === step.number;
            return (
              <button
                key={step.number}
                type="button"
                onClick={() => setSelectedStep(step)}
                className={`w-full text-left px-6 py-3.5 flex items-start gap-4 transition-colors cursor-pointer ${
                  isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                }`}
              >
                <span
                  className={`font-mono tabular-nums text-xs font-semibold w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {String(step.number).padStart(2, '0')}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-900">
                    {step.title}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                    {step.summary}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Detail Selector & Catatan Teknis */}
        <div className="lg:col-span-5 p-6 bg-slate-50/50 space-y-5">
          <div>
            <div className="text-xs font-mono text-blue-600 font-medium">
              Langkah {String(selectedStep.number).padStart(2, '0')} dari 12
            </div>
            <h3 className="font-display text-lg font-semibold text-slate-900 mt-1">
              {selectedStep.title}
            </h3>
            <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
              {selectedStep.summary}
            </p>
          </div>

          <div className="pt-4 border-t border-slate-200 space-y-2">
            <div className="text-xs font-medium text-slate-700">Konteks Halaman / Target</div>
            <div className="text-xs font-mono text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 break-all">
              {selectedStep.targetUrlOrContext}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium text-slate-700">Selector & Pencocokan Otomatis</div>
            <div className="bg-slate-900 text-slate-100 rounded-lg p-3.5 space-y-1.5 overflow-x-auto">
              {selectedStep.selectors.map((sel, i) => (
                <div key={i} className="text-xs font-mono text-slate-200 whitespace-nowrap">
                  {sel}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200">
            <div className="text-xs font-medium text-slate-700 mb-1">Catatan Implementasi</div>
            <p className="text-xs text-slate-600 leading-relaxed">{selectedStep.notes}</p>
          </div>
        </div>
      </div>
    </section>
  );
};
