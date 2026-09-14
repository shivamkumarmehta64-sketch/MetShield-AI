'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Send, Volume2, VolumeX, ShieldCheck } from 'lucide-react';
import { IMDStationProfile } from '@/lib/stationData';
import { TelemetryPacket } from '@/lib/anomalyLogic';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedStation: IMDStationProfile;
  latestPacket?: TelemetryPacket | null;
  language?: 'en' | 'hi';
}

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  category?: 'diagnostic' | 'advisory' | 'wmo_standard' | 'general';
}

export const MetshieldAICopilotModal: React.FC<Props> = ({
  isOpen,
  onClose,
  selectedStation,
  latestPacket,
  language = 'en',
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastOpenedKeyRef = useRef<string>('');

  // Initialize welcoming message tailored to the active station and anomaly status
  useEffect(() => {
    if (!isOpen) {
      lastOpenedKeyRef.current = '';
      return;
    }

    const currentKey = `${selectedStation.stationId}-${latestPacket?.classification || 'NOMINAL'}-${language}`;
    if (lastOpenedKeyRef.current === currentKey) return;
    lastOpenedKeyRef.current = currentKey;

    const classification = latestPacket?.classification || 'NOMINAL_OPERATION';
    const isStorm = classification === 'GENUINE_CONVECTIVE_EVENT';
    const isFault = classification === 'SENSOR_SPIKE' || classification === 'FROZEN_VALUE' || classification === 'CALIBRATION_DRIFT';

    let initialAnalysis = '';
    if (isStorm) {
      initialAnalysis = language === 'hi'
        ? `⚠️ **सतर्कता: वास्तविक संवहनी तूफान का पता चला!**\nस्टेशन ${selectedStation.name} (${selectedStation.stationId}) पर वायुमंडलीय दबाव में तीव्र गिरावट (${latestPacket?.ratesOfChange.pressRoC} hPa) और आर्द्रता वृद्धि दर्ज हुई है। यह सेंसर विफलता नहीं बल्कि वास्तविक स्क्वॉल रेखा है (WMO फ्लैग 2)। संख्यात्मक मौसम मॉडल (NWP) हेतु डेटा अनुमोदित है।`
        : `⚠️ **MET ALERT: Genuine Convective Storm Front Validated!**\nStation ${selectedStation.name} (${selectedStation.stationId}) exhibits a coupled barometric plunge (${latestPacket?.ratesOfChange.pressRoC} hPa/10min) with a relative humidity surge (${latestPacket?.ratesOfChange.humRoC}%/10min). The Metshield AI discriminator has classified this as an authentic atmospheric front (WMO Flag 2) rather than a sensor defect. Data is approved for NWP assimilation.`;
    } else if (isFault) {
      initialAnalysis = language === 'hi'
        ? `🚨 **दोष चेतावनी: सेंसर हार्डवेयर विसंगति!**\nस्टेशन ${selectedStation.name} पर ${latestPacket?.xaiAttribution.primaryParameter} में गैर-भौतिक दर परिवर्तन पाया गया है (WMO फ्लैग 4)। इसे मॉडल से क्वारंटाइन कर दिया गया है तथा NABL कार्य आदेश स्वतः जनरेट हो चुका है।`
        : `🚨 **SENSOR FAULT: Transducer Anomaly Quarantined!**\nStation ${selectedStation.name} shows an unphysical rate-of-change in ${latestPacket?.xaiAttribution.primaryParameter} (${latestPacket?.xaiAttribution.diagnosticNote}). To safeguard NWP forecast models, this packet is quarantined and replacement data has been imputed per WMO Pub No. 8 protocols.`;
    } else {
      initialAnalysis = language === 'hi'
        ? `नमस्ते! मैं **Metshield AI मेट-कंसलटेंट** हूँ। स्टेशन ${selectedStation.name} (${selectedStation.stationId}) वर्तमान में WMO Pub 8 मानकों के अनुसार सामान्य रूप से कार्य कर रहा है। आप किसी भी तकनीकी पैरामीटर या विसंगति के बारे में पूछ सकते हैं।`
        : `Greetings! I am the **Metshield AI Meteorological Assistant**. Station ${selectedStation.name} (${selectedStation.stationId}) is operating nominally under WMO-No. 8 physical limits. Ask me anything about sensor telemetry, Zahumenský step limits, or NWP gating decisions.`;
    }

    const timer = setTimeout(() => {
      setMessages([
        {
          id: 'init-1',
          sender: 'ai',
          text: initialAnalysis,
          timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
          category: isStorm ? 'advisory' : isFault ? 'diagnostic' : 'general',
        },
      ]);
    }, 0);

    return () => clearTimeout(timer);
  }, [isOpen, selectedStation, latestPacket, language]);

  // Auto-scroll chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Web Speech API synthesis
  const speakText = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const clean = text.replace(/[*_#`]/g, '');
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
    utterance.rate = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const userText = input.trim();
    const nowStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    const userMsg: Message = { id: `user-${Date.now()}`, sender: 'user', text: userText, timestamp: nowStr };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // AI Expert Response Generator
    setTimeout(() => {
      let reply = '';
      const q = userText.toLowerCase();

      if (q.includes('wmo') || q.includes('standard') || q.includes('rule')) {
        reply = `**WMO-No. 8 & Zahumenský (2004) Framework:**\nMetshield AI enforces three validation tiers:\n1. **Gross Limits:** Temperature (-10°C to 55°C), Pressure (920 to 1050 hPa), Humidity (5% to 100%).\n2. **Rate of Change (RoC):** $|\\Delta T| \\le 0.3^\\circ\\text{C/min}$, $|\\Delta P| \\le 2.0\\text{ hPa/10min}$.\n3. **Persistence Test:** Zero variance ($\\\\sigma < 10^{-6}$) over 6 ticks flags stuck ADC registers.`;
      } else if (q.includes('storm') || q.includes('convective') || q.includes('squall')) {
        reply = `**Convective Storm Front Discrimination:**\nSevere weather produces an evaporative cooling and barometric signature: $\\Delta P \\le -1.5\\text{ hPa}$ AND $\\Delta RH \\ge +8\\%$ with $\\Delta T \\le -0.5^\\circ\\text{C}$. Legacy systems trigger false hardware alarms during storms; Metshield AI confirms meteorological coupling and keeps the data in the NWP feed.`;
      } else if (q.includes('xai') || q.includes('shap') || q.includes('blame') || q.includes('weight')) {
        const tW = latestPacket?.xaiAttribution.tempWeight ?? 33.3;
        const pW = latestPacket?.xaiAttribution.pressWeight ?? 33.3;
        const hW = latestPacket?.xaiAttribution.humWeight ?? 33.4;
        reply = `**XAI Parameter Blame Breakdown (Zahumenský § 4.3):**\n- Temperature ($T$): **${tW}%**\n- Pressure ($P$): **${pW}%**\n- Humidity ($RH$): **${hW}%**\nPrimary Driver: **${latestPacket?.xaiAttribution.primaryParameter || 'Nominal'}** (${latestPacket?.xaiAttribution.diagnosticNote}).`;
      } else if (q.includes('work order') || q.includes('repair') || q.includes('nabl')) {
        reply = `**Automated Maintenance Work Orders:**\nWhenever an anomaly is categorized under WMO Flag 3 (Calibration Drift) or Flag 4 (Hardware Fault), Metshield AI automatically assigns an immutable ticket ID (e.g. \`MET-NABL-${selectedStation.stationId}\`) and dispatches a field repair ticket to the regional maintenance unit.`;
      } else {
        reply = `**Synoptic Observation Summary for ${selectedStation.name}:**\n- Current Status: **${latestPacket?.wmoFlag || 'FLAG_1_VERIFIED_GOOD'}**\n- Temperature: ${latestPacket?.imputed.temperature ?? selectedStation.baseline.tempMean}°C\n- Pressure: ${latestPacket?.imputed.pressure ?? selectedStation.baseline.pressureMean} hPa\n- Humidity: ${latestPacket?.imputed.humidity ?? selectedStation.baseline.humidityMean}%\nAll readings are verified compliant with surface observational guidelines.`;
      }

      setMessages(prev => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: reply,
          timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
        },
      ]);
      setIsTyping(false);
    }, 600);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn font-sans">
      <div className="bg-[#0b1329] border border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col h-[90vh] sm:h-[650px] overflow-hidden text-white">

        {/* Header */}
        <div className="bg-[#070d1e] text-white p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl border border-cyan-400/80 bg-[#0b1329] shadow-md flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-wide text-cyan-400">Metshield AI Assistant</span>
                <span className="bg-cyan-500/20 text-cyan-300 text-[10px] font-mono px-2 py-0.5 rounded border border-cyan-400/40">
                  WMO Pub 8 XAI
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Observatory Assistant for {selectedStation.stationId} • {selectedStation.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => speakText(messages[messages.length - 1]?.text || '')}
              className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                isSpeaking
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold'
                  : 'bg-[#0e1730] hover:bg-slate-800 text-slate-200 border-slate-700'
              }`}
              title={isSpeaking ? 'Mute Voice' : 'Read Aloud'}
            >
              {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-[#0e1730] hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="bg-[#070d1e] px-4 py-2 border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-[11px] scrollbar-none">
          <span className="text-slate-400 font-bold shrink-0">Quick Ask:</span>
          {[
            'Explain convective front filter',
            'Show XAI blame weights',
            'What is Zahumenský RoC limit?',
            'Generate technician repair ticket',
          ].map((prompt) => (
            <button
              key={prompt}
              onClick={() => setInput(prompt)}
              className="px-2.5 py-1 rounded-full bg-[#0e1730] border border-slate-700 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/50 shrink-0 transition-colors cursor-pointer font-medium touch-target"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Messages Container */}
        <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#070d1e]/50 text-xs">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] p-3.5 rounded-2xl leading-relaxed whitespace-pre-line shadow-md ${
                  m.sender === 'user'
                    ? 'bg-cyan-600 text-white rounded-br-none font-medium'
                    : 'bg-[#0e1730] border border-slate-800 text-slate-200 rounded-bl-none'
                }`}
              >
                {m.text}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 px-1">{m.timestamp}</span>
            </div>
          ))}

          {isTyping && (
            <div className="flex items-center gap-2 p-3 bg-[#0e1730] rounded-2xl max-w-[120px] border border-slate-800 text-cyan-400">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" />
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.2s]" />
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.4s]" />
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-[#070d1e] border-t border-slate-800 flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={language === 'hi' ? 'मौसम विज्ञान संबंधी कोई भी प्रश्न पूछें...' : 'Ask about WMO Pub 8 rules, sensor faults, or storm front physics...'}
            className="flex-1 bg-[#0e1730] border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold transition-colors cursor-pointer shadow-md"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const JatayuAICopilotModal = MetshieldAICopilotModal;
export default MetshieldAICopilotModal;
