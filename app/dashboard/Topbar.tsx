'use client';

import { useEffect, useState } from 'react';
import { Settings } from 'lucide-react';

interface TopbarProps {
  breadcrumb: string;
}

export default function Topbar({ breadcrumb }: TopbarProps) {
  const [time, setTime] = useState('00:00:00');

  useEffect(() => {
    const update = () => setTime(new Date().toISOString().slice(11, 19));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 border-b border-border-light" style={{ height: 56, background: '#0A0A0A' }}>
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-3">
          <div style={{ width: 20, height: 20, background: '#C0162C' }} />
          <div className="flex items-baseline gap-1.5">
            <span className="text-white font-semibold" style={{ fontSize: 13, letterSpacing: '0.06em' }}>METSHIELD</span>
            <span className="font-normal" style={{ fontSize: 13, color: '#3D3D3D' }}>AI</span>
          </div>
        </div>

        <div className="flex items-center gap-1" style={{ borderLeft: '1px solid #1E1E1E', paddingLeft: 20 }}>
          <span className="font-sans" style={{ fontSize: 11, color: '#3D3D3D', letterSpacing: '0.06em' }}>
            {breadcrumb}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2" style={{ border: '1px solid #1E1E1E', padding: '4px 10px' }}>
        <span className="animate-pulse-dot" style={{ width: 6, height: 6, background: '#C0162C', borderRadius: '50%' }} />
        <span className="font-mono" style={{ fontSize: 10, color: '#5A5A5A' }}>INSAT-3DR / 2.5s</span>
      </div>

      <div className="flex items-center gap-3">
        <span className="font-mono" style={{ fontSize: 11, color: '#5A5A5A' }}>UTC {time}</span>
        <span className="font-mono" style={{ fontSize: 10, color: '#3D3D3D', border: '1px solid #2A2A2A', padding: '3px 8px' }}>73869</span>
        <span className="font-mono" style={{ fontSize: 10, color: '#3D3D3D', border: '1px solid #2A2A2A', padding: '3px 8px' }}>SIH26073</span>
        <div className="flex items-center" style={{ borderLeft: '1px solid #1E1E1E', paddingLeft: 12 }}>
          <button aria-label="Settings" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <Settings size={20} color="#3D3D3D" />
          </button>
        </div>
      </div>
    </header>
  );
}
