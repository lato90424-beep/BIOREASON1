import React from 'react';
import { TelemetryData } from '../types';
import { TelemetryMode } from '../App';

interface TelemetryPanelProps {
  data: TelemetryData;
  mode: TelemetryMode;
  setMode: (mode: TelemetryMode) => void;
  setData: (data: React.SetStateAction<TelemetryData>) => void;
}

const TelemetryPanel: React.FC<TelemetryPanelProps> = ({ data, mode, setMode, setData }) => {
  
  const handleTempChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setData(prev => ({ ...prev, temperature: isNaN(val) ? 0 : val }));
  };

  const handlePressureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setData(prev => ({ ...prev, pressure: isNaN(val) ? 0 : val }));
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
         <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
           Lab Environment
           <span className="text-xs font-normal normal-case text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
             {mode === 'SIMULATED' ? 'Live Sensors' : 'Manual Entry'}
           </span>
         </h3>
         
         <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setMode('SIMULATED')}
              className={`text-xs font-semibold px-3 py-1 rounded-md transition-all ${
                mode === 'SIMULATED' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Auto
            </button>
            <button
              onClick={() => setMode('MANUAL')}
              className={`text-xs font-semibold px-3 py-1 rounded-md transition-all ${
                mode === 'MANUAL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Manual
            </button>
         </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Temperature Card */}
        <div className={`bg-white p-4 rounded-xl border shadow-sm flex items-center justify-between transition-colors ${mode === 'MANUAL' ? 'border-indigo-100 ring-2 ring-indigo-500/10' : 'border-slate-200'}`}>
          <div className="flex-grow">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Temperature</p>
            <div className="flex items-center gap-2">
              {mode === 'MANUAL' ? (
                <input 
                  type="number" 
                  step="0.1"
                  value={data.temperature} 
                  onChange={handleTempChange}
                  className="w-full text-2xl font-bold text-slate-900 border-b border-slate-200 focus:border-indigo-500 outline-none bg-transparent p-0"
                />
              ) : (
                <span className="text-2xl font-bold text-slate-900">{data.temperature.toFixed(1)}</span>
              )}
              <span className="text-sm font-medium text-slate-400">°C</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 ml-4 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>

        {/* Pressure Card */}
        <div className={`bg-white p-4 rounded-xl border shadow-sm flex items-center justify-between transition-colors ${mode === 'MANUAL' ? 'border-indigo-100 ring-2 ring-indigo-500/10' : 'border-slate-200'}`}>
          <div className="flex-grow">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Pressure</p>
            <div className="flex items-center gap-2">
              {mode === 'MANUAL' ? (
                <input 
                  type="number" 
                  step="0.1"
                  value={data.pressure} 
                  onChange={handlePressureChange}
                  className="w-full text-2xl font-bold text-slate-900 border-b border-slate-200 focus:border-indigo-500 outline-none bg-transparent p-0"
                />
              ) : (
                <span className="text-2xl font-bold text-slate-900">{data.pressure.toFixed(1)}</span>
              )}
              <span className="text-sm font-medium text-slate-400">kPa</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-500 ml-4 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TelemetryPanel;