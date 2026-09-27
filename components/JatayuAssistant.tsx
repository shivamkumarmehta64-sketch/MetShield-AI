'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Zap, Tornado, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface JatayuAssistantProps {
  context: {
    station: string;
    telemetry: {
      temp: number;
      press: number;
      hum: number;
    };
  };
}

export default function JatayuAssistant({ context }: JatayuAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello, I am JATAYU-Sahayak, the MoES AI Copilot. How can I assist with your telemetry validation today?',
    }
  ]);
  const [inputStr, setInputStr] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (query: string) => {
    if (!query.trim()) return;

    const newMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: query.trim() };
    setMessages(prev => [...prev, newMsg]);
    setInputStr('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: newMsg.content, context }),
      });
      
      const data = await res.json();
      
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply || 'I am unable to access the meteorological network right now.',
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Error connecting to JATAYU-Sahayak edge service.',
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const QUICK_PROMPTS = [
    { label: 'Check Sensors', icon: Zap, query: 'Is there any broken sensor right now?' },
    { label: 'Explain Pressure', icon: Tornado, query: 'Explain the latest pressure change.' },
    { label: 'Download Audit', icon: Download, query: 'How do I download the official audit report?' },
  ];

  return (
    <>
      {/* Floating Badge Launcher */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#002147] hover:bg-[#003366] text-white px-4 py-2.5 rounded-full shadow-2xl border border-blue-500/30 transition-all hover:scale-105 active:scale-95"
          >
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </div>
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-bold tracking-wide">JATAYU-Sahayak</span>
            <span className="text-[10px] hidden sm:inline ml-1 font-medium text-slate-600">(MoES AI Copilot)</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Slide-over Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-white/40 backdrop-blur-sm z-[9998]"
              onClick={() => setIsOpen(false)}
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full sm:w-[380px] bg-white shadow-2xl z-[9999] border-l border-slate-200 flex flex-col"
            >
              {/* Header */}
              <div className="bg-[#002147] border-b border-slate-200 p-4 relative" style={{ borderImage: 'linear-gradient(to right, #FF9933, white, #138808) 1', borderBottomWidth: '2px', borderBottomStyle: 'solid' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="bg-emerald-500/20 p-1.5 rounded-lg border border-emerald-500/30">
                      <Bot className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-white tracking-wide">JATAYU-Sahayak</h2>
                      <p className="text-[10px] text-slate-600 font-mono flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Edge AI Copilot Connected
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Live Context Strip */}
              <div className="bg-white px-4 py-2 border-b border-slate-200 flex items-center gap-3 overflow-x-auto no-scrollbar">
                <span className="shrink-0 text-[10px] font-bold text-slate-400 uppercase">Context:</span>
                <span className="shrink-0 text-[10px] px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-mono">
                  {context.station}
                </span>
                <span className="shrink-0 text-[10px] px-2 py-0.5 rounded bg-slate-100 text-amber-400 font-mono">
                  {context.telemetry.temp.toFixed(1)}°C
                </span>
                <span className="shrink-0 text-[10px] px-2 py-0.5 rounded bg-slate-100 text-sky-400 font-mono">
                  {context.telemetry.press.toFixed(1)}hPa
                </span>
              </div>

              {/* Quick Prompts */}
              <div className="p-3 border-b border-slate-200 bg-slate-50">
                <div className="flex flex-wrap gap-2">
                  {QUICK_PROMPTS.map((qp, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(qp.query)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-[11px] font-medium transition-colors"
                    >
                      <qp.icon className="w-3 h-3 text-cyan-400" />
                      {qp.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-3 ${
                      msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-br-none' 
                        : 'bg-slate-100 text-slate-800 rounded-bl-none border border-slate-300'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        {msg.role === 'assistant' ? (
                          <Bot className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <User className="w-3.5 h-3.5 text-blue-200" />
                        )}
                        <span className="text-[10px] font-bold opacity-75">
                          {msg.role === 'assistant' ? 'SAHAYAK' : 'YOU'}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 rounded-2xl rounded-bl-none p-3 border border-slate-300 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                )}
                
                <div ref={endOfMessagesRef} />
              </div>

              {/* Input Area */}
              <div className="p-3 sm:p-4 bg-white border-t border-slate-200">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={inputStr}
                    onChange={(e) => setInputStr(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend(inputStr)}
                    placeholder="Ask about station health, storms..."
                    className="w-full bg-slate-100 border border-slate-300 rounded-full pl-4 pr-12 py-2.5 text-xs text-slate-800 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => handleSend(inputStr)}
                    disabled={!inputStr.trim() || isLoading}
                    className="absolute right-1.5 p-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-500 rounded-full text-white transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
