import React from 'react';

export interface SampleExperiment {
  id: string;
  title: string;
  description: string;
  context: string;
  imageUrl: string;
  colorTag: string;
}

const SAMPLE_EXPERIMENTS: SampleExperiment[] = [
  {
    id: 'titration',
    title: 'Acid-Base Titration',
    description: 'Detection of phenolphthalein endpoint (pH 8.2).',
    context: `Experiment: Acid-Base Titration
Reactants: 0.1M HCl (Analyte), 0.1M NaOH (Titrant)
Indicator: Phenolphthalein
Expected: Solution should turn from clear to faint pink at pH 8.2.
Current State: Adding titrant dropwise near endpoint.`,
    imageUrl: 'https://placehold.co/600x400/ffe4e6/be123c?text=Titration+Endpoint', // Pinkish
    colorTag: 'bg-pink-100 text-pink-800'
  },
  {
    id: 'iodine',
    title: 'Iodine Clock Reaction',
    description: 'Sudden state change to dark blue complex.',
    context: `Experiment: Iodine Clock Reaction
Reactants: Hydrogen Peroxide, Sulfuric Acid, Potassium Iodide, Sodium Thiosulfate, Starch
Expected: Sudden color change from clear to dark blue-black.
Current State: Reagents mixed 30 seconds ago. Waiting for color flash.`,
    imageUrl: 'https://placehold.co/600x400/172554/60a5fa?text=Iodine+Clock', // Dark Blue
    colorTag: 'bg-blue-100 text-blue-800'
  },
  {
    id: 'crystallization',
    title: 'CuSO4 Crystallization',
    description: 'Growth monitoring of triclinic crystals.',
    context: `Experiment: Crystallization of CuSO4
Conditions: Saturated solution cooling slowly.
Expected: Formation of blue triclinic crystals.
Current State: Solution resting for 2 hours. Checking for seed crystals.`,
    imageUrl: 'https://placehold.co/600x400/0ea5e9/e0f2fe?text=CuSO4+Crystals', // Cyan/Blue
    colorTag: 'bg-cyan-100 text-cyan-800'
  },
  {
    id: 'combustion',
    title: 'Magnesium Combustion',
    description: 'High-energy exothermic reaction analysis.',
    context: `Experiment: Combustion of Magnesium Ribbon
Reactants: Magnesium metal, Oxygen
Expected: Bright white light emission and formation of white MgO powder.
Current State: Heating ribbon over Bunsen burner.`,
    imageUrl: 'https://placehold.co/600x400/fff7ed/ea580c?text=Mg+Combustion', // Orange
    colorTag: 'bg-orange-100 text-orange-800'
  }
];

interface ExperimentGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (experiment: SampleExperiment) => void;
}

const ExperimentGallery: React.FC<ExperimentGalleryProps> = ({ isOpen, onClose, onSelect }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in-up">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Experiment Library</h2>
            <p className="text-slate-500 text-sm">Select a standardized test case for calibration or demonstration.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Grid */}
        <div className="overflow-y-auto p-6 bg-slate-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {SAMPLE_EXPERIMENTS.map((exp) => (
              <button
                key={exp.id}
                onClick={() => onSelect(exp)}
                className="group flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-emerald-500/30 transition-all duration-300 text-left"
              >
                <div className="relative h-48 w-full overflow-hidden">
                   <img 
                     src={exp.imageUrl} 
                     alt={exp.title} 
                     className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                   />
                   <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                   <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500 text-white">
                        Load Experiment
                      </span>
                   </div>
                </div>
                
                <div className="p-5 flex-grow">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                      {exp.title}
                    </h3>
                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider ${exp.colorTag}`}>
                      Test Case
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 line-clamp-2">
                    {exp.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-white text-center text-xs text-slate-400">
          Select an experiment to automatically load its context and sample visual data.
        </div>
      </div>
    </div>
  );
};

export default ExperimentGallery;