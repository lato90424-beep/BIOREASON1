import React from 'react';
import { ThinkingLevel } from '../types';

interface SidebarProps {
  context: string;
  setContext: (val: string) => void;
  thinkingLevel: ThinkingLevel;
  setThinkingLevel: (val: ThinkingLevel) => void;
  onOpenGallery: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  context,
  setContext,
  thinkingLevel,
  setThinkingLevel,
  onOpenGallery
}) => {
  return (
    <aside className="w-full md:w-80 bg-white border-r border-slate-200 p-6 flex flex-col h-full overflow-y-auto shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] z-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <span className="text-emerald-600">❖</span> BioReason
        </h1>
        <p className="text-slate-500 text-xs mt-1 font-mono">AI-POWERED LAB PARTNER</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Reasoning Depth
          </label>
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setThinkingLevel('LOW')}
              className={`text-sm py-2 px-3 rounded-md transition-all duration-200 font-medium ${
                thinkingLevel === 'LOW'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Low
            </button>
            <button
              onClick={() => setThinkingLevel('HIGH')}
              className={`text-sm py-2 px-3 rounded-md transition-all duration-200 font-medium ${
                thinkingLevel === 'HIGH'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              High
            </button>
          </div>
        </div>

        <div className="flex-grow flex flex-col">
          <div className="flex justify-between items-end mb-2">
            <label htmlFor="context" className="block text-sm font-semibold text-slate-700">
              Experiment Context
            </label>
          </div>
          
          <button 
            onClick={onOpenGallery}
            className="mb-3 w-full group relative flex items-center justify-center gap-2 bg-slate-900 hover:bg-emerald-600 text-white text-sm font-medium py-2.5 px-4 rounded-lg shadow-sm transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <svg className="w-4 h-4 text-slate-300 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            <span className="relative">Browse Library</span>
          </button>

          <textarea
            id="context"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            className="w-full flex-grow bg-white border border-slate-200 rounded-lg p-3 text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none min-h-[200px] shadow-sm transition-all"
            placeholder="Describe the experiment:&#10;- Reactants used&#10;- Expected outcome&#10;- Temperature/Conditions&#10;- Current phase"
          />
        </div>
      </div>

      <div className="mt-auto pt-6 border-t border-slate-200 text-xs text-slate-400 font-medium">
        <p>Powered by Google Gemini 3</p>
        <p>v1.4.0 • Light Theme</p>
      </div>
    </aside>
  );
};

export default Sidebar;