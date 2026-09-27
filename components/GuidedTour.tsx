'use client';
import React, { useState, useEffect } from 'react';
import { Play, Pause, X, ChevronRight, ChevronLeft } from 'lucide-react';

interface GuidedTourProps {
  onTriggerSpike: () => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const STEPS = [
  {
    target: 'metrics-strip',
    title: 'Tri-Parameter Readout Cards',
    content: "Live 2.5s telemetry streams for Safdarjung AWS (DEL-04) strictly monitoring Temperature, Barometric Pressure, and Relative Humidity. On mobile, this connects directly to the phone's physical barometer.",
    position: 'bottom',
  },
  {
    target: 'recharts-canvas',
    title: 'Synchronized 65% Telemetry Canvas',
    content: "Real-time synchronous curves backed by a bounded 30-sample ring buffer (`prev.slice(-29)`), completely eliminating memory bloat and tab crashes.",
    position: 'right',
  },
  {
    target: 'imputation-demo',
    title: 'Self-Healing Imputation & Quarantine',
    content: "Watch Tier 1/2 QC isolate the corrupted thermal spike in red, while the 5-step Gaussian WMA draws a dashed self-healing line to keep downstream forecast models uninterrupted.",
    position: 'bottom',
    action: 'trigger-spike',
  },
  {
    target: 'incident-panel',
    title: 'Incident Triage & Severe Storm Defense',
    content: "Normalized SHAP attribution bars pinpoint failing probes for field crews, while coupled pressure-humidity shifts (storms) are tagged Blue to prevent false-alarm blinding.",
    position: 'left',
  },
];

export default function GuidedTour({ onTriggerSpike, isOpen, setIsOpen }: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    
    const step = STEPS[currentStep];
    if (step.action === 'trigger-spike') {
      onTriggerSpike();
    }

    const updateRect = () => {
      const el = document.querySelector(`[data-tour="${step.target}"]`);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };
    
    updateRect();
    window.addEventListener('resize', updateRect);
    return () => window.removeEventListener('resize', updateRect);
  }, [currentStep, isOpen, onTriggerSpike]);

  useEffect(() => {
    if (!isOpen || !isAutoPlay) return;
    
    const timer = setInterval(() => {
      if (currentStep < STEPS.length - 1) {
        setCurrentStep((prev) => prev + 1);
      } else {
        setIsAutoPlay(false);
        setIsOpen(false);
      }
    }, 5000);
    
    return () => clearInterval(timer);
  }, [currentStep, isOpen, isAutoPlay, setIsOpen]);

  // Listen for custom event from header button
  useEffect(() => {
    const handleStartTour = () => {
      setCurrentStep(0);
      setIsOpen(true);
    };
    window.addEventListener('start-system-tour', handleStartTour);
    return () => window.removeEventListener('start-system-tour', handleStartTour);
  }, [setIsOpen]);

  if (!isOpen) return null;

  const step = STEPS[currentStep];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9998]" onClick={() => setIsOpen(false)} />
      
      {/* Highlight Hole */}
      {targetRect && (
        <div 
          className="fixed z-[9998] pointer-events-none transition-all duration-500 ease-in-out border-2 border-cyan-400/80 shadow-[0_0_20px_rgba(34,211,238,0.3)] rounded-lg"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.7)'
          }}
        />
      )}

      {/* Tooltip Card */}
      {targetRect && (
        <div 
          className="fixed z-[9999] w-80 bg-white rounded-xl shadow-2xl border overflow-hidden transition-all duration-500 ease-in-out"
          style={{
            top: step.position === 'bottom' ? targetRect.bottom + 20 : 
                 step.position === 'top' ? targetRect.top - 200 :
                 targetRect.top + (targetRect.height / 2) - 100,
            left: step.position === 'right' ? targetRect.right + 20 : 
                  step.position === 'left' ? targetRect.left - 340 : 
                  targetRect.left + (targetRect.width / 2) - 160,
          }}
        >
          {/* Header */}
          <div className="bg-[#002147] px-4 py-3 flex items-center justify-between border-b-[3px] border-transparent" 
               style={{ borderBottomImage: 'linear-gradient(to right, #FF9933, white, #138808) 1' }}>
            <div className="text-white font-bold text-sm">Step {currentStep + 1} of {STEPS.length}</div>
            <button onClick={() => setIsOpen(false)} className="text-slate-300 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {/* Content */}
          <div className="p-5">
            <h3 className="text-slate-900 font-bold text-base mb-2">{step.title}</h3>
            <p className="text-slate-600 text-sm leading-relaxed mb-5">{step.content}</p>
            
            {/* Controls */}
            <div className="flex items-center justify-between">
              <button 
                onClick={() => setIsAutoPlay(!isAutoPlay)}
                className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded transition-colors ${
                  isAutoPlay ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {isAutoPlay ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                Auto-Play
              </button>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
                  disabled={currentStep === 0}
                  className="p-1.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => {
                    if (currentStep < STEPS.length - 1) setCurrentStep(prev => prev + 1);
                    else setIsOpen(false);
                  }}
                  className="px-3 py-1.5 rounded bg-[#002147] text-white hover:bg-blue-900 text-xs font-semibold"
                >
                  {currentStep === STEPS.length - 1 ? 'Finish' : 'Next'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
