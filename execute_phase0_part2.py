import re

path = "c:/Users/shiva/projects/METSHIELD AI/MetShield-AI-recovered/components/GovObservationConsole.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Remove makeFallback definition entirely
content = re.sub(r'const makeFallback.*?return \{.*?\};\n\n', '', content, flags=re.DOTALL)

# Fix active useMemo
content = content.replace(
    "const active = useMemo(() => packets.length > 0 ? packets : [makeFallback(selectedStation)], [packets, selectedStation]);",
    "const active = useMemo(() => packets, [packets]);"
)

# Insert the ternary for empty state
empty_state = """
      {active.length === 0 ? (
        <div className="p-12 text-center text-slate-500 border border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <Radio className="w-6 h-6 text-slate-400 animate-pulse" />
          </div>
          <h3 className="text-base font-bold text-slate-700">Awaiting Telemetry</h3>
          <p className="text-sm mt-1">No observations received yet for {s.name}.</p>
          {isLiveApiMode && <p className="text-xs mt-2 text-slate-400">Ensure the Live API is reachable.</p>}
        </div>
      ) : (
        <>
"""
content = content.replace("{/* Plain Language Sensor Health Inspector */}", empty_state + "      {/* Plain Language Sensor Health Inspector */}")

# Find the end of the component to close the ternary properly
# The component ends with:
#     </div>
#   );
# });
content = content.replace("    </div>\n  );\n});", "        </>\n      )}\n    </div>\n  );\n});")

# Add Radio import if missing
if "Radio" not in content:
    content = content.replace("import { ", "import { Radio, ")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("GovObservationConsole correctly patched.")
