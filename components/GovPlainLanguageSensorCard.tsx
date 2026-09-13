'use client';

import React, { useState } from 'react';
import { TelemetryPacket } from '@/lib/anomalyLogic';
import { IMDStationProfile } from '@/lib/stationData';
import {
  Thermometer,
  Gauge,
  Droplets,
  CheckCircle2,
  AlertTriangle,
  CloudLightning,
  Wrench,
  HelpCircle,
  Volume2,
  VolumeX,
  Zap,
  RotateCcw,
  Binary
} from 'lucide-react';

interface Props {
  station: IMDStationProfile;
  packet?: TelemetryPacket;
  language: 'en' | 'hi';
  onSimulateFault?: (faultType: 'spike' | 'storm' | 'freeze' | 'drift' | 'reset') => void;
}

export function GovPlainLanguageSensorCard({ station, packet, language, onSimulateFault }: Props) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  // If no packet provided, default to nominal
  const classification = packet?.classification || 'NOMINAL_OPERATION';
  const tempVal = packet?.raw.temperature ?? station.baseline.tempMean;
  const pressVal = packet?.raw.pressure ?? station.baseline.pressureMean;
  const humVal = packet?.raw.humidity ?? station.baseline.humidityMean;

  // Calculate simulated WMO BUFR telemetry compression metrics
  const uncompressedBytes = 1840; // Standard verbose JSON payload
  const compressedBytes = 142;    // WMO BUFR / CREX compressed binary packet
  const compressionRatio = Math.round((1 - compressedBytes / uncompressedBytes) * 100);

  // Derive simple human verdicts for each of the 3 primary sensors
  let bannerTitle = language === 'hi' ? 'सभी सेंसर बिल्कुल ठीक कार्य कर रहे हैं' : 'All Sensors Working Normally';
  let bannerSubtitle = language === 'hi'
    ? 'सभी उपकरण स्वस्थ हैं। अवलोकन 100% सटीक हैं और मौसम पूर्वानुमान मॉडल (NWP) के लिए मान्य हैं।'
    : 'All instruments are healthy. Observations are validated and safe for numerical weather prediction models.';
  let bannerClass = 'bg-emerald-50 border-emerald-300 text-emerald-900';
  let bannerIcon = <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />;

  // Sensor 1: Temperature
  let tempStatus: 'OK' | 'BROKEN' | 'SPIKE' = 'OK';
  let tempTitle = language === 'hi' ? 'तापमान सेंसर: बिल्कुल ठीक' : 'Temperature Sensor: Working Normally';
  let tempDesc = language === 'hi'
    ? `वर्तमान तापमान ${tempVal}°C है, जो इस क्षेत्र के सामान्य दिन के मौसम से मेल खाता है।`
    : `Current reading is ${tempVal}°C, which matches expected weather for this region.`;
  let tempAction = language === 'hi' ? 'किसी मरम्मत की आवश्यकता नहीं है।' : 'No action needed. Sensor is operating nominally.';

  // Sensor 2: Pressure (Barometer)
  let pressStatus: 'OK' | 'DRIFT' | 'FROZEN' = 'OK';
  let pressTitle = language === 'hi' ? 'वायुदाब सेंसर (बैरोमीटर): बिल्कुल ठीक' : 'Air Pressure Sensor: Working Normally';
  let pressDesc = language === 'hi'
    ? `वायुदाब ${pressVal} hPa पर स्थिर है। सेंसर पूरी तरह से संतुलित है।`
    : `Atmospheric pressure is steady at ${pressVal} hPa. Transducer is well-calibrated.`;
  let pressAction = language === 'hi' ? 'किसी मरम्मत की आवश्यकता नहीं है।' : 'No action needed. Calibration certificate is active.';

  // Sensor 3: Humidity
  let humStatus: 'OK' | 'STORM' | 'FAULT' = 'OK';
  let humTitle = language === 'hi' ? 'आर्द्रता (नमी) सेंसर: बिल्कुल ठीक' : 'Humidity Sensor: Working Normally';
  let humDesc = language === 'hi'
    ? `हवा में नमी ${humVal}% है, जो इस मौसम के लिए सामान्य है।`
    : `Relative humidity is ${humVal}%, nominal for current weather conditions.`;
  let humAction = language === 'hi' ? 'किसी मरम्मत की आवश्यकता नहीं है।' : 'No action needed.';

  // Evaluate against Anomaly Engine classifications
  if (classification === 'SENSOR_SPIKE') {
    tempStatus = 'BROKEN';
    bannerTitle = language === 'hi' ? 'चेतावनी: तापमान सेंसर में खराबी मिली!' : 'Attention: Temperature Sensor Hardware Fault!';
    bannerSubtitle = language === 'hi'
      ? 'सेंसर का तार कट गया है या ढीला हो गया है। डेटा को अलग (क्वारंटाइन) कर दिया गया है ताकि मौसम का पूर्वानुमान खराब न हो।'
      : 'The temperature wire has snapped or disconnected. Reading jumped abnormally. Data is quarantined from NWP models.';
    bannerClass = 'bg-rose-50 border-rose-300 text-rose-950';
    bannerIcon = <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />;

    tempTitle = language === 'hi' ? 'तापमान सेंसर: ❌ तार टूटा हुआ / दोष' : 'Temperature Sensor: ❌ Broken Sensor Wire';
    tempDesc = language === 'hi'
      ? `तापमान अचानक ${tempVal}°C पर पहुंच गया। यह प्राकृतिक रूप से असंभव है; सेंसर का विद्युत तार अलग हो गया है।`
      : `Reading abruptly jumped to ${tempVal}°C in a single cycle. Physically impossible in nature; sensor wire is severed.`;
    tempAction = language === 'hi'
      ? 'निर्देश: तकनीशियन पोल पर लगे हरे 4-पिन तार (Hirose) की जांच करें और PT100 सेंसर बदलें।'
      : 'Action: Inspect green 4-pin Hirose connector cable at sensor cross-arm. Reconnect or replace PT100 probe.';
  } else if (classification === 'FROZEN_VALUE') {
    pressStatus = 'FROZEN';
    bannerTitle = language === 'hi' ? 'चेतावनी: सेंसर रीडिंग जम (फ्रीज) गई है!' : 'Attention: Sensor Output Frozen (Unresponsive)!';
    bannerSubtitle = language === 'hi'
      ? 'सेंसर बार-बार एक ही संख्या भेज रहा है और वातावरण में कोई बदलाव दर्ज नहीं कर रहा है।'
      : 'The sensor register is outputting an identical unchanging reading across consecutive cycles. Hardware hung.';
    bannerClass = 'bg-rose-50 border-rose-300 text-rose-950';
    bannerIcon = <Wrench className="w-5 h-5 text-rose-600 shrink-0" />;

    pressTitle = language === 'hi' ? 'वायुदाब सेंसर: ❌ रीडिंग अटकी हुई है' : 'Air Pressure Sensor: ❌ Frozen ADC Register';
    pressDesc = language === 'hi'
      ? 'वायुदाब लगातार कई चक्रों से बिल्कुल नहीं बदला। यह आंतरिक चिप या सिग्नल वायर में खराबी है।'
      : 'Pressure reading has zero variance across consecutive cycles. Datalogger analog-to-digital converter is stuck.';
    pressAction = language === 'hi'
      ? 'निर्देश: डेटा लॉगर को रीस्टार्ट करें या RS485 संचार बस रीसेट करें।'
      : 'Action: Power-cycle the datalogger unit and verify serial communication cable.';
  } else if (classification === 'CALIBRATION_DRIFT') {
    pressStatus = 'DRIFT';
    bannerTitle = language === 'hi' ? 'सूचना: वायुदाब सेंसर को सर्विसिंग / रीकैलिब्रेशन की जरूरत है' : 'Notice: Barometer Recalibration Service Due';
    bannerSubtitle = language === 'hi'
      ? 'सेंसर टूटा नहीं है, लेकिन धीरे-धीरे गलत रीडिंग दे रहा है। पास के स्टेशनों से तुलना करके इसे पहचाना गया है।'
      : 'The sensor is physically functioning, but slowly drifting downward from truth. Spatial cross-validation detected offset.';
    bannerClass = 'bg-amber-50 border-amber-300 text-amber-950';
    bannerIcon = <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />;

    pressTitle = language === 'hi' ? 'वायुदाब सेंसर: ⚠️ रीकैलिब्रेशन आवश्यक' : 'Air Pressure Sensor: ⚠️ Gradual Calibration Drift';
    pressDesc = language === 'hi'
      ? `वायुदाब आस-पास के अन्य 5 वेधशालाओं की तुलना में धीरे-धीरे कम हो रहा है (${pressVal} hPa)।`
      : `Pressure reading (${pressVal} hPa) is drifting downward relative to the 5 nearest neighboring AWS nodes.`;
    pressAction = language === 'hi'
      ? 'निर्देश: फील्ड इंजीनियर डिजिटल संदर्भ बैरोमीटर लेकर जाएं और 0-पॉइंट कैलिब्रेशन करें।'
      : 'Action: Field maintenance engineer must perform on-site zero-point recalibration with digital calibrator.';
  } else if (classification === 'GENUINE_CONVECTIVE_EVENT') {
    humStatus = 'STORM';
    bannerTitle = language === 'hi' ? 'महत्वपूर्ण: तेज आंधी-तूफान का पता चला (सेंसर 100% सही हैं)' : 'Important: Genuine Severe Storm Detected (Sensors are 100% OK)';
    bannerSubtitle = language === 'hi'
      ? 'तेज दबाव गिरावट और नमी में भारी उछाल आया है। यह असली मौसम की घटना है, सेंसर की खराबी नहीं! मौसम मॉडल के लिए सुरक्षित है।'
      : 'Atmospheric pressure plunged and humidity surged together. This is verified severe convective weather, NOT a sensor fault! Validated for NWP.';
    bannerClass = 'bg-sky-50 border-sky-300 text-sky-950';
    bannerIcon = <CloudLightning className="w-5 h-5 text-sky-600 shrink-0" />;

    humTitle = language === 'hi' ? 'आर्द्रता व वायुदाब: 🌩️ असली आंधी-तूफान की पुष्टि' : 'Atmospheric State: 🌩️ Verified Convective Storm Front';
    humDesc = language === 'hi'
      ? `हवा में नमी बढ़कर ${humVal}% हो गई है और तापमान गिर गया है। भौतिक युगल एल्गोरिदम ने पुष्टि की है कि यह प्राकृतिक तूफान है।`
      : `Humidity surged to ${humVal}% while barometric pressure plunged. Coupled thermodynamic physics confirmed real severe weather.`;
    humAction = language === 'hi'
      ? 'निर्देश: किसी सेंसर की मरम्मत की जरूरत नहीं है! डेटा को तुरंत मौसम पूर्वानुमान मॉडल में भेजा गया है।'
      : 'Action: Do NOT dispatch repair crew! Observations are verified genuine and routed directly to NWP forecasting models.';
  }

  // Text-to-speech plain language narration
  const handleSpeak = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const textToSpeak = language === 'hi'
      ? `${station.name}। ${bannerTitle}। ${tempTitle}। ${tempDesc}। ${pressTitle}। ${pressDesc}। ${humTitle}। ${humDesc}`
      : `Station ${station.name}. ${bannerTitle}. ${tempTitle}. ${tempDesc}. ${pressTitle}. ${pressDesc}. ${humTitle}. ${humDesc}`;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  return (
    <div className="bg-white border border-slate-300 rounded-lg p-4 sm:p-5 shadow-xs space-y-4">
      {/* Header: Non-Technical Plain Verdict & Compression Ratio */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#0b1329] text-cyan-400 rounded border border-slate-800">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-[#0b1329] tracking-tight">
                {language === 'hi' ? 'सरल भाषा में सेंसर स्वास्थ्य जांच (Which Sensor Has a Problem?)' : 'Plain-Language Sensor Health Inspector'}
              </h3>
              <span className="text-[10px] bg-sky-100 text-sky-800 border border-sky-300 font-mono px-2 py-0.5 rounded font-bold">
                Non-Technical View
              </span>
            </div>
            <p className="text-xs text-slate-600">
              {language === 'hi'
                ? 'बिना किसी जटिल गणित के तुरंत जानें कि कौन सा सेंसर सही है और किसमें क्या खराबी है।'
                : 'Instantly tells any citizen, farmer, or district official which sensor is broken in everyday language.'}
            </p>
          </div>
        </div>

        {/* Action Controls: Read Aloud & Compression Badge */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-slate-700 text-xs font-mono" title="WMO BUFR/Binary edge telemetry compression ratio">
            <Binary className="w-3.5 h-3.5 text-indigo-600" />
            <span className="font-bold text-indigo-700">{compressionRatio}%</span>
            <span>Compressed</span>
          </div>

          <button
            type="button"
            onClick={handleSpeak}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold border transition-all cursor-pointer shadow-2xs ${
              isSpeaking
                ? 'bg-amber-500 text-slate-950 border-amber-600 animate-pulse'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
            }`}
            title="Listen to audio diagnosis"
          >
            {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-cyan-600" />}
            <span>{isSpeaking ? (language === 'hi' ? 'बंद करें' : 'Stop') : (language === 'hi' ? '🔊 सुनें (Audio)' : '🔊 Listen')}</span>
          </button>
        </div>
      </div>

      {/* 1-Click Quick Interactive Simulator Bar */}
      {onSimulateFault && (
        <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <span className="font-bold text-slate-700 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-600" />
            <span>{language === 'hi' ? '1-क्लिक समस्या परीक्षण:' : 'Test Sensor Scenarios:'}</span>
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => onSimulateFault('storm')}
              className="px-2.5 py-1 bg-sky-100 hover:bg-sky-200 text-sky-900 border border-sky-300 rounded font-bold transition-colors cursor-pointer text-[11px]"
              title="Simulate genuine severe convective thunderstorm front"
            >
              ⚡ {language === 'hi' ? 'असली तूफान' : 'Real Storm'}
            </button>
            <button
              onClick={() => onSimulateFault('spike')}
              className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-900 border border-rose-300 rounded font-bold transition-colors cursor-pointer text-[11px]"
              title="Simulate broken thermistor wire open-circuit"
            >
              🔴 {language === 'hi' ? 'टूटा तार (Spike)' : 'Broken Wire'}
            </button>
            <button
              onClick={() => onSimulateFault('freeze')}
              className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 rounded font-bold transition-colors cursor-pointer text-[11px]"
              title="Simulate frozen ADC stuck sensor"
            >
              ❄️ {language === 'hi' ? 'अटका सेंसर' : 'Frozen Sensor'}
            </button>
            <button
              onClick={() => onSimulateFault('drift')}
              className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded font-bold transition-colors cursor-pointer text-[11px]"
              title="Simulate gradual barometer calibration drift"
            >
              ⏱️ {language === 'hi' ? 'धीमा ड्रिफ्ट' : 'Drift'}
            </button>
            <button
              onClick={() => onSimulateFault('reset')}
              className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded font-bold transition-colors cursor-pointer text-[11px] flex items-center gap-1"
              title="Reset station to normal healthy operation"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{language === 'hi' ? 'सामान्य' : 'Reset'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Big Verdict Box */}
      <div className={`p-4 rounded-lg border flex items-start gap-3.5 transition-all shadow-2xs ${bannerClass}`}>
        <div className="mt-0.5">{bannerIcon}</div>
        <div className="space-y-1">
          <div className="text-sm sm:text-base font-bold tracking-tight flex items-center gap-2 flex-wrap">
            <span>{bannerTitle}</span>
            <span className="text-xs font-mono font-medium opacity-80">
              [{station.stationId} • {station.name.split(',')[0]}]
            </span>
          </div>
          <p className="text-xs sm:text-sm opacity-90 leading-relaxed">
            {bannerSubtitle}
          </p>
        </div>
      </div>

      {/* 3 Clear Plain-Language Sensor Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
        {/* Card 1: Temperature */}
        <div className={`p-3.5 rounded-lg border transition-all ${
          tempStatus === 'BROKEN'
            ? 'bg-rose-50/70 border-rose-300 shadow-xs'
            : 'bg-slate-50/70 border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Thermometer className={`w-4 h-4 ${tempStatus === 'BROKEN' ? 'text-rose-600' : 'text-amber-600'}`} />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                {language === 'hi' ? '1. तापमान सेंसर' : '1. Temperature Sensor'}
              </span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
              tempStatus === 'BROKEN'
                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
            }`}>
              {tempStatus === 'BROKEN' ? 'FAULT / खराब' : 'OK / चालू'}
            </span>
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 mb-1">
            {tempVal}°C
          </div>
          <div className="text-xs font-bold text-slate-800 mb-1">
            {tempTitle}
          </div>
          <p className="text-xs text-slate-600 leading-relaxed mb-2.5">
            {tempDesc}
          </p>
          <div className={`text-[11px] p-2 rounded border ${
            tempStatus === 'BROKEN'
              ? 'bg-rose-100 border-rose-300 text-rose-900 font-bold'
              : 'bg-white border-slate-200 text-slate-700'
          }`}>
            👉 {tempAction}
          </div>
        </div>

        {/* Card 2: Pressure (Barometer) */}
        <div className={`p-3.5 rounded-lg border transition-all ${
          pressStatus === 'DRIFT'
            ? 'bg-amber-50/70 border-amber-300 shadow-xs'
            : pressStatus === 'FROZEN'
            ? 'bg-rose-50/70 border-rose-300 shadow-xs'
            : 'bg-slate-50/70 border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Gauge className={`w-4 h-4 ${pressStatus !== 'OK' ? 'text-amber-600' : 'text-sky-600'}`} />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                {language === 'hi' ? '2. वायुदाब सेंसर (बैरोमीटर)' : '2. Air Pressure (Barometer)'}
              </span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
              pressStatus === 'DRIFT'
                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                : pressStatus === 'FROZEN'
                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
            }`}>
              {pressStatus === 'DRIFT' ? 'DRIFT / बहाव' : pressStatus === 'FROZEN' ? 'STUCK / फ्रीज' : 'OK / चालू'}
            </span>
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 mb-1">
            {pressVal} hPa
          </div>
          <div className="text-xs font-bold text-slate-800 mb-1">
            {pressTitle}
          </div>
          <p className="text-xs text-slate-600 leading-relaxed mb-2.5">
            {pressDesc}
          </p>
          <div className={`text-[11px] p-2 rounded border ${
            pressStatus !== 'OK'
              ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold'
              : 'bg-white border-slate-200 text-slate-700'
          }`}>
            👉 {pressAction}
          </div>
        </div>

        {/* Card 3: Humidity */}
        <div className={`p-3.5 rounded-lg border transition-all ${
          humStatus === 'STORM'
            ? 'bg-sky-50/70 border-sky-300 shadow-xs'
            : 'bg-slate-50/70 border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Droplets className={`w-4 h-4 ${humStatus === 'STORM' ? 'text-sky-600' : 'text-emerald-600'}`} />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                {language === 'hi' ? '3. आर्द्रता सेंसर (नमी)' : '3. Relative Humidity (Moisture)'}
              </span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
              humStatus === 'STORM'
                ? 'bg-sky-100 text-sky-800 border border-sky-300'
                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
            }`}>
              {humStatus === 'STORM' ? 'STORM / तूफान' : 'OK / चालू'}
            </span>
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 mb-1">
            {humVal}%
          </div>
          <div className="text-xs font-bold text-slate-800 mb-1">
            {humTitle}
          </div>
          <p className="text-xs text-slate-600 leading-relaxed mb-2.5">
            {humDesc}
          </p>
          <div className={`text-[11px] p-2 rounded border ${
            humStatus === 'STORM'
              ? 'bg-sky-100 border-sky-300 text-sky-900 font-bold'
              : 'bg-white border-slate-200 text-slate-700'
          }`}>
            👉 {humAction}
          </div>
        </div>
      </div>
    </div>
  );
}
