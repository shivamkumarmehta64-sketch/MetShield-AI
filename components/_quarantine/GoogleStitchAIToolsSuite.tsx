/**
 * QUARANTINED — not imported by anything. Do not restore without fixing claims.
 *
 * This component was orphaned: no file in the repository referenced it, so it
 * never rendered, yet it still carried live copy asserting a
 * "HMAC-SHA256 Data Seal Generator" offering "tamper-proof cryptographic data
 * verification". Unreachable code with false claims is still a liability — it
 * reads as a specification of what the system does, and anyone re-wiring it
 * back in would ship those claims straight to a user.
 *
 * It is parked here rather than deleted so the UI work is not lost. If it is
 * ever reconnected, its tool names and descriptions must be corrected first:
 * the integrity mechanism is an unkeyed FNV-1a checksum, and no SHI, Kalman
 * filter, or failure-prediction model exists.
 *
 * The claim audit test (__tests__/claimsAudit.test.ts) excludes this directory,
 * so restoring the file will NOT fail the test. Fix the copy first.
 */

'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Bot,
  Zap,
  BrainCircuit,
  CloudLightning,
  ShieldCheck,
  Globe,
  Activity,
  Lock,
  Thermometer,
  Waves,
  Smartphone,
  Radio,
  Settings,
  Gauge,
  Play,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Cpu,
  FileText,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface AITool {
  id: number;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  status: 'ready' | 'processing' | 'result';
  promptPlaceholder: string;
}

const aiTools: AITool[] = [
  {
    id: 1,
    name: 'AI Telemetry Anomaly Predictor',
    description: 'Predicts sensor drift & failure before blackout using historical telemetry patterns',
    icon: <TrendingUp className="w-5 h-5" />,
    category: 'Predictive Maintenance',
    status: 'ready',
    promptPlaceholder: 'Analyze AWS-DEL-04 telemetry for drift patterns...',
  },
  {
    id: 2,
    name: 'Storm vs Fault Discriminator',
    description: 'Sub-5ms thermodynamic physics classifier isolating severe convective storms from sensor hardware faults',
    icon: <CloudLightning className="w-5 h-5" />,
    category: 'Real-Time Classification',
    status: 'ready',
    promptPlaceholder: 'Classify pressure drop at AWS-MUM-02...',
  },
  {
    id: 3,
    name: 'WMO Pub 8 Rule Engine',
    description: '5-Tier automated quality control pipeline validating every incoming telemetry packet',
    icon: <ShieldCheck className="w-5 h-5" />,
    category: 'Quality Control',
    status: 'ready',
    promptPlaceholder: 'Run WMO QC pipeline on station AWS-CHN-01...',
  },
  {
    id: 4,
    name: 'Spatial Cross-Validator',
    description: 'Haversine spatial neighbor consensus engine for cross-checking observations against nearby stations',
    icon: <Globe className="w-5 h-5" />,
    category: 'Spatial Analysis',
    status: 'ready',
    promptPlaceholder: 'Cross-validate AWS-KOL-03 against neighbors...',
  },
  {
    id: 5,
    name: 'Sensor Health Index Calculator',
    description: 'Real-time degradation metric calculating probability of sensor failure within next 72 hours',
    icon: <Activity className="w-5 h-5" />,
    category: 'Health Monitoring',
    status: 'ready',
    promptPlaceholder: 'Calculate SHI for AWS-HYD-05...',
  },
  {
    id: 6,
    name: 'HMAC-SHA256 Data Seal Generator',
    description: 'Tamper-proof cryptographic data verification for telemetry provenance audit trails',
    icon: <Lock className="w-5 h-5" />,
    category: 'Security & Provenance',
    status: 'ready',
    promptPlaceholder: 'Generate data seal for AWS-BLR-02 packet...',
  },
  {
    id: 7,
    name: 'Heatwave & Severe Weather DSS',
    description: 'Impact-based early warning decision support system for extreme weather events',
    icon: <Thermometer className="w-5 h-5" />,
    category: 'Emergency Response',
    status: 'ready',
    promptPlaceholder: 'Assess heatwave risk for Rajasthan cluster...',
  },
  {
    id: 8,
    name: 'Edge Telemetry Ingestion Pipeline',
    description: 'Sub-5ms multi-packet validator running at edge with zero-cost latency optimization',
    icon: <Zap className="w-5 h-5" />,
    category: 'Edge Computing',
    status: 'ready',
    promptPlaceholder: 'Ingest batch telemetry from mobile node...',
  },
  {
    id: 9,
    name: 'Metshield Natural Language AI Copilot',
    description: 'Natural language diagnostic assistant for station telemetry queries and root-cause explanations',
    icon: <Bot className="w-5 h-5" />,
    category: 'AI Assistant',
    status: 'ready',
    promptPlaceholder: 'Ask Metshield AI about station anomalies...',
  },
  {
    id: 10,
    name: 'Telemetry Signal Denoiser',
    description: 'Kalman & Butterworth noise removal filter for cleaning noisy sensor readings',
    icon: <Waves className="w-5 h-5" />,
    category: 'Signal Processing',
    status: 'ready',
    promptPlaceholder: 'Denoise humidity signal from AWS-JAI-03...',
  },
  {
    id: 11,
    name: 'Stuck Sensor Freeze Detector',
    description: 'ADC register deadlock & flatline analyzer detecting frozen sensor values',
    icon: <AlertTriangle className="w-5 h-5" />,
    category: 'Fault Detection',
    status: 'ready',
    promptPlaceholder: 'Check for stuck sensor at AWS-PNE-01...',
  },
  {
    id: 12,
    name: 'Mobile Sensor Fusion Engine',
    description: 'Smartphone barometer/GPS sync via PWA enabling crowd-sourced weather observations',
    icon: <Smartphone className="w-5 h-5" />,
    category: 'Mobile Integration',
    status: 'ready',
    promptPlaceholder: 'Sync mobile sensor data from field technician...',
  },
  {
    id: 13,
    name: 'NWP Model Gating Filter',
    description: 'Quality gating for numerical weather prediction models ensuring data fitness for assimilation',
    icon: <Radio className="w-5 h-5" />,
    category: 'Model Integration',
    status: 'ready',
    promptPlaceholder: 'Gate telemetry for NWP model ingestion...',
  },
  {
    id: 14,
    name: 'Field Calibration Loopback (OTA)',
    description: 'Remote sensor offset correction enabling over-the-air field calibration by technicians',
    icon: <Settings className="w-5 h-5" />,
    category: 'Calibration',
    status: 'ready',
    promptPlaceholder: 'Apply +2.3 hPa offset to AWS-AHM-04...',
  },
  {
    id: 15,
    name: 'Synthetic Weather Generator',
    description: 'Extreme storm scenario simulator for testing QMS under severe weather conditions',
    icon: <Gauge className="w-5 h-5" />,
    category: 'Simulation',
    status: 'ready',
    promptPlaceholder: 'Generate synthetic monsoon surge scenario...',
  },
];

function AIToolCard({ tool, onExecute }: { tool: AITool; onExecute: (id: number) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: tool.id * 0.05 }}
      className="stitch-card p-5 group cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#1a73e8]/20 to-[#a142f4]/20 border border-[#24c1e0]/30 flex items-center justify-center group-hover:from-[#1a73e8]/30 group-hover:to-[#a142f4]/30 transition-all">
          <div className="text-[#24c1e0]">{tool.icon}</div>
        </div>
        <span className="text-[10px] font-semibold text-slate-400 bg-slate-800/50 px-2 py-1 rounded-lg border border-slate-700/50">
          {tool.category}
        </span>
      </div>
      <h3 className="font-bold text-white text-sm mb-2">{tool.name}</h3>
      <p className="text-xs text-slate-400 leading-relaxed mb-3">{tool.description}</p>
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-3 pt-3 border-t border-slate-800"
        >
          <div className="stitch-prompt-box p-3 mb-3">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
              <Sparkles className="w-3 h-3 text-[#a142f4]" />
              <span>Prompt</span>
            </div>
            <p className="text-xs text-slate-300 italic">{tool.promptPlaceholder}</p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExecute(tool.id);
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-[#1a73e8] to-[#a142f4] hover:from-[#4285f4] hover:to-[#c084fc] text-white text-xs font-bold rounded-xl transition-all touch-target"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Run AI Tool</span>
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}

export function GoogleStitchAIToolsSuite() {
  const [promptInput, setPromptInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [aiResponse, setAiResponse] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const categories = ['All', 'Quality Control', 'Real-Time Classification', 'Predictive Maintenance', 'Security & Provenance', 'Edge Computing'];

  const filteredTools = selectedCategory === 'All'
    ? aiTools
    : aiTools.filter(t => t.category.toLowerCase().includes(selectedCategory.toLowerCase()) || selectedCategory.toLowerCase().includes(t.category.toLowerCase()));

  const handleExecute = async (toolId: number) => {
    const tool = aiTools.find(t => t.id === toolId);
    if (!tool) return;

    setIsProcessing(true);
    setAiResponse('');

    try {
      const response = await fetch('/api/ai/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolId,
          toolName: tool.name,
          prompt: tool.promptPlaceholder,
        }),
      });

      const data = await response.json();
      setAiResponse(data.result || 'Tool executed successfully.');
    } catch {
      setAiResponse('Error executing AI tool. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePromptSubmit = async () => {
    if (!promptInput.trim()) return;
    setIsProcessing(true);
    setAiResponse('');

    try {
      const response = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptInput }),
      });

      const data = await response.json();
      setAiResponse(data.result || 'Query processed.');
    } catch {
      setAiResponse('Error processing query. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <section className="relative z-10 py-16 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#1a73e8]/10 to-[#a142f4]/10 border border-[#24c1e0]/20 mb-4">
            <BrainCircuit className="w-4 h-4 text-[#a142f4]" />
            <span className="text-xs font-bold text-[#24c1e0] uppercase tracking-wider">Metshield AI Intelligence Suite</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">
            15 Meteorological Intelligence Modules for <span className="stitch-gradient-text">Weather QMS</span>
          </h2>
          <p className="text-sm text-slate-400 max-w-2xl mx-auto">
            Specialized AI-powered telemetry modules for Automated Weather Station Quality Management System
          </p>
        </motion.div>

        {/* Metshield AI Prompt Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="stitch-prompt-box p-4 sm:p-6 mb-10 max-w-4xl mx-auto"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1a73e8] to-[#a142f4] flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <textarea
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="Ask Metshield AI Copilot to analyze station telemetry, run thermodynamic checks, or diagnose probe drift..."
                aria-label="Ask Metshield AI prompt"
                className="w-full bg-transparent text-white text-sm placeholder-slate-500 resize-none outline-none min-h-[60px]"
                rows={2}
              />
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/50 hover:bg-slate-800 text-slate-400 text-xs rounded-lg transition-colors">
                    <FileText className="w-3 h-3" />
                    <span>Upload</span>
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/50 hover:bg-slate-800 text-slate-400 text-xs rounded-lg transition-colors">
                    <Cpu className="w-3 h-3" />
                    <span>Model</span>
                  </button>
                </div>
                <button
                  onClick={handlePromptSubmit}
                  className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-[#1a73e8] to-[#a142f4] hover:from-[#4285f4] hover:to-[#c084fc] text-white text-xs font-bold rounded-xl transition-all touch-target"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>Run</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all touch-target border ${
                selectedCategory === cat
                  ? 'bg-gradient-to-r from-[#1a73e8] to-[#a142f4] text-white border-transparent shadow-lg shadow-blue-500/20'
                  : 'bg-[#0e1730]/90 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* AI Tools Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTools.map((tool) => (
            <AIToolCard key={tool.id} tool={tool} onExecute={handleExecute} />
          ))}
        </div>

        {/* AI Response Display */}
        {(aiResponse || isProcessing) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="stitch-card p-6 mt-8 max-w-4xl mx-auto"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#34a853] to-[#24c1e0] flex items-center justify-center shrink-0">
                {isProcessing ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <BrainCircuit className="w-5 h-5 text-white" />
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-white text-sm mb-2">Metshield AI Response</h4>
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {isProcessing ? 'Processing your request...' : aiResponse}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Quick Prompts */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 flex flex-wrap justify-center gap-2"
        >
          {[
            'Predict sensor failure for AWS-DEL-04',
            'Run WMO QC pipeline on all stations',
            'Generate HMAC seal for last packet',
            'Cross-validate temperature readings',
          ].map((qp, i) => (
            <button
              key={i}
              onClick={() => setPromptInput(qp)}
              disabled={isProcessing}
              className="px-4 py-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-[#24c1e0]/30 text-slate-300 text-xs rounded-xl transition-all touch-target disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {qp}
            </button>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
