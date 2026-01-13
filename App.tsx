import React, { useState, useRef, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import AnalysisView from './components/AnalysisView';
import TelemetryPanel from './components/TelemetryPanel';
import ExperimentTimeline from './components/ExperimentTimeline';
import ExperimentGallery, { SampleExperiment } from './components/ExperimentGallery';
import { analyzeExperiment } from './services/geminiService';
import { ThinkingLevel, AnalysisState, TelemetryData, HistoryItem } from './types';

type InputMode = 'UPLOAD' | 'CAMERA';
type UploadType = 'IMAGE' | 'VIDEO' | null;
export type TelemetryMode = 'SIMULATED' | 'MANUAL';

const App: React.FC = () => {
  const [thinkingLevel, setThinkingLevel] = useState<ThinkingLevel>('HIGH');
  const [enablePreprocessing] = useState<boolean>(true);
  const [context, setContext] = useState<string>("");
  
  // Upload State
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoFileSrc, setVideoFileSrc] = useState<string | null>(null);
  const [uploadType, setUploadType] = useState<UploadType>(null);

  const [inputMode, setInputMode] = useState<InputMode>('UPLOAD');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isAutoMonitoring, setIsAutoMonitoring] = useState(false);

  // Camera Capabilities State
  const [videoTrack, setVideoTrack] = useState<MediaStreamTrack | null>(null);
  const [capabilities, setCapabilities] = useState<any>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [focusMode, setFocusMode] = useState<'continuous' | 'manual'>('continuous');
  const [focusDistance, setFocusDistance] = useState<number>(0);
  
  // Gallery State
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  // Telemetry State
  const [telemetryMode, setTelemetryMode] = useState<TelemetryMode>('SIMULATED');
  const [telemetry, setTelemetry] = useState<TelemetryData>({ temperature: 24.5, pressure: 101.3 });

  // Analysis & History State
  const [analysis, setAnalysis] = useState<AnalysisState>({
    isLoading: false,
    result: null,
    error: null,
  });
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Ref for live webcam
  const webcamRef = useRef<HTMLVideoElement>(null);
  // Ref for uploaded video file
  const fileVideoRef = useRef<HTMLVideoElement>(null);
  
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
      // Request camera with preference for environment (rear) camera
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', 
          width: { ideal: 1920 }, 
          height: { ideal: 1080 } 
        } 
      });

      // Track Setup for Controls
      const track = stream.getVideoTracks()[0];
      setVideoTrack(track);

      // Extract Capabilities (Zoom, Focus, etc.)
      // Note: getCapabilities is standard but TypeScript definition might be incomplete in some envs
      const caps: any = track.getCapabilities ? track.getCapabilities() : {};
      setCapabilities(caps);

      const settings: any = track.getSettings ? track.getSettings() : {};
      
      // Initialize state from current settings
      if (settings.zoom) setZoom(settings.zoom);
      // 'continuous' usually maps to 'auto' in UI
      if (settings.focusMode) setFocusMode(settings.focusMode);
      if (settings.focusDistance) setFocusDistance(settings.focusDistance);

      if (webcamRef.current) {
        webcamRef.current.src = ""; // Clear src if any
        webcamRef.current.srcObject = stream;
        webcamRef.current.removeAttribute('crossorigin');
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera input. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (webcamRef.current) {
      // Stop Stream
      if (webcamRef.current.srcObject) {
        const stream = webcamRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        webcamRef.current.srcObject = null;
      }
      setIsCameraActive(false);
      setVideoTrack(null);
      setCapabilities(null);
    }
  };

  // Handle Camera Controls
  const handleZoomChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newZoom = parseFloat(e.target.value);
    setZoom(newZoom);
    if (videoTrack) {
      try {
        await videoTrack.applyConstraints({ advanced: [{ zoom: newZoom }] } as any);
      } catch (err) {
        console.warn("Zoom constraint failed", err);
      }
    }
  };

  const toggleFocusMode = async () => {
    if (!videoTrack) return;
    const newMode = focusMode === 'continuous' ? 'manual' : 'continuous';
    setFocusMode(newMode);
    try {
      await videoTrack.applyConstraints({ advanced: [{ focusMode: newMode }] } as any);
    } catch (err) {
      console.warn("Focus Mode constraint failed", err);
    }
  };

  const handleFocusDistanceChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDist = parseFloat(e.target.value);
    setFocusDistance(newDist);
    if (videoTrack && focusMode === 'manual') {
      try {
        await videoTrack.applyConstraints({ advanced: [{ focusDistance: newDist }] } as any);
      } catch (err) {
        console.warn("Focus Distance constraint failed", err);
      }
    }
  };

  // Automatically start/stop camera based on mode
  useEffect(() => {
    if (inputMode === 'CAMERA') {
      startCamera();
      setIsAutoMonitoring(true);
    } else {
      stopCamera();
      // If switching to upload mode, usually stop monitoring, unless it's a video file
      if (uploadType !== 'VIDEO') {
        setIsAutoMonitoring(false);
      }
    }
    return () => stopCamera();
  }, [inputMode]);

  const captureFrame = useCallback((): string | null => {
    // Determine which video element to capture from
    let sourceVideo: HTMLVideoElement | null = null;

    if (inputMode === 'CAMERA') {
      sourceVideo = webcamRef.current;
    } else if (inputMode === 'UPLOAD' && uploadType === 'VIDEO') {
      sourceVideo = fileVideoRef.current;
    }

    if (!sourceVideo) return null;
    
    // Check if video is ready to supply data
    if (sourceVideo.readyState < 2) { // HAVE_CURRENT_DATA or higher
      // console.log("Video source not ready for capture yet.");
      return null;
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = sourceVideo.videoWidth;
      canvas.height = sourceVideo.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(sourceVideo, 0, 0);
        return canvas.toDataURL('image/jpeg', 0.9);
      }
    } catch (e) {
      console.error("Failed to capture frame:", e);
      return null;
    }
    return null;
  }, [isCameraActive, inputMode, uploadType]);

  // --- File Logic ---
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset Analysis
    setAnalysis({ isLoading: false, result: null, error: null });
    
    // Cleanup previous object URL if it was a video
    if (videoFileSrc) {
      URL.revokeObjectURL(videoFileSrc);
      setVideoFileSrc(null);
    }

    if (file.type.startsWith('video/')) {
      // Handle Video
      const url = URL.createObjectURL(file);
      setVideoFileSrc(url);
      setUploadType('VIDEO');
      setImagePreview(null);
      // Auto-enable monitoring for video files for convenience
      setIsAutoMonitoring(false); 
    } else {
      // Handle Image
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setUploadType('IMAGE');
        setVideoFileSrc(null);
        setIsAutoMonitoring(false); // No auto monitoring for static images
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerUpload = () => fileInputRef.current?.click();
  
  // --- Gallery Logic ---
  const handleGallerySelect = (exp: SampleExperiment) => {
    setContext(exp.context);
    setAnalysis({ isLoading: false, result: null, error: null });
    setHistory([]); 

    // Static mode
    if (videoFileSrc) URL.revokeObjectURL(videoFileSrc);
    setVideoFileSrc(null);
    setImagePreview(exp.imageUrl);
    setUploadType('IMAGE');
    setInputMode('UPLOAD');
    setIsAutoMonitoring(false);
    
    setIsGalleryOpen(false);
  };
  
  // --- Preprocessing & Analysis ---
  const preprocessImage = (source: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "Anonymous"; 
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.filter = 'contrast(1.2) saturate(1.1) blur(0.5px)';
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/jpeg', 0.95));
          } else {
            resolve(source);
          }
        } catch (e) {
          resolve(source);
        }
      };
      img.onerror = () => {
        resolve(source);
      };
      img.src = source;
    });
  };

  const ensureBase64 = async (urlOrData: string): Promise<string> => {
    if (urlOrData.startsWith('data:')) {
      return urlOrData;
    }
    try {
      const response = await fetch(urlOrData, { mode: 'cors' });
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error("Failed to convert URL to base64", e);
      throw new Error("Unable to process image. Network or CORS error.");
    }
  };

  const handleAnalyze = async (manualImage?: string) => {
    let imageToAnalyze: string | null = null;
    
    // Determine Source
    if (inputMode === 'CAMERA') {
      imageToAnalyze = captureFrame();
    } else if (inputMode === 'UPLOAD') {
      if (uploadType === 'VIDEO') {
        imageToAnalyze = captureFrame();
      } else {
        imageToAnalyze = manualImage || imagePreview;
      }
    }

    if (!imageToAnalyze || !context) {
      // Only warn if manual trigger
      if (!isAutoMonitoring) {
        // console.warn("Missing image or context");
      }
      return;
    }

    setAnalysis(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      let finalImageDataUrl = imageToAnalyze;
      if (enablePreprocessing) {
        finalImageDataUrl = await preprocessImage(imageToAnalyze);
      }

      finalImageDataUrl = await ensureBase64(finalImageDataUrl);

      const augmentedContext = `${context}\n\n[REAL-TIME TELEMETRY]\nTemperature: ${telemetry.temperature.toFixed(2)} °C\nPressure: ${telemetry.pressure.toFixed(2)} kPa\nTimestamp: ${new Date().toISOString()}`;

      const parts = finalImageDataUrl.split(',');
      if (parts.length !== 2) throw new Error("Invalid image data format.");
      const base64Data = parts[1];

      const result = await analyzeExperiment(augmentedContext, base64Data, thinkingLevel);
      
      setAnalysis({ isLoading: false, result, error: null });

      setHistory(prev => [
        ...prev, 
        { 
          timestamp: Date.now(), 
          telemetry: { ...telemetry }, 
          analysis: result 
        }
      ]);

    } catch (err: any) {
      console.error("Analysis Error:", err);
      setAnalysis({
        isLoading: false,
        result: null,
        error: err.message || "An unexpected error occurred.",
      });
    }
  };

  // --- Auto Monitoring Loop ---
  useEffect(() => {
    // Auto monitor works for CAMERA OR UPLOADED VIDEO
    const canMonitor = (inputMode === 'CAMERA') || (inputMode === 'UPLOAD' && uploadType === 'VIDEO');

    if (isAutoMonitoring && canMonitor) {
      // Analyze immediately on start
      handleAnalyze(); 

      const interval = setInterval(() => {
        if (!analysis.isLoading) { 
          handleAnalyze();
        }
      }, 5000); // 5 seconds interval
      monitoringIntervalRef.current = interval as unknown as number;
    } else {
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
      }
    }
    return () => {
      if (monitoringIntervalRef.current) clearInterval(monitoringIntervalRef.current);
    };
  }, [isAutoMonitoring, inputMode, uploadType, context, thinkingLevel, enablePreprocessing]); 

  const handleLiveCameraClick = () => {
    setInputMode('CAMERA');
    setIsAutoMonitoring(true);
  };

  const handleFileUploadClick = () => {
    setInputMode('UPLOAD');
    setIsAutoMonitoring(false);
  };

  const isMonitoringCapable = inputMode === 'CAMERA' || (inputMode === 'UPLOAD' && uploadType === 'VIDEO');

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
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Header & Mode Switch */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center border-b border-slate-200 pb-4 gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Live Monitor</h2>
              <p className="text-slate-500 text-sm">Real-time visual analysis pipeline</p>
            </div>
            
            <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
              <button 
                onClick={handleFileUploadClick}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  inputMode === 'UPLOAD' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                File Upload
              </button>
              <button 
                onClick={handleLiveCameraClick}
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
                
                {/* 1. Camera View */}
                {inputMode === 'CAMERA' && (
                  <>
                   <video 
                     ref={webcamRef} 
                     autoPlay 
                     playsInline 
                     muted 
                     className="w-full h-full object-cover"
                   />
                   
                   {/* Camera Controls Overlay */}
                   {capabilities && (
                     <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 flex flex-col gap-2 transition-opacity opacity-0 group-hover:opacity-100 duration-300">
                       
                       {/* Zoom Control */}
                       {capabilities.zoom && (
                         <div className="flex items-center gap-3">
                            <span className="text-white text-xs font-mono w-10 text-right">ZOOM</span>
                            <input 
                              type="range" 
                              min={capabilities.zoom.min} 
                              max={capabilities.zoom.max} 
                              step={capabilities.zoom.step} 
                              value={zoom} 
                              onChange={handleZoomChange}
                              className="flex-grow h-1.5 bg-white/30 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                            <span className="text-white text-xs font-mono w-8">{zoom.toFixed(1)}x</span>
                         </div>
                       )}

                       {/* Focus Controls */}
                       {(capabilities.focusMode || capabilities.focusDistance) && (
                         <div className="flex items-center gap-3">
                            <span className="text-white text-xs font-mono w-10 text-right">FOCUS</span>
                            
                            {/* Auto/Manual Toggle */}
                            {capabilities.focusMode && capabilities.focusMode.length > 1 && (
                               <button 
                                 onClick={toggleFocusMode}
                                 className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${
                                   focusMode === 'continuous' ? 'bg-emerald-500 text-white' : 'bg-white/20 text-white hover:bg-white/40'
                                 }`}
                               >
                                 {focusMode === 'continuous' ? 'Auto' : 'Manual'}
                               </button>
                            )}

                            {/* Distance Slider */}
                            {focusMode === 'manual' && capabilities.focusDistance && (
                               <input 
                                  type="range" 
                                  min={capabilities.focusDistance.min} 
                                  max={capabilities.focusDistance.max} 
                                  step={capabilities.focusDistance.step} 
                                  value={focusDistance} 
                                  onChange={handleFocusDistanceChange}
                                  className="flex-grow h-1.5 bg-white/30 rounded-lg appearance-none cursor-pointer accent-blue-500"
                               />
                            )}
                         </div>
                       )}
                     </div>
                   )}
                  </>
                )}
                
                {/* 2. Upload View */}
                {inputMode === 'UPLOAD' && (
                  <>
                    {!imagePreview && !videoFileSrc ? (
                      // Empty State
                      <div 
                        onClick={triggerUpload}
                        className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-slate-900 transition-colors"
                      >
                         <svg className="w-8 h-8 text-slate-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                         <span className="text-slate-400 text-sm">Upload Image or Video</span>
                      </div>
                    ) : (
                      // Content State
                      <>
                        {uploadType === 'IMAGE' && imagePreview && (
                          <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        )}
                        {uploadType === 'VIDEO' && videoFileSrc && (
                          <video 
                            ref={fileVideoRef} 
                            src={videoFileSrc} 
                            controls 
                            playsInline
                            crossOrigin="anonymous"
                            className="w-full h-full object-contain bg-black"
                          />
                        )}
                        
                        {/* Change File Button */}
                        <div className="absolute top-2 right-2 z-20">
                           <button 
                             onClick={triggerUpload}
                             className="p-1.5 bg-black/50 hover:bg-black/70 rounded-full text-white backdrop-blur-sm transition-colors"
                             title="Change File"
                           >
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                           </button>
                        </div>
                      </>
                    )}
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      accept="image/*,video/*" 
                      className="hidden" 
                    />
                  </>
                )}

                {/* Overlays */}
                {enablePreprocessing && (
                  <div className="absolute top-3 right-12 bg-emerald-600/90 text-white text-[10px] px-2 py-1 rounded-md font-mono backdrop-blur-md shadow-sm border border-emerald-400/30 z-10">
                    CV: ENHANCED
                  </div>
                )}
                
                {isAutoMonitoring && isMonitoringCapable && (
                   <div className="absolute top-3 left-3 flex items-center gap-2 text-white text-[10px] px-2 py-1 rounded-md font-mono backdrop-blur-md shadow-sm z-10 bg-red-600/90 border border-red-400/30">
                     <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                     </span>
                     {inputMode === 'CAMERA' ? 'LIVE MONITORING' : 'VIDEO ANALYSIS'}
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
                  disabled={analysis.isLoading || (inputMode === 'UPLOAD' && !imagePreview && !videoFileSrc)}
                  className={`
                    w-full py-3 rounded-lg font-semibold shadow-sm transition-all flex items-center justify-center gap-2 border
                    ${analysis.isLoading || (inputMode === 'UPLOAD' && !imagePreview && !videoFileSrc)
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' 
                      : 'bg-white hover:bg-emerald-50 text-emerald-700 border-slate-200 hover:border-emerald-300'}
                  `}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {isMonitoringCapable ? 'Capture & Analyze' : 'Analyze Image'}
                </button>

                {isMonitoringCapable && (
                  <button
                    onClick={() => setIsAutoMonitoring(!isAutoMonitoring)}
                    className={`
                      w-full py-3 rounded-lg font-semibold shadow-sm transition-all flex items-center justify-center gap-2 border
                      ${isAutoMonitoring 
                        ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' 
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'}
                    `}
                  >
                    {isAutoMonitoring ? (
                      <>
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                         Pause Monitoring
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Resume Monitoring
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
                      Start the camera, upload a video/image, or select a Test Case from the library to begin.
                    </p>
                 </div>
              )}
            </div>
          </div>

          {/* New Timeline Section */}
          {history.length > 0 && <ExperimentTimeline history={history} />}
        </div>
      </main>
    </div>
  );
};

export default App;