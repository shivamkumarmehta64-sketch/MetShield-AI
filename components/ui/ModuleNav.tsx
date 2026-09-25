import React from 'react';

export function ModuleNav({
  tabs,
  activeId,
  onChange,
}: {
  tabs: { id: string; label: string; icon: React.ReactNode }[];
  activeId: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex overflow-x-auto hide-scrollbar gap-2 p-1 bg-[var(--surface-sunken)] rounded-xl border border-[var(--border-subtle)]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap min-touch ${
            activeId === tab.id
              ? 'bg-[var(--surface-raised)] text-[var(--accent)] shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]'
          }`}
        >
          <div className="w-4 h-4 flex items-center justify-center text-inherit">{tab.icon}</div>
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
