import React, { useState, useRef, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import AnalysisView from './components/AnalysisView';
import TelemetryPanel from './components/TelemetryPanel';
import ExperimentGallery, { SampleExperiment } from './components/ExperimentGallery';
import { analyzeExperiment } from './services/geminiService';
import { ThinkingLevel, AnalysisState, TelemetryData } from './types';

type InputMode = 'UPLOAD' | 'CAMERA';
export type TelemetryMode = 'SIMULATED' | 'MANUAL';

const App: React.FC = () => {
  const [thinkingLevel, setThinkingLevel] = useState<ThinkingLevel>('HIGH');
  // Auto-enhance is now always enabled (normal mode)
  const [enablePreprocessing] = useState<boolean>(true);
  const [context, setContext] = useState<string>("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const [inputMode, setInputMode] = useState<InputMode>('UPLOAD');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isAutoMonitoring, setIsAutoMonitoring] = useState(false);
  
  // Gallery State
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  // Telemetry State
  const [telemetryMode, setTelemetryMode] = useState<TelemetryMode>('SIMULATED');
  const [telemetry, setTelemetry] = useState<TelemetryData>({ temperature: 24.5, pressure: 101.3 });

  const [analysis, setAnalysis] = useState<AnalysisState>({
    isLoading: false,
    result: null,
    error: null,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const monitoringIntervalRef = useRef<number | null>(null);

  // --- Telemetry Simulation ---
  useEffect(() => {
    let interval: any;
    if (telemetryMode === 'SIMULATED') {
      interval = setInterval(() => {
        setTelemetry(prev => ({
          temperature: prev.temperature + (Math.random() - 0.5) * 0.2, // Small random drift
          pressure: prev.pressure + (Math.random() - 0.5) * 0.1
        }));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [telemetryMode]);

  // --- Camera Logic ---
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraActive(false);
      setIsAutoMonitoring(false);
    }
  };

  useEffect(() => {
    if (inputMode === 'CAMERA') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [inputMode]);

  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !isCameraActive) return null;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      return canvas.toDataURL('image/jpeg', 0.9);
    }
    return null;
  }, [isCameraActive]);

  // --- File Logic ---
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setAnalysis({ isLoading: false, result: null, error: null });
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerUpload = () => fileInputRef.current?.click();
  
  // --- Gallery Logic ---
  const handleGallerySelect = (exp: SampleExperiment) => {
    setContext(exp.context);
    setImagePreview(exp.imageUrl);
    setInputMode('UPLOAD');
    setIsGalleryOpen(false);
    // Reset analysis when loading new experiment
    setAnalysis({ isLoading: false, result: null, error: null });
  };

  // --- Preprocessing & Analysis ---
  const preprocessImage = (source: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "Anonymous"; // Allow CORS for placeholder images
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          // Filters: enhance contrast/saturation for chemical visibility, blur for noise
          ctx.filter = 'contrast(1.2) saturate(1.1) blur(0.5px)';
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.95));
        } else {
          resolve(source);
        }
      };
      img.onerror = () => resolve(source);
      img.src = source;
    });
  };

  const handleAnalyze = async (manualImage?: string) => {
    // If in camera mode and no image provided, capture one
    let imageToAnalyze = manualImage || imagePreview;
    
    if (inputMode === 'CAMERA' && !manualImage) {
      const captured = captureFrame();
      if (captured) {
        imageToAnalyze = captured;
        setImagePreview(captured); // Show captured frame in preview if we want, or just analyze
      }
    }

    if (!imageToAnalyze || !context) return;

    setAnalysis(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      let finalImageDataUrl = imageToAnalyze;
      if (enablePreprocessing) {
        finalImageDataUrl = await preprocessImage(imageToAnalyze);
      }

      // Augment context with Telemetry Data for the AI
      const augmentedContext = `${context}\n\n[REAL-TIME TELEMETRY]\nTemperature: ${telemetry.temperature.toFixed(2)} °C\nPressure: ${telemetry.pressure.toFixed(2)} kPa\nTimestamp: ${new Date().toISOString()}`;

      const base64Data = finalImageDataUrl.split(',')[1];
      const result = await analyzeExperiment(augmentedContext, base64Data, thinkingLevel);
      setAnalysis({ isLoading: false, result, error: null });
    } catch (err: any) {
      setAnalysis({
        isLoading: false,
        result: null,
        error: err.message || "An unexpected error occurred.",
      });
      // Stop monitoring on error
      setIsAutoMonitoring(false);
    }
  };

  // --- Auto Monitoring Loop ---
  useEffect(() => {
    if (isAutoMonitoring && inputMode === 'CAMERA') {
      const interval = setInterval(() => {
        if (!analysis.isLoading) { // Don't queue if already processing
          handleAnalyze();
        }
      }, 10000); // Analyze every 10 seconds
      monitoringIntervalRef.current = interval as unknown as number;
    } else {
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
      }
    }
    return () => {
      if (monitoringIntervalRef.current) clearInterval(monitoringIntervalRef.current);
    };
  }, [isAutoMonitoring, inputMode, analysis.isLoading, context, thinkingLevel, enablePreprocessing, telemetry]);

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden relative">
      
      {/* Experiment Library Modal */}
      <ExperimentGallery 
        isOpen={isGalleryOpen} 
        onClose={() => setIsGalleryOpen(false)}
        onSelect={handleGallerySelect}
      />

      {/* Sidebar */}
      <Sidebar
        context={context}
        setContext={setContext}
        thinkingLevel={thinkingLevel}
        setThinkingLevel={setThinkingLevel}
        onOpenGallery={() => setIsGalleryOpen(true)}
      />

      {/* Main Content */}
      <main className="flex-grow h-full overflow-y-auto p-4 md:p-8 relative">
        <div className="max-w-5xl mx-auto space-y-6">
          
          {/* Header & Mode Switch */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center border-b border-slate-200 pb-4 gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Live Monitor</h2>
              <p className="text-slate-500 text-sm">Real-time visual analysis pipeline</p>
            </div>
            
            <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
              <button 
                onClick={() => setInputMode('UPLOAD')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  inputMode === 'UPLOAD' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                File Upload
              </button>
              <button 
                onClick={() => setInputMode('CAMERA')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                  inputMode === 'CAMERA' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span>Live Camera</span>
                {inputMode === 'CAMERA' && <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>}
              </button>
            </div>
          </div>

          {/* Telemetry Dashboard */}
          <TelemetryPanel 
            data={telemetry} 
            mode={telemetryMode} 
            setMode={setTelemetryMode} 
            setData={setTelemetry} 
          />

          {/* Visual Feed Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 flex flex-col gap-4">
              <div className="relative bg-black rounded-xl overflow-hidden aspect-[4/3] shadow-md border border-slate-300 group">
                {/* Camera View */}
                {inputMode === 'CAMERA' && (
                   <video 
                     ref={videoRef} 
                     autoPlay 
                     playsInline 
                     muted 
                     className="w-full h-full object-cover"
                   />
                )}
                
                {/* Image Preview View */}
                {inputMode === 'UPLOAD' && (
                  <>
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div 
                        onClick={triggerUpload}
                        className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-slate-900 transition-colors"
                      >
                         <svg className="w-8 h-8 text-slate-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                         <span className="text-slate-400 text-sm">Click to Upload</span>
                      </div>
                    )}
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                  </>
                )}

                {/* Overlays */}
                {enablePreprocessing && (
                  <div className="absolute top-3 right-3 bg-emerald-600/90 text-white text-[10px] px-2 py-1 rounded-md font-mono backdrop-blur-md shadow-sm border border-emerald-400/30 z-10">
                    CV: ENHANCED
                  </div>
                )}
                {analysis.isLoading && (
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-20">
                     <div className="flex flex-col items-center">
                        <svg className="animate-spin h-8 w-8 text-white mb-2" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-white text-xs font-bold tracking-wider">REASONING...</span>
                     </div>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => handleAnalyze()}
                  disabled={analysis.isLoading || (inputMode === 'UPLOAD' && !imagePreview)}
                  className={`
                    w-full py-3 rounded-lg font-semibold shadow-sm transition-all flex items-center justify-center gap-2 border
                    ${analysis.isLoading || (inputMode === 'UPLOAD' && !imagePreview)
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' 
                      : 'bg-white hover:bg-emerald-50 text-emerald-700 border-slate-200 hover:border-emerald-300'}
                  `}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {inputMode === 'CAMERA' ? 'Capture & Analyze' : 'Analyze Image'}
                </button>

                {inputMode === 'CAMERA' && (
                  <button
                    onClick={() => setIsAutoMonitoring(!isAutoMonitoring)}
                    className={`
                      w-full py-3 rounded-lg font-semibold shadow-sm transition-all flex items-center justify-center gap-2 border
                      ${isAutoMonitoring 
                        ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' 
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}
                    `}
                  >
                    {isAutoMonitoring ? (
                      <>
                        <span className="relative flex h-2 w-2 mr-1">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                        </span>
                        Stop Monitoring
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Auto-Monitor (10s)
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Analysis Result Area */}
            <div className="md:col-span-2">
               {analysis.error && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm mb-4 shadow-sm">
                  <strong className="font-bold block mb-1 flex items-center gap-2">
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                     Analysis Error
                  </strong>
                  {analysis.error}
                </div>
              )}

              {analysis.result ? (
                <AnalysisView result={analysis.result} />
              ) : (
                 <div className="h-full min-h-[400px] bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-slate-400">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <h3 className="text-lg font-medium text-slate-600">Awaiting Data</h3>
                    <p className="max-w-xs text-center text-sm mt-2">
                      Start the camera or upload an image to begin the deductive reasoning process.
                    </p>
                 </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;