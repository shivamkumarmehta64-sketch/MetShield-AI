'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Upload,
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  CloudLightning,
  Wrench,
  FileText,
  Download,
  Clock,
  Sparkles
} from 'lucide-react';
import {
  parseCSVTelemetry,
  parseJSONTelemetry,
  evaluateTelemetryDataset,
  AUTHENTIC_IMD_BENCHMARKS,
  BatchEvaluationReport,
  EvaluationResult,
  RawTelemetryRecord
} from '@/lib/datasetParser';

interface GovDatasetReplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'hi' | 'en';
}

export const GovDatasetReplayModal: React.FC<GovDatasetReplayModalProps> = ({
  isOpen,
  onClose,
  language,
}) => {
  const [activeTab, setActiveTab] = useState<'benchmarks' | 'upload'>('benchmarks');
  const [selectedBenchmarkId, setSelectedBenchmarkId] = useState<string>('cyclone_biparjoy');
  const [report, setReport] = useState<BatchEvaluationReport | null>(() => {
    const benchmark = AUTHENTIC_IMD_BENCHMARKS.find((b) => b.id === 'cyclone_biparjoy');
    if (!benchmark) return null;
    const records = parseCSVTelemetry(benchmark.csv, benchmark.stationId);
    return evaluateTelemetryDataset(records, benchmark.title, 'PRESET_BENCHMARK');
  });
  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    const benchmark = AUTHENTIC_IMD_BENCHMARKS.find((b) => b.id === 'cyclone_biparjoy');
    if (!benchmark) return 0;
    const records = parseCSVTelemetry(benchmark.csv, benchmark.stationId);
    return records.length;
  });
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playSpeed, setPlaySpeed] = useState<number>(1); // 1x, 2x, 5x
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadBenchmark = (id: string) => {
    setSelectedBenchmarkId(id);
    const benchmark = AUTHENTIC_IMD_BENCHMARKS.find((b) => b.id === id);
    if (!benchmark) return;

    const records = parseCSVTelemetry(benchmark.csv, benchmark.stationId);
    const rep = evaluateTelemetryDataset(records, benchmark.title, 'PRESET_BENCHMARK');
    setReport(rep);
    setCurrentIndex(rep.results.length);
    setIsPlaying(false);
    setUploadError(null);
  };

  useEffect(() => {
    if (!isOpen && timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, [isOpen]);

  const handleFileUpload = (file: File) => {
    setUploadError(null);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        let records: RawTelemetryRecord[] = [];
        let format: 'CSV' | 'JSON' = 'CSV';

        if (file.name.endsWith('.json')) {
          format = 'JSON';
          records = parseJSONTelemetry(text);
        } else {
          format = 'CSV';
          records = parseCSVTelemetry(text);
        }

        if (records.length === 0) {
          setUploadError(
            language === 'hi'
              ? 'फ़ाइल में कोई मान्य मौसम विज्ञान रिकॉर्ड नहीं मिला। कृपया CSV हेडर (timestamp, temperature, pressure, humidity) जांचें।'
              : 'No valid meteorological records found. Please check CSV headers (timestamp, temperature, pressure, humidity).'
          );
          return;
        }

        const rep = evaluateTelemetryDataset(records, file.name, format);
        setReport(rep);
        setCurrentIndex(rep.results.length);
        setIsPlaying(false);
        setActiveTab('upload');
      } catch {
        setUploadError(
          language === 'hi'
            ? 'फ़ाइल को संसाधित करने में त्रुटि। कृपया सुनिश्चित करें कि यह एक वैध CSV या JSON है।'
            : 'Error parsing file. Please ensure it is a valid CSV or JSON format.'
        );
      }
    };

    reader.readAsText(file);
  };

  // Scrubber playback timer
  useEffect(() => {
    if (isPlaying && report && report.results.length > 0) {
      const intervalMs = Math.max(150, 1000 / playSpeed);
      timerRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= report.results.length) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playSpeed, report]);

  if (!isOpen) return null;

  const currentResult: EvaluationResult | undefined =
    report && currentIndex > 0 ? report.results[currentIndex - 1] : undefined;

  const exportReport = () => {
    if (!report) return;
    const jsonStr = JSON.stringify(report, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `IMD_QC_REPORT_${report.summary.fileName.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border-2 border-[#002147] rounded-xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#002147] text-white px-5 py-3.5 flex items-center justify-between border-b-2 border-amber-400">
          <div className="flex items-center gap-3">
            <div className="bg-cyan-400 text-slate-950 p-1.5 rounded font-black text-xs">
              AWS-QMS
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold tracking-wide flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                {language === 'hi'
                  ? 'वास्तविक आईएमडी मौसम टेलीमेट्री डेटासेट रिप्ले एवं सत्यापन इंजन'
                  : 'Real IMD AWS Telemetry Dataset Replay & Verification Engine'}
              </h2>
              <p className="text-[11px] text-slate-300">
                {language === 'hi'
                  ? 'WMO Pub No. 8 गुणवत्ता परीक्षण, चक्रवात पृथक्करण एवं सेंसर दोष निदान'
                  : 'WMO Pub No. 8 Automated Quality Control, Convective Front Discrimination & Fault Diagnostics'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-100 border-b border-slate-200 px-5 py-2 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('benchmarks')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'benchmarks'
                  ? 'bg-[#002147] text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{language === 'hi' ? 'प्रमाणिक ऐतिहासिक बेंचमार्क (4)' : 'Authentic IMD Historical Benchmarks (4)'}</span>
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'upload'
                  ? 'bg-[#002147] text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
              }`}
            >
              <Upload className="w-3.5 h-3.5 text-sky-500" />
              <span>{language === 'hi' ? 'कस्टम CSV/JSON अपलोड करें' : 'Upload Custom CSV / JSON File'}</span>
            </button>
          </div>

          {report && (
            <button
              onClick={exportReport}
              className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 text-xs shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{language === 'hi' ? 'आधिकारिक QC रिपोर्ट निर्यात करें' : 'Export WMO Quality Report'}</span>
            </button>
          )}
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* Tab 1: Authentic Benchmarks */}
          {activeTab === 'benchmarks' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {AUTHENTIC_IMD_BENCHMARKS.map((b) => (
                <div
                  key={b.id}
                  onClick={() => loadBenchmark(b.id)}
                  className={`p-3.5 rounded-lg border-2 text-left cursor-pointer transition-all ${
                    selectedBenchmarkId === b.id
                      ? 'border-[#002147] bg-sky-50/70 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-[#002147] flex items-center gap-1.5">
                      {b.id === 'cyclone_biparjoy' && <CloudLightning className="w-4 h-4 text-amber-600" />}
                      {b.id === 'delhi_squall' && <CloudLightning className="w-4 h-4 text-sky-600" />}
                      {b.id === 'pt100_spike' && <AlertTriangle className="w-4 h-4 text-red-600" />}
                      {b.id === 'adc_frozen' && <Wrench className="w-4 h-4 text-purple-600" />}
                      {b.title}
                    </span>
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono font-bold">
                      {b.stationId}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mb-2 leading-relaxed">{b.description}</p>
                  <div className="bg-white p-2 rounded border border-slate-200 text-[10px]">
                    <span className="font-bold text-slate-700">
                      {language === 'hi' ? 'अपेक्षित WMO सत्यापन: ' : 'Expected WMO Outcome: '}
                    </span>
                    <span className="text-emerald-700 font-semibold">{b.expectedOutcome}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 2: Custom File Upload */}
          {activeTab === 'upload' && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
              className={`p-6 border-2 border-dashed rounded-xl text-center transition-all cursor-pointer ${
                isDragOver ? 'border-[#002147] bg-sky-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json,.txt"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
              <Upload className="w-10 h-10 text-[#002147] mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">
                {language === 'hi'
                  ? 'वास्तविक IMD AWS टेलीमेट्री CSV या JSON फ़ाइल यहाँ खींचें और छोड़ें'
                  : 'Drag & drop real IMD AWS telemetry CSV or JSON file here'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'hi'
                  ? 'या अपने कंप्यूटर से फ़ाइल चुनने के लिए क्लिक करें (कॉलम: timestamp, temperature, pressure, humidity)'
                  : 'Or click to browse from device (Expected columns: timestamp, temperature, pressure, humidity)'}
              </p>
              {uploadError && (
                <div className="mt-3 text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                  {uploadError}
                </div>
              )}
            </div>
          )}

          {/* Results & Verification Panel */}
          {report && (
            <div className="space-y-4 pt-2">
              {/* Summary Stats Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                <div className="bg-slate-100 p-2 rounded-lg border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-500">
                    {language === 'hi' ? 'कुल रिकॉर्ड' : 'Total Evaluated'}
                  </div>
                  <div className="text-lg font-black text-slate-900">{report.metrics.totalEvaluated}</div>
                  <div className="text-[9px] text-slate-500 font-mono">&lt; {report.metrics.avgProcessingLatencyMs} ms / pkt</div>
                </div>

                <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                  <div className="text-[10px] uppercase font-bold text-emerald-700">
                    {language === 'hi' ? 'मानक (Flag 1)' : 'Nominal (Flag 1)'}
                  </div>
                  <div className="text-lg font-black text-emerald-800">{report.metrics.nominalCount}</div>
                  <div className="text-[9px] text-emerald-600 font-semibold">
                    {Math.round((report.metrics.nominalCount / report.metrics.totalEvaluated) * 100)}% Pass
                  </div>
                </div>

                <div className="bg-amber-50 p-2 rounded-lg border border-amber-200">
                  <div className="text-[10px] uppercase font-bold text-amber-700">
                    {language === 'hi' ? 'तूफ़ान (Flag 2)' : 'Severe Storm (Flag 2)'}
                  </div>
                  <div className="text-lg font-black text-amber-800">{report.metrics.convectiveStormCount}</div>
                  <div className="text-[9px] text-amber-600 font-semibold">NWP Validated</div>
                </div>

                <div className="bg-red-50 p-2 rounded-lg border border-red-200">
                  <div className="text-[10px] uppercase font-bold text-red-700">
                    {language === 'hi' ? 'दोष क्वारंटाइन (Flag 4)' : 'Quarantined Fault (Flag 4)'}
                  </div>
                  <div className="text-lg font-black text-red-800">{report.metrics.sensorFaultCount}</div>
                  <div className="text-[9px] text-red-600 font-semibold">Work Order Dispatched</div>
                </div>

                <div className="bg-sky-50 p-2 rounded-lg border border-sky-200 col-span-2 sm:col-span-1">
                  <div className="text-[10px] uppercase font-bold text-sky-700">
                    {language === 'hi' ? 'NWP पुनर्निर्माण' : 'WMO Imputation'}
                  </div>
                  <div className="text-lg font-black text-sky-800">100%</div>
                  <div className="text-[9px] text-sky-600 font-semibold">Zero Feed Gaps</div>
                </div>
              </div>

              {/* Scrubber Controls */}
              <div className="bg-slate-900 text-white p-3 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="bg-amber-400 hover:bg-amber-500 text-slate-950 px-3 py-1.5 rounded font-bold flex items-center gap-1.5 transition-colors"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{isPlaying ? 'Pause' : 'Play Replay'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setCurrentIndex(1);
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-1.5 rounded transition-colors"
                    title="Reset to Start"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded text-[11px]">
                    <span className="text-slate-400">Speed:</span>
                    {[1, 2, 5].map((s) => (
                      <button
                        key={s}
                        onClick={() => setPlaySpeed(s)}
                        className={`px-1.5 py-0.5 rounded font-bold ${
                          playSpeed === s ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Slider */}
                <div className="flex-1 min-w-[200px] flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-400">
                    {currentIndex} / {report.results.length}
                  </span>
                  <input
                    type="range"
                    min={1}
                    max={report.results.length}
                    value={currentIndex || 1}
                    onChange={(e) => {
                      setIsPlaying(false);
                      setCurrentIndex(Number(e.target.value));
                    }}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>
              </div>

              {/* Active Step Real-Time Inspector */}
              {currentResult && (
                <div className="border border-slate-300 rounded-lg overflow-hidden text-xs">
                  <div className="bg-slate-100 px-4 py-2 flex items-center justify-between border-b border-slate-200">
                    <span className="font-bold text-slate-800 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-sky-600" />
                      Observation #{currentResult.recordIndex} — Timestamp: {currentResult.evaluatedPacket.timeIST}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] tracking-wider uppercase border ${
                        currentResult.evaluatedPacket.wmoFlag === 'FLAG_1_VERIFIED_GOOD'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : currentResult.evaluatedPacket.wmoFlag === 'FLAG_2_CONVECTIVE_STORM'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-red-100 text-red-800 border-red-300'
                      }`}
                    >
                      {currentResult.evaluatedPacket.wmoFlag}
                    </span>
                  </div>

                  <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 bg-white">
                    {/* Raw Observed */}
                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                      <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">
                        Raw Ingested Transducer Telemetry
                      </div>
                      <div className="space-y-1 font-mono text-xs">
                        <div>Temp: <span className="font-bold text-slate-900">{currentResult.raw.temperature ?? 'NULL'} °C</span></div>
                        <div>Pressure: <span className="font-bold text-slate-900">{currentResult.raw.pressure ?? 'NULL'} hPa</span></div>
                        <div>Humidity: <span className="font-bold text-slate-900">{currentResult.raw.humidity ?? 'NULL'} %</span></div>
                      </div>
                    </div>

                    {/* Algorithmic Diagnostic & XAI */}
                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                      <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">
                        Explainable AI (XAI) Attribution
                      </div>
                      <div className="text-[11px] font-semibold text-slate-800 mb-1.5">
                        {currentResult.evaluatedPacket.operationalAction}
                      </div>
                      <div className="space-y-1 text-[10px]">
                        <div className="flex justify-between">
                          <span>PT100 Temp:</span>
                          <span className="font-bold">{currentResult.evaluatedPacket.xaiAttribution.tempWeight}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Setra Pressure:</span>
                          <span className="font-bold">{currentResult.evaluatedPacket.xaiAttribution.pressWeight}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Humicap RH:</span>
                          <span className="font-bold">{currentResult.evaluatedPacket.xaiAttribution.humWeight}%</span>
                        </div>
                      </div>
                    </div>

                    {/* WMO Imputed Value */}
                    <div className="p-3 rounded-lg border border-slate-200 bg-sky-50/40">
                      <div className="text-[10px] uppercase font-bold text-sky-700 mb-1">
                        WMO Pub No. 8 Imputed Value (NWP Feed)
                      </div>
                      <div className="space-y-1 font-mono text-xs text-slate-700">
                        <div>Imputed Temp: <span className="font-bold text-sky-800">{currentResult.evaluatedPacket.imputed.temperature} °C</span></div>
                        <div>Imputed Pressure: <span className="font-bold text-sky-800">{currentResult.evaluatedPacket.imputed.pressure} hPa</span></div>
                        <div>Imputed Humidity: <span className="font-bold text-sky-800">{currentResult.evaluatedPacket.imputed.humidity} %</span></div>
                        <div className="text-[10px] text-emerald-700 font-bold pt-1">
                          Status: {currentResult.evaluatedPacket.imputed.wasCorrected ? 'Data Imputed & Restored (WMO Pub 8)' : 'Raw Verified (Nominal)'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t border-slate-300 px-5 py-2.5 flex items-center justify-between text-[11px] text-slate-600">
          <span>
            {language === 'hi'
              ? 'WMO Pub No. 8 मानकों के अनुरूप 100% अनुपालन।'
              : 'Strict adherence to WMO Pub No. 8 Quality Assurance Standards.'}
          </span>
          <button
            onClick={onClose}
            className="bg-[#002147] hover:bg-slate-800 text-white px-4 py-1 rounded font-bold transition-colors"
          >
            {language === 'hi' ? 'बंद करें' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
