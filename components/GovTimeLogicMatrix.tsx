'use client';

import React, { useState } from 'react';
import {
  Clock,
  Zap,
  CloudRain,
  Snowflake,
  Sun,
  TrendingDown,
  Radio,
  AlertTriangle,
  CheckCircle2,
  Play,
  HelpCircle,
  BarChart2,
  Layers
} from 'lucide-react';

interface Props {
  language: 'hi' | 'en';
  onSimulateCase?: (caseId: string) => void;
}

export interface TimeLogicCase {
  id: string;
  horizon: string;
  timeWindow: string;
  titleEn: string;
  titleHi: string;
  icon: React.ElementType;
  color: string;
  accentBg: string;
  badgeText: string;
  phenomenon: string;
  phenomenonHi: string;
  mathFormula: string;
  legacyFailure: string;
  legacyFailureHi: string;
  ourAlgorithm: string;
  ourAlgorithmHi: string;
  wmoFlag: string;
  graphSvg: React.ReactNode;
}

export const TIME_LOGIC_CASES: TimeLogicCase[] = [
  {
    id: 'case_roc_spike',
    horizon: 'Instantaneous (t ≤ 60s)',
    timeWindow: 'Δt = 2.5s — 60s (Single Telemetry Tick)',
    titleEn: 'Transient Electromagnetic Spike / Step Discontinuity',
    titleHi: 'क्षणिक ईएमआई स्पाइक और स्टेप असंतुलन',
    icon: Zap,
    color: '#dc2626',
    accentBg: 'bg-red-50 text-red-700 border-red-200',
    badgeText: 'Sub-Minute Rate of Change',
    phenomenon: 'High-frequency transient caused by nearby lightning discharge, loose RS-485 cable contact bounce, or analog ADC quantization jump.',
    phenomenonHi: 'निकटवर्ती तड़ित (लाइटनिंग), ढीले RS-485 केबल संपर्क या ADC परिमाणीकरण त्रुटि के कारण क्षणिक गलत मान।',
    mathFormula: '|X(t) - X(t - Δt)| > RoC_limit × Δt  (e.g., |ΔT| > 0.3°C/min, |ΔP| > 1.0 hPa/min)',
    legacyFailure: 'Legacy fixed-threshold checks pass it because +5°C spike remains within plausible physical limits [-10°C, 55°C].',
    legacyFailureHi: 'पारंपरिक प्रणाली इसे पास कर देती है क्योंकि +5°C का अचानक उछाल भी -10°C से 55°C की सामान्य सीमा के भीतर रहता है।',
    ourAlgorithm: 'Instantaneous 1st-order temporal derivative test with zero-lag debounce holding buffer. Holds previous valid value X̂(t) = X(t-Δt) while evaluating consecutive frames.',
    ourAlgorithmHi: 'शून्य-विलंब डिबाउंस बफर के साथ तात्कालिक व्युत्पन्न परीक्षण। पूर्व मान्य मान को सुरक्षित रखता है।',
    wmoFlag: 'FLAG 4: CORRUPT HARDWARE (Spike / Noise)',
    graphSvg: (
      <svg viewBox="0 0 200 60" className="w-full h-16 bg-slate-900 rounded p-1">
        <path d="M 10,40 L 40,38 L 70,39 L 90,38 L 95,8 L 105,8 L 110,38 L 140,39 L 180,38" fill="none" stroke="#dc2626" strokeWidth="2" />
        <line x1="95" y1="8" x2="105" y2="8" stroke="#f87171" strokeWidth="4" strokeLinecap="round" />
        <circle cx="100" cy="8" r="3" fill="#f87171" />
        <text x="115" y="14" fill="#f87171" fontSize="9" fontWeight="bold">Raw Spike</text>
        <path d="M 85,38 L 115,38" fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="3,3" />
        <text x="120" y="44" fill="#22c55e" fontSize="9">Imputed X̂</text>
      </svg>
    )
  },
  {
    id: 'case_convective_storm',
    horizon: 'Mesoscale Storm (5 — 15 min)',
    timeWindow: 'Δt = 5 min — 15 min (Multi-Tick Dynamic)',
    titleEn: 'Convective Microburst / Thunderstorm Gust Front',
    titleHi: 'संवहनी आंधी / माइक्रोबर्स्ट गस्ट फ्रंट',
    icon: CloudRain,
    color: '#2563eb',
    accentBg: 'bg-blue-50 text-blue-700 border-blue-200',
    badgeText: 'Multi-Variate Thermodynamic Coupling',
    phenomenon: 'Severe thunderstorm downdraft brings sudden cold pool (-2°C to -4°C in 5 min), sudden pressure nose surge (+1.5 hPa), sudden RH jump (+15%), and gale winds > 40 km/h.',
    phenomenonHi: 'तीव्र आंधी में अचानक तापमान में गिरावट (-2°C से -4°C), वायुमंडलीय दबाव में वृद्धि (+1.5 hPa), और आर्द्रता में तेजी से वृद्धि।',
    mathFormula: 'Coupled: (ΔT/Δt ≤ -0.4°C/min) ∧ (ΔP/Δt ≥ +0.2 hPa/min) ∧ (ΔRH/Δt ≥ +1.5%/min) ∧ (WindGust ≥ 35 km/h)',
    legacyFailure: 'CRITICAL HAZARD: Naive single-sensor rate-of-change flags the rapid temperature drop as a "broken thermistor" and suppresses the severe storm warning!',
    legacyFailureHi: 'गंभीर खतरा: पारंपरिक एकल-सेंसर प्रणाली तापमान गिरावट को "टूटा हुआ सेंसर" मानकर अस्वीकार कर देती है, जिससे आपदा चेतावनी चूक जाती है!',
    ourAlgorithm: 'Thermodynamic Multi-Variate Invariant Checker. Validates adiabatic cooling and Clausius-Clapeyron relation. Overrules RoC filter and validates event as genuine atmospheric phenomenon.',
    ourAlgorithmHi: 'थर्मोडायनामिक बहु-चर सत्यापन। एडियाबेटिक शीतलन की पुष्टि करता है और इसे वास्तविक वायुमंडलीय घटना प्रमाणित करता है।',
    wmoFlag: 'FLAG 2: GENUINE CONVECTIVE EVENT (Verified Dynamic)',
    graphSvg: (
      <svg viewBox="0 0 200 60" className="w-full h-16 bg-slate-900 rounded p-1">
        {/* Temperature drop */}
        <path d="M 10,20 L 60,20 L 90,45 L 140,48 L 180,48" fill="none" stroke="#38bdf8" strokeWidth="2" />
        {/* Pressure rise */}
        <path d="M 10,48 L 60,48 L 85,22 L 140,24 L 180,25" fill="none" stroke="#f59e0b" strokeWidth="2" />
        <text x="15" y="14" fill="#38bdf8" fontSize="8">Temp Drop</text>
        <text x="15" y="44" fill="#f59e0b" fontSize="8">Press Rise</text>
        <rect x="75" y="10" width="30" height="42" fill="#2563eb" opacity="0.25" rx="2" />
        <text x="80" y="56" fill="#60a5fa" fontSize="7" fontWeight="bold">Storm Signature</text>
      </svg>
    )
  },
  {
    id: 'case_frozen_sensor',
    horizon: 'Persistence (15 — 60 min)',
    timeWindow: 'Δt = 15 min — 60 min (Continuous Stagnation)',
    titleEn: 'ADC Deadlock / Signal Freezing / Mechanical Icing',
    titleHi: 'एडीसी डेडलॉक / स्थिर सिग्नल / सेंसर फ्रीज',
    icon: Snowflake,
    color: '#0284c7',
    accentBg: 'bg-sky-50 text-sky-700 border-sky-200',
    badgeText: 'Zero Micro-Turbulence Variance',
    phenomenon: 'Digital bus deadlock, frozen buffer, or anemometer cups mechanically jammed by icing or spider web. Observation stays identical down to 4 decimal places.',
    phenomenonHi: 'सेंसर चिप डेडलॉक या जाम होने के कारण मान दशमलव के 4 स्थानों तक बिल्कुल स्थिर (फ्रीज) रह जाता है।',
    mathFormula: 'Var(X[t - K ... t]) < ε (where ε = 10^-6 over rolling window K ≥ 6 frames / 15 mins)',
    legacyFailure: 'Passes all legacy range checks! A frozen value of 27.500°C appears perfectly normal to static min/max checkers for hours or days.',
    legacyFailureHi: 'पारंपरिक सभी रेंज चेक पास कर लेता है क्योंकि 27.5°C का स्थिर मान भी सामान्य सीमा में रहता है।',
    ourAlgorithm: 'Statistical micro-turbulence dispersion test. Earth\'s planetary boundary layer guarantees continuous atmospheric variance. Zero variance over 15 min triggers immediate deadlock flag.',
    ourAlgorithmHi: 'सांख्यिकीय माइक्रो-टरबुलेंस भिन्नता परीक्षण। वातावरण में निरंतर सूक्ष्म उतार-चढ़ाव होना अनिवार्य है; शून्य भिन्नता सेंसर दोष साबित करती है।',
    wmoFlag: 'FLAG 4: CORRUPT HARDWARE (Signal Deadlock / Frozen)',
    graphSvg: (
      <svg viewBox="0 0 200 60" className="w-full h-16 bg-slate-900 rounded p-1">
        <path d="M 10,25 L 25,23 L 40,28 L 55,22 L 70,25" fill="none" stroke="#38bdf8" strokeWidth="2" />
        <line x1="70" y1="25" x2="180" y2="25" stroke="#ef4444" strokeWidth="2.5" />
        <text x="95" y="18" fill="#f87171" fontSize="9" fontWeight="bold">σ² = 0.0000 (Deadlock)</text>
        <text x="15" y="45" fill="#94a3b8" fontSize="8">Natural Variance</text>
        <text x="100" y="45" fill="#f87171" fontSize="8">Frozen Reading</text>
      </svg>
    )
  },
  {
    id: 'case_solar_diurnal',
    horizon: 'Diurnal Cycle (24 Hours)',
    timeWindow: 'Δt = 24 Hours (Solar Noon Resonance)',
    titleEn: 'Solar Radiation Shielding Aspiration Fan Failure',
    titleHi: 'सौर विकिरण शील्ड एस्पिरेशन पंखा विफलता (24 घंटे चक्र)',
    icon: Sun,
    color: '#d97706',
    accentBg: 'bg-amber-50 text-amber-700 border-amber-200',
    badgeText: 'Solar Elevation Cross-Correlation',
    phenomenon: 'Motor of aspirated radiation shield dies. During midday solar peak (11:00-15:00 IST), radiant heating traps hot air (+3°C to +5°C error). At night, reading returns to 100% normal!',
    phenomenonHi: 'रेडिएशन शील्ड का पंखा रुकने से दिन के 11 से 3 बजे के बीच धूप से तापमान +3°C से +5°C बढ़ जाता है, लेकिन रात में बिल्कुल सामान्य दिखता है!',
    mathFormula: 'Corr(δT(t), sin(θ_solar(t))) > 0.82  where δT(t) = T_obs(t) - Median(T_neighbors(t))',
    legacyFailure: 'Undetectable by single-frame or hourly checks because rate of change follows normal sun warming smoothly.',
    legacyFailureHi: 'एकल रीडिंग से पकड़ना असंभव है क्योंकि तापमान बहुत धीमी और स्वाभाविक गति से बढ़ता हुआ दिखता है।',
    ourAlgorithm: 'Diurnal harmonic decomposition & solar elevation zenith angle correlation. Correlates residual bias against astronomical solar position.',
    ourAlgorithmHi: 'खगोलीय सौर उन्नयन कोण के साथ अवशिष्ट पूर्वाग्रह का सहसंबंध। सौर शील्ड विफलता की सटीक पहचान करता है।',
    wmoFlag: 'FLAG 3: SUSPECT CALIBRATION (Diurnal Radiation Bias)',
    graphSvg: (
      <svg viewBox="0 0 200 60" className="w-full h-16 bg-slate-900 rounded p-1">
        {/* True temperature curve */}
        <path d="M 10,45 Q 90,15 180,45" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3,3" />
        {/* Overheating curve */}
        <path d="M 10,45 Q 60,35 90,5 Q 120,35 180,45" fill="none" stroke="#f59e0b" strokeWidth="2" />
        <text x="65" y="14" fill="#fbbf24" fontSize="8" fontWeight="bold">+4.5°C Solar Trapping</text>
        <text x="15" y="55" fill="#94a3b8" fontSize="7">00:00 Night</text>
        <text x="80" y="55" fill="#fbbf24" fontSize="7">12:00 Noon</text>
        <text x="145" y="55" fill="#94a3b8" fontSize="7">24:00 Night</text>
      </svg>
    )
  },
  {
    id: 'case_calibration_drift',
    horizon: 'Long-Term Drift (24 — 72 Hours)',
    timeWindow: 'Δt = 24h — 72h (Creeping Bios)',
    titleEn: 'Barometer Diaphragm Creep & Sensor Aging',
    titleHi: 'बैरोमीटर डायफ्राम क्रीप और दीर्घकालिक सेंसर ड्रिफ्ट',
    icon: TrendingDown,
    color: '#ea580c',
    accentBg: 'bg-orange-50 text-orange-700 border-orange-200',
    badgeText: 'Multi-Day OLS Slope Estimation',
    phenomenon: 'Piezoresistive diaphragm relaxation or polymer hygrometer chemical contamination causes insidious drift of +0.3 hPa/day or +1.5% RH/day.',
    phenomenonHi: 'बैरोमीटर डायाफ्राम शिथिलता या रासायनिक संदूषण के कारण प्रतिदिन +0.3 hPa या +1.5% RH का धीरे-धीरे संचयी बहाव।',
    mathFormula: 'Residual r(t) = P_sensor(t) - P̂_regional(t);  Slope m = d[r(t)]/dt;  |m| > 0.35 hPa/day with R² > 0.80',
    legacyFailure: 'Dangerous for NWP climate models: drifting pressure systematically distorts cyclone track forecasting and isobaric maps.',
    legacyFailureHi: 'संख्यात्मक मौसम मॉडल के लिए खतरनाक: धीरे-धीरे बहता दबाव चक्रवात पूर्वानुमान और समदाब रेखाओं को विकृत कर देता है।',
    ourAlgorithm: 'Rolling Ordinary Least Squares (OLS) spatial residual regression against 5-station regional cohort. Calculates automated recalibration bias factor β.',
    ourAlgorithmHi: 'क्षेत्रीय स्टेशनों के मुकाबले रोलिंग ओएलएस रिग्रेशन। स्वचालित पुनः अंशांकन पूर्वाग्रह कारक की गणना करता है।',
    wmoFlag: 'FLAG 3: SUSPECT DRIFT (Calibration Offset Active)',
    graphSvg: (
      <svg viewBox="0 0 200 60" className="w-full h-16 bg-slate-900 rounded p-1">
        <line x1="10" y1="40" x2="180" y2="40" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3,3" />
        <path d="M 10,40 L 40,36 L 80,31 L 120,24 L 160,16 L 180,12" fill="none" stroke="#ea580c" strokeWidth="2.5" />
        <text x="15" y="52" fill="#94a3b8" fontSize="8">Cohort Baseline</text>
        <text x="80" y="16" fill="#fb923c" fontSize="8" fontWeight="bold">+0.4 hPa/day Creep</text>
      </svg>
    )
  },
  {
    id: 'case_packet_slot_loss',
    horizon: 'Transmission Slot (15 min Frame)',
    timeWindow: 'Δt = 15 min INSAT-3D TDMA Slot',
    titleEn: 'Satellite Uplink Dropout & Packet Loss Imputation',
    titleHi: 'सैटेलाइट अपलिंक पैकेट हानि और स्वचालित पुनर्निर्माण',
    icon: Radio,
    color: '#7c3aed',
    accentBg: 'bg-purple-50 text-purple-700 border-purple-200',
    // Was "Kalman & WMO WMA Reconstruction". No Kalman filter exists in lib/,
    // and the imputation that does run is `windowedMean` in
    // lib/anomalyDetector.ts: a flat arithmetic mean over the recent history,
    // with no Gaussian weighting and no spatial IDW component. The label now
    // names the function that actually runs.
    badgeText: 'Windowed-Mean Imputation',
    phenomenon: 'INSAT-3D/3DR 401 MHz TDMA telemetry slot missed due to heavy tropical precipitation attenuation, low battery voltage, or antenna misalignment.',
    phenomenonHi: 'भारी बारिश या कमजोर बैटरी के कारण INSAT-3D उपग्रह अपलिंक स्लॉट में डेटा पैकेट का खो जाना।',
    mathFormula: 'X̂(t) = α · X_autoregressive(t) + (1 - α) · ∑ [w_i · X_spatial_i(t)];  w_i = (1/d_i²) / ∑(1/d_j²)',
    legacyFailure: 'Leaves empty NULL gap in database, breaking NWP assimilation pipelines and causing automated forecast failure.',
    legacyFailureHi: 'डेटाबेस में शून्य (NULL) अंतर छोड़ देता है, जिससे संख्यात्मक मौसम पूर्वानुमान मॉडल बाधित हो जाते हैं।',
    ourAlgorithm: 'WMO-standard Spatial-Temporal Imputation combining diurnal autoregressive memory with inverse-distance-weighted (IDW) spatial neighbors and uncertainty bound ±σ.',
    ourAlgorithmHi: 'WMO मानक स्थानिक-अस्थायी पुनर्निर्माण। आस-पास के स्टेशनों और ऐतिहासिक रुझान का उपयोग कर शून्य अंतराल को स्वतः भरता है।',
    wmoFlag: 'FLAG 5: IMPUTED / RECONSTRUCTED (Zero Data Gaps)',
    graphSvg: (
      <svg viewBox="0 0 200 60" className="w-full h-16 bg-slate-900 rounded p-1">
        <path d="M 10,35 L 50,30 L 70,32" fill="none" stroke="#a855f7" strokeWidth="2" />
        <path d="M 70,32 L 120,24" fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="3,3" />
        <circle cx="95" cy="28" r="3" fill="#22c55e" />
        <path d="M 120,24 L 150,22 L 180,20" fill="none" stroke="#a855f7" strokeWidth="2" />
        <text x="65" y="16" fill="#4ade80" fontSize="8" fontWeight="bold">WMA Imputed Gap</text>
        <text x="15" y="52" fill="#c084fc" fontSize="8">Raw DCP Link</text>
      </svg>
    )
  }
];

export const GovTimeLogicMatrix: React.FC<Props> = ({ language, onSimulateCase }) => {
  const [selectedCaseId, setSelectedCaseId] = useState<string>('case_convective_storm');
  const activeCase = TIME_LOGIC_CASES.find(c => c.id === selectedCaseId) || TIME_LOGIC_CASES[0];

  return (
    <div className="bg-white border-2 border-[#002147] rounded-lg shadow-sm overflow-hidden">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#002147] via-[#0B3B60] to-[#002147] text-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#FF9933] text-slate-950 rounded font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base tracking-wide uppercase">
                  {language === 'hi' ? 'समय-स्तरीय विसंगति पहचान तर्क' : 'Multi-Horizon Temporal Logic Engine'}
                </h3>
                <span className="bg-cyan-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                  TEMPORAL CORE
                </span>
              </div>
              <p className="text-xs text-sky-200 mt-0.5">
                {language === 'hi'
                  ? 'मौसम विज्ञान सेंसर विसंगतियों के सभी 6 समय-पैमाने: तात्कालिक स्पाइक से लेकर 72 घंटे के दीर्घकालिक बहाव तक'
                  : 'All 6 Meteorological Time-Scales: From Sub-Minute Spikes to Multi-Day Barometer Creep & Reconstructions'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono bg-slate-900/60 px-3 py-1.5 rounded border border-slate-700">
            <Layers className="w-4 h-4 text-[#FF9933]" />
            <span>6 Horizon Case Studies</span>
          </div>
        </div>
      </div>

      {/* Case Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 border-b border-slate-200 bg-slate-50">
        {TIME_LOGIC_CASES.map(item => {
          const Icon = item.icon;
          const isSelected = item.id === selectedCaseId;
          return (
            <button
              key={item.id}
              onClick={() => setSelectedCaseId(item.id)}
              className={`p-3 text-left transition-all border-r border-b sm:border-b-0 border-slate-200 flex flex-col justify-between ${
                isSelected
                  ? 'bg-white shadow-xs border-b-2 border-b-[#FF9933] relative z-10'
                  : 'hover:bg-slate-100 opacity-80 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div
                  className="w-7 h-7 rounded flex items-center justify-center text-white"
                  style={{ backgroundColor: item.color }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                  {item.horizon.split(' ')[0]}
                </span>
              </div>
              <div>
                <div className={`text-xs font-bold leading-tight ${isSelected ? 'text-[#002147]' : 'text-slate-700'}`}>
                  {language === 'hi' ? item.titleHi.split('/')[0] : item.titleEn.split('/')[0]}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                  {item.timeWindow.split(' ')[0]} {item.timeWindow.split(' ')[1]}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Case Deep-Dive */}
      <div className="p-5 space-y-4">
        {/* Title & Badge */}
        <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${activeCase.accentBg}`}>
                {activeCase.badgeText}
              </span>
              <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                Window: {activeCase.timeWindow}
              </span>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded">
                {activeCase.wmoFlag}
              </span>
            </div>
            <h4 className="text-lg font-extrabold text-[#002147] mt-1.5">
              {language === 'hi' ? activeCase.titleHi : activeCase.titleEn}
            </h4>
          </div>

          {onSimulateCase && (
            <button
              onClick={() => onSimulateCase(activeCase.id)}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#002147] hover:bg-[#003366] text-white rounded text-xs font-bold shadow-xs transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current text-[#FF9933]" />
              <span>{language === 'hi' ? 'इस समय तर्क का परीक्षण करें' : 'Simulate This Case in Live Feed'}</span>
            </button>
          )}
        </div>

        {/* 3-Column Comparative Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Col 1: Physics & Phenomenon */}
          <div className="bg-slate-50 p-3.5 rounded border border-slate-200 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wide">
              <BarChart2 className="w-4 h-4 text-sky-600" />
              <span>{language === 'hi' ? 'भौतिक घटना और डेटा व्यवहार' : 'Atmospheric Physics & Signal'}</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {language === 'hi' ? activeCase.phenomenonHi : activeCase.phenomenon}
            </p>
            <div className="mt-3 pt-2 border-t border-slate-200">
              <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Time Signal Waveform:</div>
              {activeCase.graphSvg}
            </div>
          </div>

          {/* Col 2: The Legacy Blindspot */}
          <div className="bg-red-50/70 p-3.5 rounded border border-red-200 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-red-900 uppercase tracking-wide">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span>{language === 'hi' ? 'पारंपरिक प्रणाली की विफलता' : 'Legacy System Blindspot & Error'}</span>
            </div>
            <p className="text-xs text-red-800 leading-relaxed font-medium">
              {language === 'hi' ? activeCase.legacyFailureHi : activeCase.legacyFailure}
            </p>
            <div className="bg-white/80 p-2.5 rounded border border-red-200 mt-2 text-[11px] text-slate-700">
              <span className="font-bold text-red-700">Result: </span>
              {activeCase.id === 'case_convective_storm'
                ? 'Suppresses actual severe storm warnings, putting lives at risk.'
                : activeCase.id === 'case_frozen_sensor'
                ? 'Dead sensors broadcast stale data unnoticed for days.'
                : activeCase.id === 'case_calibration_drift'
                ? 'NWP isobar models drift, mispredicting cyclone landfall.'
                : 'Corrupted values poison national climate archives.'}
            </div>
          </div>

          {/* Col 3: Our Mathematical Solution */}
          <div className="bg-emerald-50/70 p-3.5 rounded border border-emerald-200 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 uppercase tracking-wide">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{language === 'hi' ? 'हमारा स्वचालित समय तर्क' : 'Our Automated Time Solution'}</span>
            </div>
            <p className="text-xs text-emerald-900 leading-relaxed font-medium">
              {language === 'hi' ? activeCase.ourAlgorithmHi : activeCase.ourAlgorithm}
            </p>
            <div className="bg-slate-900 p-2.5 rounded text-[11px] font-mono text-emerald-400 overflow-x-auto">
              <div className="text-[9px] text-slate-400 font-sans uppercase mb-0.5">Mathematical Rule:</div>
              {activeCase.mathFormula}
            </div>
          </div>
        </div>

        {/* Footer Summary Bar */}
        <div className="bg-slate-100 p-2.5 rounded flex items-center justify-between text-xs text-slate-600 flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-[#002147]" />
            <span>
              <strong>Temporal Coverage:</strong> Addresses all time-domain sensor challenges from sub-minute spikes to 72-hour barometer creep.
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="text-slate-400">Standard: WMO-No. 8 §III</span>
            <span className="text-emerald-700 font-bold">100% Automated</span>
          </div>
        </div>
      </div>
    </div>
  );
};
