import re
import os

def replace_in_file(path, replacements):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

gov_console = 'components/GovInstitutionalConsole.tsx'
landing_page = 'components/features/LandingPage.tsx'
jatayu_assistant = 'components/JatayuAssistant.tsx'
guided_tour = 'components/GuidedTour.tsx'

# GovInstitutionalConsole.tsx
gov_replacements = [
    # Backgrounds and texts for container
    ('className="w-full font-sans text-slate-200"', 'className="w-full font-sans text-slate-900 bg-slate-50 min-h-screen p-4 rounded-xl"'),
    ('bg-[#0b1329]/90', 'bg-white'),
    ('text-slate-200', 'text-slate-900'),
    ('text-slate-300', 'text-slate-700'),
    ('text-slate-400', 'text-slate-500'),
    ('bg-[#0e1730]/95', 'bg-white'),
    ('border-slate-800/90', 'border-slate-200'),
    ('border-slate-800', 'border-slate-200'),
    ('bg-[#091124]', 'bg-white'),
    ('bg-slate-900/90', 'bg-slate-50'),
    ('bg-slate-800/90', 'bg-slate-100'),
    ('bg-slate-950/60', 'bg-white'),
    ('bg-slate-900', 'bg-slate-50'),
    ('bg-slate-800', 'bg-slate-100'),
    ('text-white', 'text-slate-900'),
    ('border-slate-700', 'border-slate-300'),
    ('border-slate-800/80', 'border-slate-200'),
    ('border-slate-800/60', 'border-slate-200'),
    ('bg-sky-950/40', 'bg-sky-50'),
    ('border-sky-800/50', 'border-sky-200'),
    ('text-sky-400', 'text-sky-700'),
    
    # Tooltip fix
    ("backgroundColor: '#0b1329', borderColor: '#334155', borderRadius: '8px', fontSize: '12px'", "backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a', borderRadius: '8px', fontSize: '12px'"),
    
    # Recharts
    ('stroke="#f59e0b"', 'stroke="#D97706"'),
    ('stroke="#38bdf8"', 'stroke="#0284C7"'),
    ('stroke="#22d3ee"', 'stroke="#16A34A"'),
    ('stroke="#1e293b"', 'stroke="#E2E8F0"'),
    
    # Mobile Badges
    ('bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40', 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold border'),
    ('bg-blue-500/15 text-sky-400 border border-blue-500/30', 'bg-slate-100 text-slate-600 border border-slate-300'),
]

replace_in_file(gov_console, gov_replacements)

# JatayuAssistant.tsx
ja_replacements = [
    ('bg-[#0b1329]', 'bg-white'),
    ('bg-slate-900/40', 'bg-slate-900/40'), # backdrop can stay dark
    ('bg-[#002147]', 'bg-[#002147]'), # header should stay dark
    ('text-slate-200', 'text-slate-800'),
    ('text-slate-300', 'text-slate-600'),
    ('bg-[#0e1730]', 'bg-slate-50'),
    ('bg-slate-900', 'bg-white'),
    ('bg-slate-800', 'bg-slate-100'),
    ('bg-slate-700', 'bg-slate-200'),
    ('border-slate-700/80', 'border-slate-200'),
    ('border-slate-800/80', 'border-slate-200'),
    ('border-slate-700', 'border-slate-300'),
]
replace_in_file(jatayu_assistant, ja_replacements)

print("Theme replacements completed.")
