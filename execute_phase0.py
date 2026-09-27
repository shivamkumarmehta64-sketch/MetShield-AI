import re

def fix_station_data():
    path = "c:/Users/shiva/projects/METSHIELD AI/MetShield-AI-recovered/lib/stationData.ts"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Change getStationProfile to fall back to station #0 as it originally did, 
    # but ADD findStationProfile
    new_func = """export function findStationProfile(id: string): IMDStationProfile | undefined {
  return IMD_AWS_STATIONS.find(s => s.stationId === id);
}

export const getStationProfile = (id: string): IMDStationProfile =>"""
    
    content = content.replace("export const getStationProfile = (id: string): IMDStationProfile =>", new_func)
    
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def fix_gov_observation_console():
    path = "c:/Users/shiva/projects/METSHIELD AI/MetShield-AI-recovered/components/GovObservationConsole.tsx"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Remove makeFallback
    content = re.sub(r'const makeFallback =.*?;\n\n', '', content, flags=re.DOTALL)
    
    # Fix active
    content = content.replace(
        "const active = useMemo(() => packets.length > 0 ? packets : [makeFallback(selectedStation)], [packets, selectedStation]);",
        "const active = useMemo(() => packets, [packets]);"
    )

    # Insert empty state in render
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
"""
    # Replace {viewMode === 'plain' && (
    content = content.replace("{/* Plain Language Sensor Health Inspector */}", empty_state + "\n      {/* Plain Language Sensor Health Inspector */}")
    
    # Close the ternary at the end of the technical view
    content = content.replace("</div>\n    </div>\n  );\n}", "</div>\n    </div>\n      )}\n    </div>\n  );\n}")

    # Oh wait, we need to import Radio if it's not imported.
    # Radio is from lucide-react. Let's check imports.
    if "Radio" not in content:
        content = content.replace("import { ", "import { Radio, ")

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def fix_dashboard():
    path = "c:/Users/shiva/projects/METSHIELD AI/MetShield-AI-recovered/app/dashboard/page.tsx"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Fix triggerAndTick
    content = content.replace(
        "const triggerAndTick = (fn: (id: string) => void, id: string) => { fn(id); if (isPaused) processNextTick(); };",
        "const triggerAndTick = (fn: (id: string) => void, id: string) => { fn(id); processNextTick(); };"
    )

    # Add liveSyncError state
    content = content.replace(
        "const [isSyncingLive, setIsSyncingLive] = useState(false);",
        "const [isSyncingLive, setIsSyncingLive] = useState(false);\n  const [liveSyncError, setLiveSyncError] = useState<string | null>(null);"
    )

    # Fix live sync error swallowing
    sync_catch = """    } catch (err) {
      setLiveSyncError("Failed to reach live API");
    } finally { setIsSyncingLive(false); }"""
    content = content.replace("    } catch { /* Graceful fallback */ } finally { setIsSyncingLive(false); }", sync_catch)
    
    # Clear error on success
    content = content.replace(
        "const profile = getStationProfile(stationId);",
        "setLiveSyncError(null);\n      const profile = getStationProfile(stationId);"
    )

    # Render error state
    error_ui = """
      {liveSyncError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded mb-4 flex items-center justify-between">
          <span>Failed to reach live API for {activeStation?.name}.</span>
          <button onClick={() => syncLiveWeather(selectedStationId)} className="underline hover:text-red-900">Retry</button>
        </div>
      )}
"""
    content = content.replace("{/* MAIN CONSOLE PANEL */}", "{/* MAIN CONSOLE PANEL */}\n" + error_ui)

    # Use findStationProfile for activeStation
    content = content.replace(
        "const activeStation = getStationProfile(selectedStationId);",
        "const activeStation = findStationProfile(selectedStationId);"
    )
    # Import findStationProfile
    content = content.replace(
        "import { getStationProfile } from '@/lib/stationData';",
        "import { getStationProfile, findStationProfile } from '@/lib/stationData';"
    )
    
    # Render empty state if activeStation is undefined
    content = content.replace(
        "<GovObservationConsole",
        "{activeStation ? <GovObservationConsole"
    )
    content = content.replace(
        "onToggleLiveApiMode={() => setIsLiveApiMode(p => !p)}\n            />",
        "onToggleLiveApiMode={() => setIsLiveApiMode(p => !p)}\n            /> : <div className='p-8 text-center text-slate-500'>Station not found</div>}"
    )

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

if __name__ == "__main__":
    fix_station_data()
    fix_gov_observation_console()
    fix_dashboard()
    print("Phase 0 executed.")
