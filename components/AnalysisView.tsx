import React from 'react';
import { AnalysisResult, ExperimentStatus } from '../types';

interface AnalysisViewProps {
  result: AnalysisResult;
}

const AnalysisView: React.FC<AnalysisViewProps> = ({ result }) => {
  const getStatusStyles = (status: ExperimentStatus) => {
    switch (status) {
      case ExperimentStatus.NORMAL:
        return {
          container: 'bg-emerald-50 border-emerald-200',
          icon: 'text-emerald-600 border-emerald-200 bg-white',
          title: 'text-emerald-800',
          text: 'text-emerald-600'
        };
      case ExperimentStatus.WARNING:
        return {
          container: 'bg-amber-50 border-amber-200',
          icon: 'text-amber-600 border-amber-200 bg-white',
          title: 'text-amber-800',
          text: 'text-amber-600'
        };
      case ExperimentStatus.CRITICAL:
        return {
          container: 'bg-rose-50 border-rose-200',
          icon: 'text-rose-600 border-rose-200 bg-white',
          title: 'text-rose-800',
          text: 'text-rose-600'
        };
      default:
        return {
          container: 'bg-slate-50 border-slate-200',
          icon: 'text-slate-600 border-slate-200 bg-white',
          title: 'text-slate-800',
          text: 'text-slate-600'
        };
    }
  };

  const styles = getStatusStyles(result.status);

  const getStatusIcon = (status: ExperimentStatus) => {
    switch (status) {
      case ExperimentStatus.NORMAL: return '✓';
      case ExperimentStatus.WARNING: return '⚠';
      case ExperimentStatus.CRITICAL: return '☠';
      default: return '?';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Status Badge */}
      <div className={`flex items-center gap-4 p-5 rounded-xl border shadow-sm ${styles.container}`}>
        <div className={`flex items-center justify-center w-12 h-12 rounded-full border text-2xl font-bold shadow-sm ${styles.icon}`}>
          {getStatusIcon(result.status)}
        </div>
        <div>
          <h2 className={`text-sm uppercase tracking-wider font-bold opacity-70 ${styles.text}`}>Experiment Status</h2>
          <p className={`text-2xl font-bold tracking-tight ${styles.title}`}>{result.status}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Observation & Deduction */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <span className="text-blue-500">◉</span> Visual Observation
            </h3>
            <p className="text-slate-600 leading-relaxed">
              {result.observation}
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 text-slate-900 text-6xl">🧠</div>
            <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <span className="text-purple-500">❖</span> Deductive Reasoning
            </h3>
            <p className="text-slate-600 leading-relaxed font-mono text-sm bg-slate-50 p-4 rounded-lg border border-slate-100">
              {result.deduction}
            </p>
          </div>
        </div>

        {/* Action Plan */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col h-full">
           <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <span className="text-emerald-500">➜</span> Action Plan
            </h3>
            <div className="flex-grow bg-emerald-50/50 rounded-lg p-5 border border-emerald-100">
               <p className="text-slate-700 text-lg font-medium leading-relaxed">
                 {result.recommendation}
               </p>
            </div>
             <div className="mt-4 text-xs text-slate-400 text-center font-medium">
              AI recommendations should be verified by human personnel.
            </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisView;