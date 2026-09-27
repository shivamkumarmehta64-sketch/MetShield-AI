import os

path = 'c:/Users/shiva/projects/METSHIELD AI/MetShield-AI-recovered/components/GovInstitutionalConsole.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Tooltips
content = content.replace(
    '<span title="Sensor: Class A PT100 RTD | Envelope: -10°C to 55°C">',
    '<span title="Ambient heat energy of the environment. | Sensor: Class A PT100 RTD | Envelope: -10°C to 55°C">'
)

content = content.replace(
    '<span title="Sensor: Vaisala PTB110 | Envelope: 920 to 1050 hPa">',
    '<span title="Atmospheric pressure is the weight of the air pressing down on Earth. | Sensor: Vaisala PTB110 | Envelope: 920 to 1050 hPa">'
)

content = content.replace(
    '<span title="Sensor: Humicap Polymer | Envelope: 5% to 100%">',
    '<span title="Moisture capacity of the current air mass. | Sensor: Humicap 100R | Envelope: 5% to 100%">'
)

# 2. Add Status Capsule
status_capsule = """
      {/* Layer 1: Human Status Capsule (Material 3 Surface) */}
      <div className="w-full bg-white border border-slate-200 shadow-sm rounded-xl p-4 flex items-center gap-3">
        {incidents.length === 0 ? (
          <span className="text-sm font-semibold text-slate-800">🟢 {currentStation.name} AWS ({currentStation.id}): Air is stable. All three station probes (Heat, Pressure, Moisture) are behaving naturally.</span>
        ) : incidents[0].severity === 'RED_HARDWARE_FAULT' ? (
          <span className="text-sm font-semibold text-slate-800">🔧 Probe Discrepancy: Thermal surge isolated from atmospheric pressure. Quarantined & self-healed.</span>
        ) : incidents[0].severity === 'BLUE_GENUINE_WEATHER' ? (
          <span className="text-sm font-semibold text-slate-800">⛈️ Natural Storm Front: Barometric pressure drop confirmed by humidity surge. Telemetry verified authentic.</span>
        ) : (
          <span className="text-sm font-semibold text-slate-800">⚠️ Probe Lock: Signal variance dropped below threshold.</span>
        )}
      </div>

      {/* 65/35 Split Canvas */}"""

content = content.replace(
    '{/* 65/35 Split Canvas */}',
    status_capsule
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated GovInstitutionalConsole for Google Enterprise standards.")
