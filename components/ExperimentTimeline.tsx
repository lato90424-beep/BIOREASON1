import React, { useMemo } from 'react';
import { HistoryItem, ExperimentStatus } from '../types';

interface ExperimentTimelineProps {
  history: HistoryItem[];
}

const ExperimentTimeline: React.FC<ExperimentTimelineProps> = ({ history }) => {
  // We only show the last 20 points for the graph to keep it readable
  const dataWindow = useMemo(() => history.slice(-20), [history]);

  const getStatusValue = (status: ExperimentStatus) => {
    switch (status) {
      case ExperimentStatus.NORMAL: return 0;
      case ExperimentStatus.WARNING: return 1;
      case ExperimentStatus.CRITICAL: return 2;
      default: return 0;
    }
  };

  const Graph = () => {
    if (dataWindow.length < 2) {
      return (
        <div className="h-48 flex items-center justify-center text-slate-400 text-sm border border-slate-100 rounded-lg bg-slate-50">
          Not enough data points for trend analysis...
        </div>
      );
    }

    const height = 160;
    const width = 1000; // SVG coordinate space
    const padding = 20;
    
    // Scales
    const minTime = dataWindow[0].timestamp;
    const maxTime = dataWindow[dataWindow.length - 1].timestamp;
    const timeRange = maxTime - minTime || 1;

    // Y-Axis for Status (0-2)
    const yScaleStatus = (val: number) => height - padding - (val / 2) * (height - 2 * padding);
    
    // Y-Axis for Temp (Auto-scaled)
    const temps = dataWindow.map(d => d.telemetry.temperature);
    const minTemp = Math.min(...temps) - 1;
    const maxTemp = Math.max(...temps) + 1;
    const tempRange = maxTemp - minTemp || 1;
    const yScaleTemp = (val: number) => height - padding - ((val - minTemp) / tempRange) * (height - 2 * padding);

    const xScale = (t: number) => padding + ((t - minTime) / timeRange) * (width - 2 * padding);

    // Generate Paths
    const statusPath = dataWindow.map((d, i) => 
      `${i === 0 ? 'M' : 'L'} ${xScale(d.timestamp)} ${yScaleStatus(getStatusValue(d.analysis.status))}`
    ).join(' ');

    const tempPath = dataWindow.map((d, i) => 
      `${i === 0 ? 'M' : 'L'} ${xScale(d.timestamp)} ${yScaleTemp(d.telemetry.temperature)}`
    ).join(' ');

    return (
      <div className="w-full overflow-hidden bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
        <div className="flex justify-between items-center mb-4">
            <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Live Trends</h4>
            <div className="flex gap-4 text-xs">
                <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-slate-600">Safety Score</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span className="text-slate-600">Temperature</span>
                </div>
            </div>
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40 overflow-visible">
          {/* Grid lines */}
          <line x1={padding} y1={yScaleStatus(0)} x2={width-padding} y2={yScaleStatus(0)} stroke="#e2e8f0" strokeDasharray="4 4" />
          <line x1={padding} y1={yScaleStatus(1)} x2={width-padding} y2={yScaleStatus(1)} stroke="#e2e8f0" strokeDasharray="4 4" />
          <line x1={padding} y1={yScaleStatus(2)} x2={width-padding} y2={yScaleStatus(2)} stroke="#e2e8f0" strokeDasharray="4 4" />

          {/* Paths */}
          <path d={tempPath} fill="none" stroke="#3b82f6" strokeWidth="2" strokeOpacity="0.5" />
          <path d={statusPath} fill="none" stroke="#10b981" strokeWidth="3" />

          {/* Points */}
          {dataWindow.map((d, i) => (
            <g key={i}>
              <circle cx={xScale(d.timestamp)} cy={yScaleStatus(getStatusValue(d.analysis.status))} r="4" fill={
                d.analysis.status === 'CRITICAL' ? '#f43f5e' : 
                d.analysis.status === 'WARNING' ? '#f59e0b' : '#10b981'
              } stroke="white" strokeWidth="2" />
            </g>
          ))}
        </svg>
      </div>
    );
  };

  const Logs = () => (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[280px]">
      <div className="p-3 border-b border-slate-100 bg-slate-50/50">
        <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Analysis Logs</h4>
      </div>
      <div className="overflow-y-auto p-0 scroll-smooth">
        {history.length === 0 ? (
           <div className="p-8 text-center text-slate-400 text-sm">No analysis recorded yet.</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {[...history].reverse().map((item) => (
              <div key={item.timestamp} className="p-3 hover:bg-slate-50 transition-colors flex gap-3 items-start group">
                <div className="min-w-[60px] text-[10px] font-mono text-slate-400 pt-1">
                  {new Date(item.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
                <div className="flex-grow">
                   <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                        item.analysis.status === 'CRITICAL' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                        item.analysis.status === 'WARNING' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                        'bg-emerald-50 text-emerald-700 border-emerald-100'
                      }`}>
                        {item.analysis.status}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        {item.telemetry.temperature.toFixed(1)}°C
                      </span>
                   </div>
                   <p className="text-xs text-slate-800 font-medium mb-0.5">{item.analysis.observation}</p>
                   <p className="text-[11px] text-slate-500 leading-tight">{item.analysis.deduction}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
       <div className="lg:col-span-2">
         <Graph />
       </div>
       <div className="lg:col-span-1">
         <Logs />
       </div>
    </div>
  );
};

export default ExperimentTimeline;