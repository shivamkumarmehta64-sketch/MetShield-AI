'use client';

'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutGrid, Radio, AlertTriangle, BarChart2, Shield, Smartphone } from 'lucide-react';

const SECTIONS = [
  {
    label: 'MONITOR',
    items: [
      { name: 'Station Matrix', href: '/dashboard', icon: LayoutGrid },
      { name: 'Live Feed', href: '/dashboard?tab=live', icon: Radio },
      { name: 'Incident Log', href: '/incidents', icon: AlertTriangle },
    ],
  },
  {
    label: 'ANALYSIS',
    items: [
      { name: 'QC Analytics', href: '/analytics', icon: BarChart2 },
      { name: 'Audit Report', href: '/audit-report', icon: Shield },
    ],
  },
  {
    label: 'FIELD',
    items: [{ name: 'Mobile PWA', href: '/mobile', icon: Smartphone }],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed left-0 bottom-0 overflow-y-auto"
      style={{ width: 220, background: '#0A0A0A', borderRight: '1px solid #1E1E1E', top: 56 }}
    >
      <div className="flex flex-col min-h-full">
        {SECTIONS.map((section) => (
          <div key={section.label}>
            <div className="font-sans" style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', color: '#2A2A2A', letterSpacing: '0.14em', padding: '20px 16px 6px' }}>
              {section.label}
            </div>
            {section.items.map((item) => {
              const isActive = item.href === pathname;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2.5 cursor-pointer"
                  style={{
                    height: 36,
                    padding: '0 16px',
                    fontSize: 12,
                    fontWeight: 400,
                    color: isActive ? '#FFFFFF' : '#5A5A5A',
                    borderLeft: `2px solid ${isActive ? '#C0162C' : 'transparent'}`,
                    background: isActive ? '#0F0F0F' : 'transparent',
                    transition: 'color 100ms',
                  }}
                >
                  <Icon size={14} strokeWidth={1.5} color={isActive ? '#FFFFFF' : '#5A5A5A'} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        ))}

        <div className="mt-auto" style={{ borderTop: '1px solid #1E1E1E', padding: '12px 16px' }}>
          <div className="font-mono" style={{ fontSize: 10, color: '#2A2A2A' }}>MoES / IMD</div>
          <div className="font-mono" style={{ fontSize: 10, color: '#2A2A2A' }}>SIH 2026 · AEROTECH</div>
        </div>
      </div>
    </aside>
  );
}
