'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Usb, Activity, AlertTriangle, Link as LinkIcon, Unlink } from 'lucide-react';

export function WebSerialConnector() {
  const [port, setPort] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const requestPort = async () => {
    try {
      if (!('serial' in navigator)) {
        setError('WebSerial API not supported in this browser.');
        return;
      }
      const selectedPort = await (navigator as any).serial.requestPort();
      await selectedPort.open({ baudRate: 9600 });
      setPort(selectedPort);
      setIsConnected(true);
      setError(null);
      addLog('Successfully connected to physical node COM port.');
      readLoop(selectedPort);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to serial port');
    }
  };

  const disconnectPort = async () => {
    if (port) {
      try {
        await port.close();
        setPort(null);
        setIsConnected(false);
        addLog('Disconnected from COM port.');
      } catch (err: any) {
        setError('Error closing port: ' + err.message);
      }
    }
  };

  const addLog = useCallback((msg: string) => {
    setLogs((prev) => {
      const newLogs = [...prev, `[${new Date().toLocaleTimeString('en-IN', { hour12: false })}] ${msg}`];
      if (newLogs.length > 5) return newLogs.slice(newLogs.length - 5);
      return newLogs;
    });
  }, []);

  const readLoop = async (activePort: any) => {
    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = activePort.readable.pipeTo(textDecoder.writable);
    const reader = textDecoder.readable.getReader();
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          addLog(`RX: ${value.trim()}`);
        }
      }
    } catch (error) {
      addLog(`Serial Read Error`);
    } finally {
      reader.releaseLock();
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4 bg-slate-900/50 border border-slate-700/50 rounded-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Usb className="w-5 h-5 text-cyan-400" />
          <h3 className="text-sm font-bold text-white tracking-wide">PHYSICAL HARDWARE BRIDGE</h3>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <button
              onClick={disconnectPort}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-xs font-bold rounded transition-colors"
            >
              <Unlink className="w-3.5 h-3.5" />
              DISCONNECT
            </button>
          ) : (
            <button
              onClick={requestPort}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-xs font-bold rounded transition-colors"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              CONNECT ESP32/LORA
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-2 bg-rose-500/10 border border-rose-500/20 rounded text-rose-400 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-col gap-1 p-2 bg-slate-950/80 rounded border border-slate-800/80 min-h-[80px]">
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500 text-xs">
            Waiting for COM port stream...
          </div>
        ) : (
          logs.map((l, i) => (
            <div key={i} className="text-[10px] font-mono text-cyan-200/70">
              {l}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
